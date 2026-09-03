import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import type { JwtPayload } from '../../common/types/jwt-payload.interface';
import { OrgDashboardQueryDto } from './dto/org-dashboard-query.dto';

function parseBudgetValue(data: unknown): number {
  if (!data || typeof data !== 'object') return 0;
  const d = data as Record<string, unknown>;
  const raw = d.budget ?? d.budgetRange ?? d.dealValue ?? d.value ?? d.amount ?? d.price;
  if (!raw) return 0;
  if (typeof raw === 'number') return raw;
  if (typeof raw !== 'string') return 0;

  const str = raw.trim();
  const crMatch = str.match(/([0-9.]+)\s*(?:Cr|Crore)/i);
  if (crMatch) {
    return Math.round(parseFloat(crMatch[1]) * 10000000);
  }
  const lMatch = str.match(/([0-9.]+)\s*(?:L|Lakh|Lac)/i);
  if (lMatch) {
    return Math.round(parseFloat(lMatch[1]) * 100000);
  }
  const numMatch = str.match(/([0-9,]+)/);
  if (numMatch) {
    const parsed = parseInt(numMatch[1].replace(/,/g, ''), 10);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

@Injectable()
export class OrgDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboard(orgId: string, actor: JwtPayload, query: OrgDashboardQueryDto) {
    const period = query.period ?? '30d';
    const now = new Date();

    let startDate: Date | null = null;
    let prevStartDate: Date | null = null;

    if (period === 'today') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      prevStartDate = new Date(startDate.getTime() - 24 * 60 * 60 * 1000);
    } else if (period === '7d') {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      prevStartDate = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    } else if (period === '30d') {
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      prevStartDate = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
    } else if (period === '90d') {
      startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      prevStartDate = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
    }

    const isLimitedRole = actor.roles.some((r) => r === 'sales' || r === 'telecaller');
    const isManager = actor.roles.includes('manager') && !actor.roles.includes('admin');

    const leadWhere: Prisma.LeadWhereInput = { orgId };
    const callWhere: Prisma.CallLogWhereInput = { orgId };

    if (isLimitedRole) {
      leadWhere.assignedToId = actor.sub;
      callWhere.agentId = actor.sub;
    } else if (isManager) {
      const managedProjects = await this.prisma.project.findMany({
        where: { orgId, managerId: actor.sub },
        select: { id: true },
      });
      const projIds = managedProjects.map((p) => p.id);
      if (projIds.length > 0) {
        leadWhere.OR = [{ assignedToId: actor.sub }, { projectId: { in: projIds } }];
      } else {
        leadWhere.assignedToId = actor.sub;
      }
    }

    if (query.projectId) {
      leadWhere.projectId = query.projectId;
    }
    if (query.userId) {
      leadWhere.assignedToId = query.userId;
      callWhere.agentId = query.userId;
    }

    const currentLeadWhere: Prisma.LeadWhereInput = { ...leadWhere };
    if (startDate) {
      currentLeadWhere.createdAt = { gte: startDate };
    }

    const prevLeadWhere: Prisma.LeadWhereInput = { ...leadWhere };
    if (startDate && prevStartDate) {
      prevLeadWhere.createdAt = { gte: prevStartDate, lt: startDate };
    }

    const currentCallWhere: Prisma.CallLogWhereInput = { ...callWhere };
    if (startDate) {
      currentCallWhere.createdAt = { gte: startDate };
    }

    const [
      leads,
      prevLeadsCount,
      callStats,
      activityEvents,
      orgProjects,
      orgAgents,
    ] = await Promise.all([
      this.prisma.lead.findMany({
        where: currentLeadWhere,
        select: {
          id: true,
          status: true,
          data: true,
          projectId: true,
          assignedToId: true,
          createdAt: true,
        },
      }),
      this.prisma.lead.count({ where: prevLeadWhere }),
      this.prisma.callLog.groupBy({
        by: ['outcome'],
        where: currentCallWhere,
        _count: { _all: true },
        _sum: { durationSeconds: true },
      }),
      this.prisma.activityEvent.findMany({
        where: { orgId, ...(isLimitedRole ? { agentId: actor.sub } : {}) },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: { id: true, type: true, text: true, createdAt: true },
      }),
      this.prisma.project.findMany({
        where: { orgId },
        select: { id: true, name: true },
      }),
      this.prisma.user.findMany({
        where: { orgId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          userRoles: { select: { role: { select: { key: true, name: true } } } },
        },
      }),
    ]);

    const totalLeads = leads.length;
    const periodChangePercent =
      prevLeadsCount > 0
        ? Math.round(((totalLeads - prevLeadsCount) / prevLeadsCount) * 100)
        : totalLeads > 0
        ? 100
        : 0;

    const statusCounts: Record<string, number> = {
      new: 0,
      contacted: 0,
      follow_up: 0,
      site_visit: 0,
      negotiation: 0,
      won: 0,
      lost: 0,
    };

    let wonRevenue = 0;
    let activePipelineRevenue = 0;

    for (const l of leads) {
      const st = l.status as string;
      statusCounts[st] = (statusCounts[st] ?? 0) + 1;

      const val = parseBudgetValue(l.data);
      if (st === 'won') {
        wonRevenue += val;
      } else if (st !== 'lost') {
        activePipelineRevenue += val;
      }
    }

    const wonLeads = statusCounts['won'] ?? 0;
    const conversionRate =
      totalLeads > 0 ? parseFloat(((wonLeads / totalLeads) * 100).toFixed(1)) : 0;

    const callsMade = callStats.reduce((sum, r) => sum + r._count._all, 0);
    const outcomeMap = new Map(
      callStats.map((r) => [r.outcome, { count: r._count._all, secs: r._sum.durationSeconds ?? 0 }]),
    );
    const connectedCalls =
      (outcomeMap.get('connected')?.count ?? 0) + (outcomeMap.get('booked_visit')?.count ?? 0);
    const callConnectRate =
      callsMade > 0 ? parseFloat(((connectedCalls / callsMade) * 100).toFixed(1)) : 0;
    const totalTalkTimeSeconds = callStats.reduce(
      (sum, r) => sum + (r._sum.durationSeconds ?? 0),
      0,
    );

    const siteVisitsBooked =
      (statusCounts['site_visit'] ?? 0) +
      (statusCounts['negotiation'] ?? 0) +
      (statusCounts['won'] ?? 0);

    const projectMap = new Map(orgProjects.map((p) => [p.id, p.name]));
    const projectStatsMap = new Map<
      string,
      { projectId: string; projectName: string; leadsCount: number; wonCount: number; revenue: number }
    >();

    for (const l of leads) {
      if (!l.projectId) continue;
      const projName = projectMap.get(l.projectId) ?? 'Unknown Project';
      const existing = projectStatsMap.get(l.projectId) ?? {
        projectId: l.projectId,
        projectName: projName,
        leadsCount: 0,
        wonCount: 0,
        revenue: 0,
      };
      existing.leadsCount += 1;
      if (l.status === 'won') {
        existing.wonCount += 1;
        existing.revenue += parseBudgetValue(l.data);
      }
      projectStatsMap.set(l.projectId, existing);
    }

    const agentMap = new Map(orgAgents.map((a) => [a.id, a]));
    const agentStatsMap = new Map<
      string,
      {
        userId: string;
        name: string;
        email: string;
        role: string;
        leadsCount: number;
        wonCount: number;
        revenue: number;
        callsCount: number;
        conversionRate: number;
      }
    >();

    for (const l of leads) {
      if (!l.assignedToId) continue;
      const userObj = agentMap.get(l.assignedToId);
      if (!userObj) continue;
      const name = [userObj.firstName, userObj.lastName].filter(Boolean).join(' ') || userObj.email;
      const roleStr = userObj.userRoles[0]?.role.name ?? 'Member';

      const existing = agentStatsMap.get(l.assignedToId) ?? {
        userId: l.assignedToId,
        name,
        email: userObj.email,
        role: roleStr,
        leadsCount: 0,
        wonCount: 0,
        revenue: 0,
        callsCount: 0,
        conversionRate: 0,
      };
      existing.leadsCount += 1;
      if (l.status === 'won') {
        existing.wonCount += 1;
        existing.revenue += parseBudgetValue(l.data);
      }
      agentStatsMap.set(l.assignedToId, existing);
    }

    for (const [userId, stat] of agentStatsMap) {
      stat.conversionRate =
        stat.leadsCount > 0 ? parseFloat(((stat.wonCount / stat.leadsCount) * 100).toFixed(1)) : 0;
    }

    const primaryRole = actor.roles[0] ?? 'admin';

    return {
      role: primaryRole,
      period,
      kpis: {
        totalLeads,
        periodChangePercent,
        wonLeads,
        wonRevenue,
        activePipelineRevenue,
        conversionRate,
        totalCalls: callsMade,
        connectedCalls,
        callConnectRate,
        totalTalkTimeSeconds,
        siteVisitsBooked,
      },
      pipelineBreakdown: [
        { status: 'new', label: 'New', count: statusCounts['new'] ?? 0 },
        { status: 'contacted', label: 'Contacted', count: statusCounts['contacted'] ?? 0 },
        { status: 'follow_up', label: 'Follow Up', count: statusCounts['follow_up'] ?? 0 },
        { status: 'site_visit', label: 'Site Visit', count: statusCounts['site_visit'] ?? 0 },
        { status: 'negotiation', label: 'Negotiation', count: statusCounts['negotiation'] ?? 0 },
        { status: 'won', label: 'Won / Closed', count: statusCounts['won'] ?? 0 },
        { status: 'lost', label: 'Lost', count: statusCounts['lost'] ?? 0 },
      ],
      callOutcomes: [
        { outcome: 'connected', label: 'Connected', count: outcomeMap.get('connected')?.count ?? 0 },
        { outcome: 'booked_visit', label: 'Booked Visit', count: outcomeMap.get('booked_visit')?.count ?? 0 },
        { outcome: 'callback', label: 'Callback Scheduled', count: outcomeMap.get('callback')?.count ?? 0 },
        { outcome: 'no_answer', label: 'No Answer', count: outcomeMap.get('no_answer')?.count ?? 0 },
        { outcome: 'busy', label: 'Line Busy', count: outcomeMap.get('busy')?.count ?? 0 },
        { outcome: 'missed', label: 'Missed Call', count: outcomeMap.get('missed')?.count ?? 0 },
      ],
      projectMetrics: Array.from(projectStatsMap.values()),
      agentLeaderboard: Array.from(agentStatsMap.values()),
      recentActivity: activityEvents,
    };
  }
}
