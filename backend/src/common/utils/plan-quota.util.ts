import { BadRequestException } from '@nestjs/common';

// Plan.limits is a loosely-typed JSON blob ({ projects, users, templates }).
// "templates" is either a number-as-string (e.g. "3") or one of the
// unlimited markers ("All" / "Unlimited") used by the Super Admin plan
// editor. Centralised here because every place that enforces the template
// quota (signup, admin activate/approve, org template assignment) needs the
// exact same parsing.
export function resolveTemplateQuota(plan: { limits: unknown } | null | undefined): number {
  const raw = (plan?.limits as any)?.templates;
  if (!raw || raw === 'All' || raw === 'Unlimited') return Infinity;
  const max = parseInt(String(raw), 10);
  return Number.isNaN(max) ? Infinity : max;
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
