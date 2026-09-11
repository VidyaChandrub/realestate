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
  members: {
    select: {
      userId: true,
      user: { select: { id: true, firstName: true, lastName: true } },
    },
  },
  _count: { select: { projects: true } },
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
    const [members, projects] = await Promise.all([
      this.listMembers(orgId, id, statsByUser),
      this.listProjects(orgId, id),
    ]);
    return { ...this.serializeTeam(team, statsByUser), members, projects };
  }

  async create(orgId: string, dto: CreateTeamDto) {
    if (dto.teamLeadId) await this.assertOrgUser(orgId, dto.teamLeadId, 'Team lead');

    const team = await this.prisma.team.create({
      data: {
        orgId,
        name: dto.name.trim(),
        teamLeadId: dto.teamLeadId ?? null,
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
    if (dto.teamLeadId) await this.assertOrgUser(orgId, dto.teamLeadId, 'Team lead');

    const data: Prisma.TeamUncheckedUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.teamLeadId !== undefined) data.teamLeadId = dto.teamLeadId;
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
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
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
        joinedAt: r.joinedAt,
        activeLeads: s?.active ?? 0,
        conversionPct: this.conversionPct(s),
      };
    });
  }

  async setMembers(orgId: string, teamId: string, members: TeamMemberItemDto[]) {
    await this.getOwned(orgId, teamId);

    // ArrayUnique on the DTO already rejects duplicate userIds, but collapse
    // defensively anyway before touching the DB.
    const byUser = new Map(members.map((m) => [m.userId, m.role]));
    const userIds = [...byUser.keys()];
    if (userIds.length > 0) {
      await this.assertOrgUsers(orgId, userIds, 'Members');
    }

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
      include: { project: { select: { id: true, name: true } } },
    });
    return rows.map((r) => ({
      id: r.project.id,
      name: r.project.name,
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

  private async assertOrgUser(orgId: string, userId: string, label: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, orgId },
      select: { id: true },
    });
    if (!user) {
      throw new BadRequestException(`${label} must be a user in your organisation`);
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
      memberCount: team.members.length,
      projectCount: team._count.projects,
      memberPreviews,
      activeLeads: aggregate.active,
      conversionPct: this.conversionPct(aggregate),
    };
  }
}
