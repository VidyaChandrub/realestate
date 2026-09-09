import { BadRequestException } from '@nestjs/common';

// Plan.limits.{projects,users,templates} are `number | null` since the
// numeric-limits migration (null = unlimited). Legacy string values
// ("3" / "All" / "Unlimited" / "—") are still tolerated in case a row predates
// that migration. Centralised because every place that enforces a plan quota
// (signup, admin activate/approve, project creation, user invite, template
// assignment, plan downgrade) needs identical parsing.

export type PlanLimitKey = 'projects' | 'users' | 'templates';

const LIMIT_NOUN: Record<PlanLimitKey, string> = {
  projects: 'project',
  users: 'user',
  templates: 'template',
};

/** Resolve a plan limit to a number; `Infinity` means unlimited. */
export function resolveLimit(
  plan: { limits: unknown } | null | undefined,
  key: PlanLimitKey,
): number {
  const limits = (plan?.limits ?? {}) as Partial<Record<PlanLimitKey, unknown>>;
  const raw = limits[key];

  // New shape: number (>= 0) or null (null / undefined => unlimited).
  if (typeof raw === 'number') {
    return Number.isFinite(raw) && raw >= 0 ? raw : Infinity;
  }

  // Legacy string shape: "3" / "All" / "Unlimited" / "—" / "".
  if (typeof raw === 'string') {
    if (raw === '' || raw === 'All' || raw === 'Unlimited' || raw === '—') {
      return Infinity;
    }
    const max = parseInt(raw, 10);
    return Number.isNaN(max) || max < 0 ? Infinity : max;
  }

  // null / undefined / any other type -> unlimited.
  return Infinity;
}

/**
 * Assert that adding `addCount` more of `key` keeps the org within the plan.
 * `currentCount` is what the org already has. Unlimited (`null`) never blocks.
 * Used at every create path (projects, users) and — with `currentCount = 0`,
 * `addCount = requestedTotal` — for the wholesale template assignment.
 */
export function assertLimit(
  plan: { name?: string; limits: unknown } | null | undefined,
  key: PlanLimitKey,
  currentCount: number,
  addCount = 1,
): void {
  const max = resolveLimit(plan, key);
  if (currentCount + addCount > max) {
    const noun = LIMIT_NOUN[key];
    const planName = plan?.name ? `"${plan.name}" ` : '';
    throw new BadRequestException(
      `Your ${planName}plan allows ${max} ${noun}(s); your organisation already has ${currentCount}. Upgrade the plan to add more.`,
    );
  }
}

// --- Template quota — kept as named wrappers so the existing call sites and
// their exact error text are unchanged. ---

export function resolveTemplateQuota(
  plan: { limits: unknown } | null | undefined,
): number {
  return resolveLimit(plan, 'templates');
}

export function assertTemplateQuota(
  plan: { name: string; limits: unknown } | null | undefined,
  requestedCount: number,
): void {
  const max = resolveTemplateQuota(plan);
  if (requestedCount > max) {
    throw new BadRequestException(
      `Plan "${plan?.name ?? 'selected'}" allows max ${max} template(s), got ${requestedCount}`,
    );
  }
}

// --- Usage counters ---
// The agreed counting rules live here and nowhere else:
//   - users:    active + pending count; disabled users do NOT (a disabled
//               user has freed their seat).
//   - projects: every project counts, regardless of status.
//   - templates: assigned OrganisationTemplate rows.

interface UserCountPrisma {
  user: { count: (args: any) => Promise<number> };
}
interface ProjectCountPrisma {
  project: { count: (args: any) => Promise<number> };
}

export function countBillableOrgUsers(
  prisma: UserCountPrisma,
  orgId: string,
): Promise<number> {
  return prisma.user.count({
    where: { orgId, status: { in: ['active', 'pending'] } },
  });
}

export function countOrgProjects(
  prisma: ProjectCountPrisma,
  orgId: string,
): Promise<number> {
  return prisma.project.count({ where: { orgId } });
}

// --- Downgrade guard ---

interface CountPrisma extends UserCountPrisma, ProjectCountPrisma {
  organisationTemplate: { count: (args: any) => Promise<number> };
}

/**
 * Reject switching an org onto `targetPlan` when the org is already using more
 * than that plan would allow for any limit. Names the limit and the numbers,
 * and never deletes anything to make it fit. No-op for unlimited limits or
 * when usage is within bounds. Counting rules are defined by the helpers above.
 */
export async function assertPlanFitsCurrentUsage(
  prisma: CountPrisma,
  orgId: string,
  targetPlan: { name?: string; limits: unknown } | null | undefined,
): Promise<void> {
  const [projects, users, templates] = await Promise.all([
    countOrgProjects(prisma, orgId),
    countBillableOrgUsers(prisma, orgId),
    prisma.organisationTemplate.count({ where: { orgId } }),
  ]);

  const usage: Record<PlanLimitKey, number> = { projects, users, templates };
  for (const key of ['projects', 'users', 'templates'] as PlanLimitKey[]) {
    const max = resolveLimit(targetPlan, key);
    if (usage[key] > max) {
      const noun = LIMIT_NOUN[key];
      const planName = targetPlan?.name
        ? `The "${targetPlan.name}" plan`
        : 'This plan';
      throw new BadRequestException(
        `${planName} allows ${max} ${noun}(s), but your organisation has ${usage[key]}. ` +
          `Reduce usage or choose a higher plan before switching.`,
      );
    }
  }
}
