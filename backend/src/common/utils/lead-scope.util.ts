import type { Prisma } from '@prisma/client';
import type { PrismaService } from '../../database/prisma.service';

export function canSeeAllLeads(roles: string[] | undefined): boolean {
  const keys = roles ?? [];
  return keys.includes('super_admin') || keys.includes('admin');
}

export async function actorLeadOrClauses(
  prisma: Pick<PrismaService, 'project' | 'projectSalesAgent'>,
  orgId: string,
  actorId: string,
): Promise<Prisma.LeadWhereInput[]> {
  const [managed, salesLinks] = await Promise.all([
    prisma.project.findMany({
      where: { orgId, managerId: actorId },
      select: { id: true, name: true, marketing: true },
    }),
    prisma.projectSalesAgent.findMany({
      where: { userId: actorId, project: { orgId } },
      select: {
        projectId: true,
        project: { select: { name: true, marketing: true } },
      },
    }),
  ]);

  const projectIds = [
    ...managed.map((project) => project.id),
    ...salesLinks.map((link) => link.projectId),
  ];
  const landingPageIds = [
    ...managed.map(
      (project) =>
        (project.marketing as Record<string, unknown> | null)?.landingPageId,
    ),
    ...salesLinks.map(
      (link) =>
        (link.project?.marketing as Record<string, unknown> | null | undefined)
          ?.landingPageId,
    ),
  ].filter((id): id is string => typeof id === 'string' && id.length > 0);
  const projectNames = [
    ...managed.map((project) => project.name),
    ...salesLinks.map((link) => link.project?.name),
  ].filter((name): name is string => typeof name === 'string' && name.length > 0);

  const orClauses: Prisma.LeadWhereInput[] = [{ assignedToId: actorId }];
  if (projectIds.length > 0) {
    orClauses.push({ projectId: { in: projectIds } });
  }
  if (landingPageIds.length > 0) {
    orClauses.push({ landingPageId: { in: landingPageIds } });
  }
  for (const name of projectNames) {
    orClauses.push({ data: { path: ['project'], equals: name } });
  }
  return orClauses;
}

export function leadMatchesActorScope(
  lead: {
    assignedToId?: string | null;
    projectId?: string | null;
    landingPageId?: string | null;
    data?: unknown;
  },
  actorId: string,
  scope: Prisma.LeadWhereInput[],
): boolean {
  if (lead.assignedToId === actorId) return true;
  if (lead.projectId && scope.some((clause) => {
    const ids = (clause.projectId as { in?: string[] } | undefined)?.in;
    return Array.isArray(ids) && ids.includes(lead.projectId as string);
  })) {
    return true;
  }
  if (lead.landingPageId && scope.some((clause) => {
    const ids = (clause.landingPageId as { in?: string[] } | undefined)?.in;
    return Array.isArray(ids) && ids.includes(lead.landingPageId as string);
  })) {
    return true;
  }
  const data = lead.data && typeof lead.data === 'object'
    ? (lead.data as Record<string, unknown>)
    : {};
  const projectName =
    (typeof data.project === 'string' && data.project) ||
    (typeof data.Project === 'string' && data.Project) ||
    '';
  if (
    projectName &&
    scope.some((clause) => {
      const pathEquals = clause.data as
        | { path?: string[]; equals?: unknown }
        | undefined;
      return (
        pathEquals?.path?.[0] === 'project' &&
        typeof pathEquals.equals === 'string' &&
        pathEquals.equals.toLowerCase() === projectName.toLowerCase()
      );
    })
  ) {
    return true;
  }
  return false;
}
