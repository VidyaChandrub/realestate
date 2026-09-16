import type { PrismaService } from '../../database/prisma.service';

/**
 * Resolves which projects and standalone units an actor can reach through
 * their teams — the single source of truth for the Team↔Project pivot's
 * visibility rule, used by both project scoping (ProjectsService,
 * OrgDashboardService) and lead scoping (lead-scope.util.ts). Extend this,
 * don't duplicate it — see the four call sites this replaced.
 *
 * Team membership, for this purpose, is TeamMember rows **union**
 * Team.projectManagerId — a team's Project Manager is never required to
 * hold a TeamMember row (see OrgTeamsService.assertProjectManager), but
 * they plainly need to see the team's projects. This does NOT create a
 * TeamMember row for them — they must never appear in a members list as if
 * they were a regular agent; it only affects what this function returns.
 *
 * Two tiers, mirroring the old managerId/ProjectSalesAgent split exactly:
 *   - ELEVATED — the actor is this team's Team Leader or Project Manager.
 *     Sees every lead on the team's projects, assigned or not.
 *   - RESTRICTED — the actor is a plain team member (any org role,
 *     including `manager` — org role plays no part in this). Sees only
 *     unassigned leads on the team's projects.
 * `restrictedProjectIds` never contains an id already in
 * `elevatedProjectIds` — if the actor is elevated on *any* team that has
 * a project, that project counts as elevated even if another of the
 * actor's teams (where they're a plain member) also has it.
 *
 * `Project.managerId` / `ProjectSalesAgent` are NOT consulted here — they no
 * longer grant access (see the comments on those in schema.prisma).
 */

type TeamScopePrisma = Pick<
  PrismaService,
  'teamMember' | 'team' | 'teamProject' | 'teamUnit'
>;

export interface ActorTeamScope {
  elevatedProjectIds: string[];
  restrictedProjectIds: string[];
  /** Standalone units (TeamUnit) reachable via any of the actor's teams —
   *  no elevated/restricted split; units have no per-lead visibility rule. */
  unitIds: string[];
}

export async function resolveActorTeamScope(
  prisma: TeamScopePrisma,
  orgId: string,
  actorId: string,
): Promise<ActorTeamScope> {
  const [memberships, pmTeams] = await Promise.all([
    prisma.teamMember.findMany({
      where: { userId: actorId, team: { orgId } },
      select: { teamId: true },
    }),
    prisma.team.findMany({
      where: { orgId, projectManagerId: actorId },
      select: { id: true },
    }),
  ]);

  const teamIds = [
    ...new Set([...memberships.map((m) => m.teamId), ...pmTeams.map((t) => t.id)]),
  ];
  if (teamIds.length === 0) {
    return { elevatedProjectIds: [], restrictedProjectIds: [], unitIds: [] };
  }

  const teams = await prisma.team.findMany({
    where: { id: { in: teamIds } },
    select: { id: true, teamLeadId: true, projectManagerId: true },
  });

  const elevatedTeamIds = teams
    .filter((t) => t.teamLeadId === actorId || t.projectManagerId === actorId)
    .map((t) => t.id);
  const restrictedTeamIds = teams
    .filter((t) => t.teamLeadId !== actorId && t.projectManagerId !== actorId)
    .map((t) => t.id);

  const [elevatedLinks, restrictedLinks, unitLinks] = await Promise.all([
    elevatedTeamIds.length
      ? prisma.teamProject.findMany({
          where: { teamId: { in: elevatedTeamIds } },
          select: { projectId: true },
        })
      : Promise.resolve([]),
    restrictedTeamIds.length
      ? prisma.teamProject.findMany({
          where: { teamId: { in: restrictedTeamIds } },
          select: { projectId: true },
        })
      : Promise.resolve([]),
    prisma.teamUnit.findMany({
      where: { teamId: { in: teamIds } },
      select: { unitId: true },
    }),
  ]);

  const elevatedProjectIds = [...new Set(elevatedLinks.map((l) => l.projectId))];
  const elevatedSet = new Set(elevatedProjectIds);
  const restrictedProjectIds = [
    ...new Set(restrictedLinks.map((l) => l.projectId)),
  ].filter((id) => !elevatedSet.has(id));
  const unitIds = [...new Set(unitLinks.map((l) => l.unitId))];

  return { elevatedProjectIds, restrictedProjectIds, unitIds };
}

/** Every project id the actor can reach via a team — elevated and
 *  restricted alike, since the tier only matters for lead scoping, not for
 *  whether the project itself is visible. */
export async function actorAccessibleProjectIds(
  prisma: TeamScopePrisma,
  orgId: string,
  actorId: string,
): Promise<string[]> {
  const scope = await resolveActorTeamScope(prisma, orgId, actorId);
  return [...new Set([...scope.elevatedProjectIds, ...scope.restrictedProjectIds])];
}

/** Every standalone unit id the actor can reach via a team. */
export async function actorAccessibleUnitIds(
  prisma: TeamScopePrisma,
  orgId: string,
  actorId: string,
): Promise<string[]> {
  const scope = await resolveActorTeamScope(prisma, orgId, actorId);
  return scope.unitIds;
}
