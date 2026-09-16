import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
import { TeamMemberItemDto } from './dto/set-team-members.dto';

const TEAM_INCLUDE = {
  teamLead: {
    select: { id: true, firstName: true, lastName: true, email: true },
  },
  projectManager: {
    select: { id: true, firstName: true, lastName: true, email: true },
  },
  members: {
    select: {
      userId: true,
      user: { select: { id: true, firstName: true, lastName: true } },
    },
  },
  _count: { select: { projects: true, units: true } },
} satisfies Prisma.TeamInclude;

type TeamRow = Prisma.TeamGetPayload<{ include: typeof TEAM_INCLUDE }>;

interface LeadStats {
  active: number;
  won: number;
  lost: number;
  total: number;
}

@Injectable()
export class OrgTeamsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(orgId: string) {
    const teams = await this.prisma.team.findMany({
      where: { orgId },
      orderBy: { createdAt: 'asc' },
      include: TEAM_INCLUDE,
    });
    const statsByUser = await this.leadStatsByUser(
      orgId,
      teams.flatMap((t) => t.members.map((m) => m.userId)),
    );
    return teams.map((t) => this.serializeTeam(t, statsByUser));
  }

  async getById(orgId: string, id: string) {
    const team = await this.getOwned(orgId, id);
    const statsByUser = await this.leadStatsByUser(orgId, team.members.map((m) => m.userId));
    const [members, projects, units] = await Promise.all([
      this.listMembers(orgId, id, statsByUser),
      this.listProjects(orgId, id),
      this.listUnits(orgId, id),
    ]);
    return { ...this.serializeTeam(team, statsByUser), members, projects, units };
  }

  async create(orgId: string, dto: CreateTeamDto) {
    // A team lead must be an existing member (see assertTeamLeadIsMember), and
    // a just-created team has zero members by construction — so any teamLeadId
    // here is unconditionally invalid. No DB round-trip needed to know that.
    if (dto.teamLeadId) {
      throw new BadRequestException(
        'Team lead must already be a member of the team — add members first, then set the leader.',
      );
    }
    if (dto.projectManagerId) await this.assertProjectManager(orgId, dto.projectManagerId);

    const team = await this.prisma.team.create({
      data: {
        orgId,
        name: dto.name.trim(),
        projectManagerId: dto.projectManagerId ?? null,
        region: dto.region?.trim(),
        workingHours: dto.workingHours?.trim(),
        description: dto.description?.trim() ?? '',
      },
      include: TEAM_INCLUDE,
    });

    await this.prisma.auditLog.create({
      data: {
        orgId,
        action: 'team_created',
        entity: 'Team',
        entityId: team.id,
        metadata: { name: team.name },
      },
    });

    return this.serializeTeam(team);
  }

  async update(orgId: string, id: string, dto: UpdateTeamDto) {
    await this.getOwned(orgId, id);
    if (dto.teamLeadId) await this.assertTeamLeadIsMember(id, dto.teamLeadId);
    if (dto.projectManagerId) await this.assertProjectManager(orgId, dto.projectManagerId);

    const data: Prisma.TeamUncheckedUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.teamLeadId !== undefined) data.teamLeadId = dto.teamLeadId;
    if (dto.projectManagerId !== undefined) data.projectManagerId = dto.projectManagerId;
    if (dto.region !== undefined) data.region = dto.region;
    if (dto.workingHours !== undefined) data.workingHours = dto.workingHours;
    if (dto.description !== undefined) data.description = dto.description ?? '';

    const team = await this.prisma.team.update({
      where: { id },
      data,
      include: TEAM_INCLUDE,
    });

    await this.prisma.auditLog.create({
      data: {
        orgId,
        action: 'team_updated',
        entity: 'Team',
        entityId: id,
        metadata: {},
      },
    });

    const statsByUser = await this.leadStatsByUser(orgId, team.members.map((m) => m.userId));
    return this.serializeTeam(team, statsByUser);
  }

  async remove(orgId: string, id: string) {
    await this.getOwned(orgId, id);
    // Hard delete — no soft-delete anywhere in this codebase. team_members,
    // team_projects and team_module_access cascade via FK ON DELETE CASCADE.
    await this.prisma.$transaction(async (tx) => {
      await tx.team.delete({ where: { id } });
      await tx.auditLog.create({
        data: {
          orgId,
          action: 'team_deleted',
          entity: 'Team',
          entityId: id,
          metadata: {},
        },
      });
    });
    return { success: true };
  }

  // -------------------------------------------------------------------------
  // Members — a plain many-to-many with User plus a per-member role label.
  // PUT replaces the whole set so re-submitting is idempotent (delete-all +
  // recreate in one transaction) — same shape as ProjectSalesAgent.
  // -------------------------------------------------------------------------

  async listMembers(orgId: string, teamId: string, statsByUser?: Map<string, LeadStats>) {
    await this.getOwned(orgId, teamId);
    const rows = await this.prisma.teamMember.findMany({
      where: { teamId },
      orderBy: { joinedAt: 'asc' },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            userRoles: { select: { role: { select: { key: true, name: true } } } },
          },
        },
      },
    });
    const stats = statsByUser ?? (await this.leadStatsByUser(orgId, rows.map((r) => r.userId)));
    return rows.map((r) => {
      const s = stats.get(r.userId);
      return {
        id: r.user.id,
        firstName: r.user.firstName,
        lastName: r.user.lastName,
        email: r.user.email,
        name: [r.user.firstName, r.user.lastName].filter(Boolean).join(' ') || r.user.email,
        role: r.role,
        orgRole: r.user.userRoles[0]?.role ?? null,
        joinedAt: r.joinedAt,
        activeLeads: s?.active ?? 0,
        conversionPct: this.conversionPct(s),
      };
    });
  }

  async setMembers(orgId: string, teamId: string, members: TeamMemberItemDto[]) {
    const team = await this.getOwned(orgId, teamId);

    // ArrayUnique on the DTO already rejects duplicate userIds, but collapse
    // defensively anyway before touching the DB.
    const byUser = new Map(members.map((m) => [m.userId, m.role]));
    const userIds = [...byUser.keys()];
    if (userIds.length > 0) {
      await this.assertOrgUsers(orgId, userIds, 'Members');
      await this.assertAddableTeamMembers(orgId, team, userIds);
      await this.assertSingleTeamMembership(orgId, teamId, userIds);
    }

    // A removed member can't stay teamLeadId — keep that invariant true here
    // too, not just on update() (see assertTeamLeadIsMember), since this is
    // the only other path that can take a member off the team.
    const orphansLead = Boolean(team.teamLeadId) && !userIds.includes(team.teamLeadId!);

    await this.prisma.$transaction(async (tx) => {
      await tx.teamMember.deleteMany({ where: { teamId } });
      if (userIds.length > 0) {
        await tx.teamMember.createMany({
          data: userIds.map((userId) => ({
            teamId,
            userId,
            role: byUser.get(userId)!,
          })),
        });
      }
      if (orphansLead) {
        await tx.team.update({ where: { id: teamId }, data: { teamLeadId: null } });
      }
      await tx.auditLog.create({
        data: {
          orgId,
          action: 'team_members_set',
          entity: 'Team',
          entityId: teamId,
          metadata: { count: userIds.length },
        },
      });
    });

    return this.listMembers(orgId, teamId);
  }

  // -------------------------------------------------------------------------
  // Projects assigned to a team. Same idempotent-replace shape as members.
  // -------------------------------------------------------------------------

  async listProjects(orgId: string, teamId: string) {
    await this.getOwned(orgId, teamId);
    const rows = await this.prisma.teamProject.findMany({
      where: { teamId },
      orderBy: { assignedAt: 'asc' },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            status: true,
            location: true,
            priceMin: true,
            priceMax: true,
            currency: true,
            _count: { select: { units: true, unitTypes: true } },
          },
        },
      },
    });
    return rows.map((r) => ({
      id: r.project.id,
      name: r.project.name,
      status: r.project.status,
      location: r.project.location,
      priceMin: r.project.priceMin,
      priceMax: r.project.priceMax,
      currency: r.project.currency,
      unitCount: r.project._count.units,
      unitTypeCount: r.project._count.unitTypes,
      assignedAt: r.assignedAt,
    }));
  }

  async setProjects(orgId: string, teamId: string, projectIds: string[]) {
    await this.getOwned(orgId, teamId);

    const unique = [...new Set(projectIds)];
    if (unique.length > 0) {
      await this.assertOrgProjects(orgId, unique);
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.teamProject.deleteMany({ where: { teamId } });
      if (unique.length > 0) {
        await tx.teamProject.createMany({
          data: unique.map((projectId) => ({ teamId, projectId })),
        });
      }
      await tx.auditLog.create({
        data: {
          orgId,
          action: 'team_projects_set',
          entity: 'Team',
          entityId: teamId,
          metadata: { count: unique.length },
        },
      });
    });

    return this.listProjects(orgId, teamId);
  }

  // -------------------------------------------------------------------------
  // Standalone units assigned to a team. Same idempotent-replace shape as
  // projects — see TeamUnit's schema comment for why only standalone units
  // (Unit.projectId is null) are ever linked here.
  // -------------------------------------------------------------------------

  async listUnits(orgId: string, teamId: string) {
    await this.getOwned(orgId, teamId);
    const rows = await this.prisma.teamUnit.findMany({
      where: { teamId },
      orderBy: { assignedAt: 'asc' },
      include: {
        unit: {
          select: {
            id: true,
            unitNo: true,
            configuration: true,
            status: true,
            price: true,
            carpetSqft: true,
          },
        },
      },
    });
    return rows.map((r) => ({
      id: r.unit.id,
      unitNo: r.unit.unitNo,
      configuration: r.unit.configuration,
      status: r.unit.status,
      price: r.unit.price,
      carpetSqft: r.unit.carpetSqft,
      assignedAt: r.assignedAt,
    }));
  }

  async setUnits(orgId: string, teamId: string, unitIds: string[]) {
    await this.getOwned(orgId, teamId);

    const unique = [...new Set(unitIds)];
    if (unique.length > 0) {
      await this.assertOrgStandaloneUnits(orgId, unique);
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.teamUnit.deleteMany({ where: { teamId } });
      if (unique.length > 0) {
        await tx.teamUnit.createMany({
          data: unique.map((unitId) => ({ teamId, unitId })),
        });
      }
      await tx.auditLog.create({
        data: {
          orgId,
          action: 'team_units_set',
          entity: 'Team',
          entityId: teamId,
          metadata: { count: unique.length },
        },
      });
    });

    return this.listUnits(orgId, teamId);
  }

  // -------------------------------------------------------------------------
  // Cross-tenant guards
  // -------------------------------------------------------------------------

  // Never leaks cross-tenant existence: another org's team 404s exactly
  // like an id that doesn't exist. orgId always comes from the JWT.
  private async getOwned(orgId: string, id: string): Promise<TeamRow> {
    const team = await this.prisma.team.findUnique({
      where: { id },
      include: TEAM_INCLUDE,
    });
    if (!team || team.orgId !== orgId) {
      throw new NotFoundException('Team not found');
    }
    return team;
  }

  // Project manager must be an org user holding the active `manager` role.
  // Checked here rather than trusted from the picker, which only filters the
  // candidate list — it enforces nothing on its own.
  private async assertProjectManager(orgId: string, userId: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        orgId,
        userRoles: { some: { role: { key: 'manager', status: 'active' } } },
      },
      select: { id: true },
    });
    if (!user) {
      throw new BadRequestException(
        'Project manager must be a user in your organisation who holds the Manager role',
      );
    }
  }

  // Team lead must already be a TeamMember row on this team — the picker
  // sources its options from the selected members, but that's UI convenience
  // only; enforced here so the API can't be made to save a leader who isn't
  // on the team (see also: setMembers, which clears teamLeadId if a remove
  // would otherwise orphan it).
  private async assertTeamLeadIsMember(teamId: string, userId: string) {
    const member = await this.prisma.teamMember.findFirst({
      where: { teamId, userId },
      select: { userId: true },
    });
    if (!member) {
      throw new BadRequestException('Team lead must be a member of this team.');
    }
  }

  private async assertOrgUsers(orgId: string, userIds: string[], label: string) {
    const count = await this.prisma.user.count({
      where: { id: { in: userIds }, orgId },
    });
    if (count !== userIds.length) {
      throw new BadRequestException(`${label} must all be users in your organisation`);
    }
  }

  // Admins already present on legacy teams remain visible and can be retained,
  // but privileged users cannot be introduced through the membership API.
  private async assertAddableTeamMembers(orgId: string, team: TeamRow, userIds: string[]) {
    const existingIds = new Set(team.members.map((member) => member.userId));
    const candidateIds = userIds.filter((userId) => !existingIds.has(userId));
    if (candidateIds.length === 0) return;

    const privileged = await this.prisma.user.count({
      where: {
        id: { in: candidateIds },
        orgId,
        userRoles: { some: { role: { key: { in: ['admin', 'super_admin'] } } } },
      },
    });
    if (privileged > 0) {
      throw new BadRequestException('Admins and Super Admins cannot be added as team members');
    }
  }

  // Org Settings → Teams "one team per member" enforcement. Membership here
  // means any existing TeamMember row on a different team — rows are hard
  // deleted (see setMembers/remove), never soft-disabled, so "has a row" and
  // "is currently on that team" are the same thing (matches the `hasTeam`
  // indicator computed in org-users.util.ts).
  private async assertSingleTeamMembership(
    orgId: string,
    teamId: string,
    userIds: string[],
  ) {
    const org = await this.prisma.organisation.findUnique({
      where: { id: orgId },
      select: { singleTeamMembership: true },
    });
    if (!org?.singleTeamMembership) return;

    const conflicts = await this.prisma.teamMember.findMany({
      where: { userId: { in: userIds }, teamId: { not: teamId } },
      include: {
        user: { select: { firstName: true, lastName: true, email: true } },
        team: { select: { name: true } },
      },
    });
    if (conflicts.length === 0) return;

    const details = conflicts
      .map((c) => {
        const name = [c.user.firstName, c.user.lastName].filter(Boolean).join(' ') || c.user.email;
        return `${name} (already in ${c.team.name})`;
      })
      .join(', ');
    throw new BadRequestException(
      `Single-team membership is on for this org — ${details}. Remove them from their current team first.`,
    );
  }

  private async assertOrgProjects(orgId: string, projectIds: string[]) {
    const count = await this.prisma.project.count({
      where: { id: { in: projectIds }, orgId },
    });
    if (count !== projectIds.length) {
      throw new BadRequestException(
        'Assigned projects must all belong to your organisation',
      );
    }
  }

  // A unit can only be linked here if it's standalone (no project) — a
  // project-bound unit inherits its team via the project's own TeamProject
  // assignment instead. Enforced here, not just by the picker filtering its
  // candidate list to standalone units.
  private async assertOrgStandaloneUnits(orgId: string, unitIds: string[]) {
    const count = await this.prisma.unit.count({
      where: { id: { in: unitIds }, orgId, projectId: null },
    });
    if (count !== unitIds.length) {
      throw new BadRequestException(
        'Assigned units must be standalone units (no project) belonging to your organisation',
      );
    }
  }

  // -------------------------------------------------------------------------
  // Lead stats — "Active leads" / conversion shown on team cards and the
  // members table are real, derived from Lead.assignedToId + Lead.status.
  // "Active" = assigned and not yet won/lost; conversion = won ÷ (won+lost)
  // (leads still in the pipeline don't count against or for conversion).
  // -------------------------------------------------------------------------

  private async leadStatsByUser(
    orgId: string,
    userIds: string[],
  ): Promise<Map<string, LeadStats>> {
    const unique = [...new Set(userIds)];
    const map = new Map<string, LeadStats>();
    for (const id of unique) map.set(id, { active: 0, won: 0, lost: 0, total: 0 });
    if (unique.length === 0) return map;

    const rows = await this.prisma.lead.groupBy({
      by: ['assignedToId', 'status'],
      where: { orgId, assignedToId: { in: unique } },
      _count: { _all: true },
    });

    for (const row of rows) {
      if (!row.assignedToId) continue;
      const entry = map.get(row.assignedToId);
      if (!entry) continue;
      const count = row._count._all;
      entry.total += count;
      if (row.status === 'won') entry.won += count;
      else if (row.status === 'lost') entry.lost += count;
      else entry.active += count;
    }
    return map;
  }

  private conversionPct(stats: LeadStats | undefined): number {
    if (!stats) return 0;
    const decided = stats.won + stats.lost;
    if (decided === 0) return 0;
    return Math.round((stats.won / decided) * 100);
  }

  private serializeTeam(team: TeamRow, statsByUser?: Map<string, LeadStats>) {
    const memberUserIds = team.members.map((m) => m.userId);
    const aggregate: LeadStats = { active: 0, won: 0, lost: 0, total: 0 };
    if (statsByUser) {
      for (const uid of memberUserIds) {
        const s = statsByUser.get(uid);
        if (!s) continue;
        aggregate.active += s.active;
        aggregate.won += s.won;
        aggregate.lost += s.lost;
        aggregate.total += s.total;
      }
    }

    // The lead is shown among the team's pictured contacts even when they
    // aren't also a TeamMember row — dedup by id so a lead who IS also a
    // member doesn't get two avatars.
    const previewIds = new Set<string>();
    const memberPreviews: { id: string; name: string }[] = [];
    if (team.teamLead) {
      previewIds.add(team.teamLead.id);
      memberPreviews.push({
        id: team.teamLead.id,
        name:
          [team.teamLead.firstName, team.teamLead.lastName].filter(Boolean).join(' ') ||
          team.teamLead.id,
      });
    }
    for (const m of team.members) {
      if (previewIds.has(m.user.id)) continue;
      previewIds.add(m.user.id);
      memberPreviews.push({
        id: m.user.id,
        name: [m.user.firstName, m.user.lastName].filter(Boolean).join(' ') || m.user.id,
      });
    }

    return {
      id: team.id,
      orgId: team.orgId,
      name: team.name,
      status: team.status,
      region: team.region,
      workingHours: team.workingHours,
      description: team.description,
      createdAt: team.createdAt,
      updatedAt: team.updatedAt,
      teamLead: team.teamLead
        ? {
            id: team.teamLead.id,
            firstName: team.teamLead.firstName,
            lastName: team.teamLead.lastName,
            email: team.teamLead.email,
            name:
              [team.teamLead.firstName, team.teamLead.lastName].filter(Boolean).join(' ') ||
              team.teamLead.email,
          }
        : null,
      projectManager: team.projectManager
        ? {
            id: team.projectManager.id,
            firstName: team.projectManager.firstName,
            lastName: team.projectManager.lastName,
            email: team.projectManager.email,
            name:
              [team.projectManager.firstName, team.projectManager.lastName].filter(Boolean).join(' ') ||
              team.projectManager.email,
          }
        : null,
      memberCount: team.members.length,
      projectCount: team._count.projects,
      unitCount: team._count.units,
      memberPreviews,
      activeLeads: aggregate.active,
      conversionPct: this.conversionPct(aggregate),
    };
  }
}
