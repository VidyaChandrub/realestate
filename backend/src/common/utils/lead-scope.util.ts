import type { Prisma } from '@prisma/client';
import type { PrismaService } from '../../database/prisma.service';
import { resolveActorTeamScope } from './team-scope.util';

// NOTE: this is a hard-coded role-key check. A custom role that an org grants
// org-wide lead access to will NOT be recognised here — it only matches the
// built-in `super_admin` / `admin` keys. If that ever needs to work, this has
// to resolve effective `crm` permissions (see computeEffectivePermissions in
// permissions.util.ts) instead of matching keys.
export function canSeeAllLeads(roles: string[] | undefined): boolean {
  const keys = roles ?? [];
  return keys.includes('super_admin') || keys.includes('admin');
}

function landingPageIdOf(
  marketing: Prisma.JsonValue | null | undefined,
): string | null {
  const id = (marketing as Record<string, unknown> | null | undefined)
    ?.landingPageId;
  return typeof id === 'string' && id.length > 0 ? id : null;
}

/**
 * The OR clauses that define which leads a non-admin user may see.
 *
 * Visibility now flows through team membership (see team-scope.util.ts),
 * not the legacy `Project.managerId` / `ProjectSalesAgent` links directly —
 * those no longer grant access on their own (see the comments on those
 * fields in schema.prisma). Two tiers, same shape as before:
 *   - ELEVATED (the actor is the project's team's Team Leader or Project
 *     Manager) → every lead on the project, assigned or not.
 *   - RESTRICTED (a plain team member) → only leads with NO individual
 *     assignee. An explicit `assignedToId` on a lead overrides project-level
 *     visibility, so once a lead is assigned to someone else the project's
 *     other team members no longer see it.
 *
 * Plus the user's own directly-assigned leads, always.
 *
 * Nothing is materialised onto `Lead.assignedToId` — adding or removing a
 * team's project takes effect immediately across that project's unassigned
 * leads because visibility is resolved here at query time.
 */
export async function actorLeadOrClauses(
  prisma: Pick<PrismaService, 'project' | 'teamMember' | 'team' | 'teamProject' | 'teamUnit'>,
  orgId: string,
  actorId: string,
): Promise<Prisma.LeadWhereInput[]> {
  const scope = await resolveActorTeamScope(prisma, orgId, actorId);

  const allProjectIds = [...scope.elevatedProjectIds, ...scope.restrictedProjectIds];
  const projects = allProjectIds.length
    ? await prisma.project.findMany({
        where: { id: { in: allProjectIds }, orgId },
        select: { id: true, name: true, marketing: true },
      })
    : [];
  const projectById = new Map(projects.map((p) => [p.id, p]));

  const orClauses: Prisma.LeadWhereInput[] = [{ assignedToId: actorId }];

  // Elevated (Team Leader / Project Manager) — everything.
  if (scope.elevatedProjectIds.length > 0) {
    orClauses.push({ projectId: { in: scope.elevatedProjectIds } });
    const landingPageIds = scope.elevatedProjectIds
      .map((id) => landingPageIdOf(projectById.get(id)?.marketing))
      .filter((id): id is string => id !== null);
    if (landingPageIds.length > 0) {
      orClauses.push({ landingPageId: { in: landingPageIds } });
    }
    for (const id of scope.elevatedProjectIds) {
      const name = projectById.get(id)?.name;
      if (name) orClauses.push({ data: { path: ['project'], equals: name } });
    }
  }

  // Restricted (plain team member) — only leads with no individual assignee.
  if (scope.restrictedProjectIds.length > 0) {
    orClauses.push({
      assignedToId: null,
      projectId: { in: scope.restrictedProjectIds },
    });
    const landingPageIds = scope.restrictedProjectIds
      .map((id) => landingPageIdOf(projectById.get(id)?.marketing))
      .filter((id): id is string => id !== null);
    if (landingPageIds.length > 0) {
      orClauses.push({
        assignedToId: null,
        landingPageId: { in: landingPageIds },
      });
    }
    for (const id of scope.restrictedProjectIds) {
      const name = projectById.get(id)?.name;
      if (name) {
        orClauses.push({
          assignedToId: null,
          data: { path: ['project'], equals: name },
        });
      }
    }
  }

  return orClauses;
}
