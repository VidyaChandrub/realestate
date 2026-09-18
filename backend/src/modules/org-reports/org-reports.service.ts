import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { GetReportsFilterDto } from './dto/get-reports-filter.dto';

@Injectable()
export class OrgReportsService {
  constructor(private readonly prisma: PrismaService) {}

  private parseDateRange(dto: GetReportsFilterDto) {
    const now = new Date();
    let startDate: Date | undefined;
    let endDate: Date | undefined = now;

    if (dto.startDate) {
      startDate = new Date(dto.startDate);
    }
    if (dto.endDate) {
      endDate = new Date(dto.endDate);
    }

    if (!startDate && dto.preset) {
      switch (dto.preset) {
        case 'today':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case '7d':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case '90d':
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        case 'all':
          startDate = undefined;
          endDate = undefined;
          break;
        default:
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      }
    } else if (!startDate && !dto.startDate) {
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    return { startDate, endDate };
  }

  private buildLeadWhere(orgId: string | null, dto: GetReportsFilterDto) {
    const where: any = {};
    if (orgId) where.orgId = orgId;
    if (dto.projectId) where.projectId = dto.projectId;
    if (dto.agentId) where.assignedToId = dto.agentId;
    if (dto.source) where.source = dto.source;

    const { startDate, endDate } = this.parseDateRange(dto);
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    return where;
  }

  // --- Executive Summary ---
  async getSummary(orgId: string | null, dto: GetReportsFilterDto) {
    const where = this.buildLeadWhere(orgId, dto);

    const [totalLeads, wonLeads, leadsByStatus, units] = await Promise.all([
      this.prisma.lead.count({ where }),
      this.prisma.lead.findMany({
        where: { ...where, status: 'won' },
        select: { budgetMax: true, budgetMin: true },
      }),
      this.prisma.lead.groupBy({
        by: ['status'],
        where,
        _count: { _all: true },
      }),
      this.prisma.unit.findMany({
        where: orgId ? { orgId } : {},
        select: { status: true, price: true },
      }),
    ]);

    const wonCount = wonLeads.length;
    const winRate = totalLeads > 0 ? Math.round((wonCount / totalLeads) * 1000) / 10 : 0;
    const totalWonRevenue = wonLeads.reduce(
      (acc, curr) => acc + Number(curr.budgetMax || curr.budgetMin || 0),
      0,
    );

    const lostCount = leadsByStatus.find((s) => s.status === 'lost')?._count._all || 0;
    const activePipelineCount = totalLeads - wonCount - lostCount;

    // Call stats
    const callWhere: any = orgId ? { orgId } : {};
    const { startDate, endDate } = this.parseDateRange(dto);
    if (startDate || endDate) {
      callWhere.createdAt = {};
      if (startDate) callWhere.createdAt.gte = startDate;
      if (endDate) callWhere.createdAt.lte = endDate;
    }

    const calls = await this.prisma.callLog.findMany({
      where: callWhere,
      select: { durationSeconds: true, outcome: true },
    });

    const totalCalls = calls.length;
    const totalTalkTimeSeconds = calls.reduce(
      (acc, curr) => acc + (curr.durationSeconds || 0),
      0,
    );
    const totalTalkTimeMins = Math.round(totalTalkTimeSeconds / 60);

    // Units overview
    const totalUnits = units.length;
    const bookedUnits = units.filter(
      (u) => u.status === 'booked' || u.status === 'sold',
    ).length;

    // Platform & System counts
    const [totalOrgs, totalLandingPages, totalSupportTickets] = await Promise.all([
      this.prisma.organisation.count({ where: orgId ? { id: orgId } : {} }),
      this.prisma.landingPage.count({ where: orgId ? { orgId } : {} }),
      this.prisma.supportTicket.count({ where: orgId ? { orgId } : {} }),
    ]);

    return {
      totalLeads,
      wonCount,
      winRate,
      totalWonRevenue,
      activePipelineCount,
      totalCalls,
      totalTalkTimeMins,
      totalUnits,
      bookedUnits,
      totalOrgs,
      totalLandingPages,
      totalSupportTickets,
    };
  }

  // --- Lead Sources Breakdown ---
  async getLeadSources(orgId: string | null, dto: GetReportsFilterDto) {
    const where = this.buildLeadWhere(orgId, dto);

    const sourcesGroup = await this.prisma.lead.groupBy({
      by: ['source'],
      where,
      _count: { _all: true },
      orderBy: { _count: { source: 'desc' } },
    });

    const totalLeads = sourcesGroup.reduce((acc, curr) => acc + curr._count._all, 0);

    return sourcesGroup.map((item) => ({
      source: item.source || 'direct',
      count: item._count._all,
      percentage: totalLeads > 0 ? Math.round((item._count._all / totalLeads) * 1000) / 10 : 0,
    }));
  }

  // --- Sales Funnel Analytics ---
  async getFunnel(orgId: string | null, dto: GetReportsFilterDto) {
    const where = this.buildLeadWhere(orgId, dto);

    const stagesGroup = await this.prisma.lead.groupBy({
      by: ['status'],
      where,
      _count: { _all: true },
    });

    const stageOrder = [
      'new',
      'contacted',
      'qualified',
      'site_visit_booked',
      'site_visit_completed',
      'negotiation',
      'won',
      'lost',
    ];

    const stageMap: Record<string, number> = {};
    stagesGroup.forEach((s) => {
      stageMap[s.status] = s._count._all;
    });

    return stageOrder.map((stage) => ({
      stage,
      label: stage.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
      count: stageMap[stage] || 0,
    }));
  }

  // --- Sales Agent Leaderboard ---
  async getAgentPerformance(orgId: string | null, dto: GetReportsFilterDto) {
    const userWhere: any = { status: 'active' };
    if (orgId) userWhere.orgId = orgId;

    const agents = await this.prisma.user.findMany({
      where: userWhere,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
      },
      take: 50,
    });

    const { startDate, endDate } = this.parseDateRange(dto);

    const performanceList = await Promise.all(
      agents.map(async (agent) => {
        const leadWhere: any = { assignedToId: agent.id };
        if (orgId) leadWhere.orgId = orgId;
        if (startDate || endDate) {
          leadWhere.createdAt = {};
          if (startDate) leadWhere.createdAt.gte = startDate;
          if (endDate) leadWhere.createdAt.lte = endDate;
        }

        const [assignedLeads, wonLeads, callLogs] = await Promise.all([
          this.prisma.lead.count({ where: leadWhere }),
          this.prisma.lead.findMany({
            where: { ...leadWhere, status: 'won' },
            select: { budgetMax: true, budgetMin: true },
          }),
          this.prisma.callLog.count({
            where: {
              agentId: agent.id,
              ...(startDate || endDate
                ? {
                    createdAt: {
                      ...(startDate ? { gte: startDate } : {}),
                      ...(endDate ? { lte: endDate } : {}),
                    },
                  }
                : {}),
            },
          }),
        ]);

        const wonCount = wonLeads.length;
        const totalRevenue = wonLeads.reduce(
          (acc, curr) => acc + Number(curr.budgetMax || curr.budgetMin || 0),
          0,
        );
        const conversionRate =
          assignedLeads > 0 ? Math.round((wonCount / assignedLeads) * 1000) / 10 : 0;

        return {
          agentId: agent.id,
          name:
            [agent.firstName, agent.lastName].filter(Boolean).join(' ') ||
            agent.email,
          email: agent.email,
          assignedLeads,
          callsMade: callLogs,
          wonCount,
          totalRevenue,
          conversionRate,
        };
      }),
    );

    return performanceList.sort(
      (a, b) => b.totalRevenue - a.totalRevenue || b.assignedLeads - a.assignedLeads,
    );
  }

  // --- Project Sales Analytics ---
  async getProjectAnalytics(orgId: string | null, dto: GetReportsFilterDto) {
    const projectWhere: any = {};
    if (orgId) projectWhere.orgId = orgId;

    const projects = await this.prisma.project.findMany({
      where: projectWhere,
      select: {
        id: true,
        name: true,
        city: true,
      },
    });

    return Promise.all(
      projects.map(async (p) => {
        const [units, leads] = await Promise.all([
          this.prisma.unit.findMany({
            where: { projectId: p.id },
            select: { id: true, status: true, price: true },
          }),
          this.prisma.lead.findMany({
            where: { projectId: p.id },
            select: { id: true, status: true, budgetMax: true, budgetMin: true },
          }),
        ]);

        const totalUnits = units.length;
        const availableUnits = units.filter((u) => u.status === 'available').length;
        const bookedUnits = units.filter((u) => u.status === 'booked').length;
        const soldUnits = units.filter((u) => u.status === 'sold').length;

        const totalLeads = leads.length;
        const wonLeads = leads.filter((l) => l.status === 'won');
        const revenueBooked = wonLeads.reduce(
          (acc, curr) => acc + Number(curr.budgetMax || curr.budgetMin || 0),
          0,
        );

        return {
          projectId: p.id,
          name: p.name,
          city: p.city,
          totalUnits,
          availableUnits,
          bookedUnits,
          soldUnits,
          totalLeads,
          wonLeadsCount: wonLeads.length,
          revenueBooked,
        };
      }),
    );
  }

  // --- Export CSV ---
  async exportCsv(orgId: string | null, dto: GetReportsFilterDto, type = 'leads') {
    if (type === 'agents') {
      const agents = await this.getAgentPerformance(orgId, dto);
      const headers = [
        'Agent Name',
        'Email',
        'Assigned Leads',
        'Calls Made',
        'Deals Won',
        'Total Revenue (INR)',
        'Conversion Rate (%)',
      ];
      const rows = agents.map((a) => [
        `"${a.name}"`,
        `"${a.email}"`,
        a.assignedLeads,
        a.callsMade,
        a.wonCount,
        a.totalRevenue,
        a.conversionRate,
      ]);
      return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    }

    if (type === 'projects') {
      const projects = await this.getProjectAnalytics(orgId, dto);
      const headers = [
        'Project Name',
        'City',
        'Total Units',
        'Available Units',
        'Booked Units',
        'Sold Units',
        'Total Leads',
        'Won Deals',
        'Revenue Booked (INR)',
      ];
      const rows = projects.map((p) => [
        `"${p.name}"`,
        `"${p.city || ''}"`,
        p.totalUnits,
        p.availableUnits,
        p.bookedUnits,
        p.soldUnits,
        p.totalLeads,
        p.wonLeadsCount,
        p.revenueBooked,
      ]);
      return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    }

    // Default: Leads export
    const where = this.buildLeadWhere(orgId, dto);
    const leads = await this.prisma.lead.findMany({
      where,
      include: {
        assignedTo: { select: { firstName: true, lastName: true, email: true } },
        project: { select: { name: true } },
      },
      take: 1000,
      orderBy: { createdAt: 'desc' },
    });

    const headers = [
      'Lead Name',
      'Phone',
      'Email',
      'Source',
      'Status',
      'Budget (INR)',
      'Project',
      'Assigned Agent',
      'Created Date',
    ];

    const rows = leads.map((l) => {
      const leadData = (l.data as Record<string, any>) || {};
      const name =
        l.altName ||
        leadData.name ||
        leadData.fullName ||
        [leadData.firstName, leadData.lastName].filter(Boolean).join(' ') ||
        'Unnamed';
      const phone = l.altPhone || leadData.phone || leadData.phoneNumber || '';
      const email = leadData.email || '';
      const budget = Number(l.budgetMax || l.budgetMin || 0);

      const agentName = l.assignedTo
        ? [l.assignedTo.firstName, l.assignedTo.lastName].filter(Boolean).join(' ') || l.assignedTo.email
        : '';

      return [
        `"${name}"`,
        `"${phone}"`,
        `"${email}"`,
        `"${l.source || ''}"`,
        `"${l.status}"`,
        budget,
        `"${l.project?.name || ''}"`,
        `"${agentName}"`,
        `"${l.createdAt.toISOString()}"`,
      ];
    });

    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  }
}
