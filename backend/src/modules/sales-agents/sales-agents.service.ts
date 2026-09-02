import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import type { JwtPayload } from '../../common/types/jwt-payload.interface';

/** Sales agents = org members who carry leads. Only manager/sales appear on
 *  the team dashboard — the same roles scoped to their own leads in the
 *  inbox (mirrors `LeadsService.LIMITED_ROLES`). */
const AGENT_ROLES = ['manager', 'sales'];

/** Ordered pipeline so the response always lists every stage, zero or not. */
const PIPELINE_ORDER = [
  'new',
  'contacted',
  'follow_up',
  'site_visit',
  'negotiation',
  'won',
  'lost',
] as const;

/** Form fields we try as a deal amount when computing booked revenue. Free-text
 *  form submissions vary, so we take the first field that parses and use the
 *  upper bound (a range like "₹1.4 – 1.8 Cr" books at the optimistic end). */
const REVENUE_KEYS = [
  'budget',
  'budgetRange',
  'expectedValue',
  'dealValue',
  'value',
  'amount',
  'price',
];

interface AgentRow {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  phoneNumber: string | null;
  status: 'active' | 'disabled';
  createdAt: Date;
  userRoles: {
    role: { key: string; name: string };
  }[];
}

@Injectable()
export class SalesAgentsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Org-admin: summary cards per sales agent plus an org snapshot used by the
   * team dashboard header tiles.
   */
  async list(orgId: string | null) {
    if (!orgId) {
      throw new ForbiddenException('Organisation access required');
    }

    const agents = await this.findAgents(orgId);
    const rows = await this.buildRows(orgId, agents);

    const active = rows.filter((r) => r.online);
    const missingPhone = rows.filter((r) => r.bridgeMissing);

    return {
      total: rows.length,
      snapshot: {
        agents: rows.length,
        online: active.length,
        missingPhone: missingPhone.length,
      },
      data: rows,
    };
  }

  /**
   * Single-agent dashboard. Admins may open any org agent; a manager/sales user
   * may only open their own. Recent assigned leads are returned in the same
   * payload so the detail page's leads tab renders from real data.
   */
  async detail(orgId: string | null, actor: JwtPayload, agentId: string) {
    if (!orgId) {
      throw new ForbiddenException('Organisation access required');
    }

    const agent = await this.prisma.user.findFirst({
      where: {
        id: agentId,
        orgId,
        userRoles: {
          some: { role: { key: { in: [...AGENT_ROLES] } } },
        },
      },
      include: { userRoles: { include: { role: true } } },
    });

    if (!agent) {
      throw new NotFoundException('Sales agent not found');
    }

    const isAdmin = actor.roles.includes('admin');
    if (!isAdmin && actor.sub !== agent.id) {
      throw new ForbiddenException('You can only view your own dashboard');
    }

    // Rank is relative to the whole org, so the single-agent view reuses the
    // full-org computation rather than building a one-element row.
    const allRows = await this.buildRows(orgId, await this.findAgents(orgId));
    const summary = allRows.find((row) => row.id === agentId);
    if (!summary) {
      throw new NotFoundException('Sales agent not found');
    }

    const since14 = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

    const [recentLeads, calls, activity, callStats, leadDays, callDays] =
      await Promise.all([
        this.prisma.lead.findMany({
          where: { orgId, assignedToId: agentId },
          orderBy: { createdAt: 'desc' },
          take: 15,
          select: {
            id: true,
            formName: true,
            source: true,
            status: true,
            data: true,
            createdAt: true,
          },
        }),
        this.prisma.callLog.findMany({
          where: { orgId, agentId },
          orderBy: { createdAt: 'desc' },
          take: 12,
          select: {
            id: true,
            leadId: true,
            leadName: true,
            direction: true,
            outcome: true,
            durationSeconds: true,
            createdAt: true,
          },
        }),
        this.prisma.activityEvent.findMany({
          where: { orgId, agentId },
          orderBy: { createdAt: 'desc' },
          take: 12,
          select: { id: true, type: true, text: true, createdAt: true },
        }),
        this.prisma.callLog.groupBy({
          by: ['outcome'],
          where: { orgId, agentId },
          _count: { _all: true },
          _sum: { durationSeconds: true },
        }),
        // Last-14-days series for the "Activity — last 14 days" chart. Leases
        // and calls are bucketed by calendar day (server-local) so the paired
        // bars show real work over the trailing fortnight.
        this.prisma.lead.findMany({
          where: { orgId, assignedToId: agentId, createdAt: { gte: since14 } },
          select: { createdAt: true },
        }),
        this.prisma.callLog.findMany({
          where: { orgId, agentId, createdAt: { gte: since14 } },
          select: { createdAt: true },
        }),
      ]);

    const outcomeMap = new Map(
      callStats.map((row) => [
        row.outcome,
        { count: row._count._all, secs: row._sum.durationSeconds ?? 0 },
      ]),
    );
    // Outcomes that actually established a conversation (voice connects + a
    // visit booked on the call); no-answer / busy / missed calls are attempts.
    const connectable = (['connected', 'booked_visit'] as const).filter(
      (outcome) => outcomeMap.has(outcome),
    );
    const callsMade = callStats.reduce((sum, row) => sum + row._count._all, 0);
    const connected = connectable.reduce(
      (sum, outcome) => sum + (outcomeMap.get(outcome)?.count ?? 0),
      0,
    );
    const talkSeconds = callStats.reduce(
      (sum, row) => sum + (row._sum.durationSeconds ?? 0),
      0,
    );

    const whatsapp = await this.prisma.activityEvent.groupBy({
      by: ['type'],
      where: {
        orgId,
        agentId,
        type: { in: ['whatsapp_sent', 'whatsapp_read'] },
      },
      _count: { _all: true },
    });
    const whatsappSent =
      whatsapp.find((row) => row.type === 'whatsapp_sent')?._count._all ?? 0;
    const whatsappRead =
      whatsapp.find((row) => row.type === 'whatsapp_read')?._count._all ?? 0;

    // Last-14-days paired series (leads vs calls) — bucketed by calendar day.
    const bucketDay = (rows: { createdAt: Date }[]) =>
      rows.reduce<Record<string, number>>((acc, r) => {
        const key = r.createdAt.toISOString().slice(5, 10);
        acc[key] = (acc[key] ?? 0) + 1;
        return acc;
      }, {});
    const leadBuckets = bucketDay(leadDays);
    const callBuckets = bucketDay(callDays);
    const activity14 = Array.from({ length: 14 }, (_, i) => {
      const d = new Date(Date.now() - (13 - i) * 24 * 60 * 60 * 1000);
      const key = d.toISOString().slice(5, 10);
      return {
        day: String(14 - i),
        leads: leadBuckets[key] ?? 0,
        calls: callBuckets[key] ?? 0,
      };
    });

    // Monthly "Targets — this month" block. Current values come straight from
    // real CRM data; targets are modest stretch goals derived from the whole
    // org's run-rate (so each bar stays honest but signals headroom). Site
    // visits = leads in the site-visit stage; leads worked = any lead beyond
    // "new".
    const siteVisits =
      summary.stats.pipeline.find((s) => s.status === 'site_visit')?.count ?? 0;
    const leadsWorked = summary.stats.leadsAssigned - siteVisits;
    const revenueCr = Math.round((summary.stats.revenueBooked / 1e7) * 10) / 10;
    const closuresAvg =
      allRows.length > 0
        ? allRows.reduce((s, r) => s + r.stats.closures, 0) / allRows.length
        : 0;
    const revenueAvg =
      allRows.length > 0
        ? allRows.reduce((s, r) => s + r.stats.revenueBooked / 1e7, 0) /
          allRows.length
        : 0;
    const targets = {
      revenueCr,
      revenueTargetCr: Math.max(
        revenueCr,
        Math.round(Math.ceil(revenueAvg * 1.15) * 10) / 10,
      ),
      closures: summary.stats.closures,
      targetClosures: Math.max(
        summary.stats.closures + 1,
        Math.ceil(closuresAvg * 1.2),
      ),
      siteVisits,
      siteVisitTarget: Math.max(siteVisits + 1, 10),
      leadsWorked,
      leadsWorkedTarget: Math.max(
        leadsWorked + 1,
        Math.ceil(leadsWorked + closuresAvg * 2),
      ),
    };

    return {
      agent: summary,
      totalAgents: allRows.length,
      recentLeads: recentLeads.map((lead) => ({
        id: lead.id,
        formName: lead.formName,
        source: lead.source,
        status: lead.status,
        data: lead.data,
        budget: this.parseAmount(lead.data),
        createdAt: lead.createdAt,
      })),
      comms: {
        callsMade,
        connected,
        connectRate:
          callsMade > 0 ? Math.round((connected / callsMade) * 1000) / 10 : 0,
        talkSeconds,
        avgCallSeconds: connected > 0 ? Math.round(talkSeconds / connected) : 0,
        whatsappSent,
        whatsappRead,
        whatsappReadPct:
          whatsappSent > 0
            ? Math.round((whatsappRead / whatsappSent) * 100)
            : 0,
      },
      calls: calls.map((call) => ({
        id: call.id,
        leadId: call.leadId,
        leadName: call.leadName,
        direction: call.direction,
        outcome: call.outcome,
        durationSeconds: call.durationSeconds,
        createdAt: call.createdAt,
      })),
      activity: activity.map((event) => ({
        id: event.id,
        type: event.type,
        text: event.text,
        createdAt: event.createdAt,
      })),
      targets,
      activity14,
    };
  }

  /** Manager/sales in the org, oldest first (matches the collaboration tab). */
  private findAgents(orgId: string) {
    return this.prisma.user.findMany({
      where: {
        orgId,
        userRoles: {
          some: { role: { key: { in: [...AGENT_ROLES] } } },
        },
      },
      include: { userRoles: { include: { role: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Builds the full AgentSummary rows for a set of agents. All aggregation is
   * org-scoped and pulled from the `leads` table in three bulk queries:
   *  - status counts (pipeline/active/closures)
   *  - source counts (lead source donut)
   *  - won leads' form data (booked revenue)
   */
  private async buildRows(orgId: string, agents: AgentRow[]) {
    const agentIds = agents.map((a) => a.id);

    const [pipeline, sources, wonLeads] = await Promise.all([
      agentIds.length
        ? this.prisma.lead.groupBy({
            by: ['assignedToId', 'status'],
            where: { orgId, assignedToId: { in: agentIds } },
            _count: { _all: true },
          })
        : [],
      agentIds.length
        ? this.prisma.lead.groupBy({
            by: ['assignedToId', 'source'],
            where: { orgId, assignedToId: { in: agentIds } },
            _count: { _all: true },
          })
        : [],
      agentIds.length
        ? this.prisma.lead.findMany({
            where: { orgId, assignedToId: { in: agentIds }, status: 'won' },
            select: { assignedToId: true, data: true },
          })
        : [],
    ]);

    const pipelineMap = new Map<string, Map<string, number>>();
    for (const row of pipeline) {
      const agentId = row.assignedToId as string;
      if (!pipelineMap.has(agentId)) {
        pipelineMap.set(agentId, new Map());
      }
      pipelineMap.get(agentId)!.set(row.status, row._count._all);
    }

    const sourcesMap = new Map<string, Map<string | null, number>>();
    for (const row of sources) {
      const agentId = row.assignedToId as string;
      if (!sourcesMap.has(agentId)) {
        sourcesMap.set(agentId, new Map());
      }
      sourcesMap
        .get(agentId)!
        .set(
          row.source,
          (sourcesMap.get(agentId)!.get(row.source) ?? 0) + row._count._all,
        );
    }

    const revenueMap = new Map<string, number>();
    for (const lead of wonLeads) {
      revenueMap.set(
        lead.assignedToId as string,
        (revenueMap.get(lead.assignedToId as string) ?? 0) +
          this.parseAmount(lead.data),
      );
    }

    const rows = agents.map((agent) => {
      const counts = pipelineMap.get(agent.id) ?? new Map<string, number>();
      const total = [...counts.values()].reduce((sum, n) => sum + n, 0);
      const closures = counts.get('won') ?? 0;
      const lost = counts.get('lost') ?? 0;
      const pipelineArr = PIPELINE_ORDER.map((status) => ({
        status,
        count: counts.get(status) ?? 0,
      }));
      const rawSources = sourcesMap.get(agent.id);
      const sourcesArr = rawSources
        ? [...rawSources.entries()].map(([source, count]) => ({
            source,
            count,
          }))
        : [];

      return {
        id: agent.id,
        name:
          [agent.firstName, agent.lastName].filter(Boolean).join(' ') ||
          agent.email,
        firstName: agent.firstName,
        lastName: agent.lastName,
        email: agent.email,
        phoneNumber: agent.phoneNumber,
        role: agent.userRoles[0]?.role ?? null,
        status: agent.status,
        // Real-time presence isn't tracked anywhere in the platform yet — this
        // is a lifecycle proxy (active account). Swap for a presence/online
        // source when one exists.
        online: agent.status === 'active',
        bridgeMissing: !agent.phoneNumber,
        joinedAt: agent.createdAt,
        stats: {
          leadsAssigned: total,
          activeLeads: total - closures - lost,
          closures,
          lost,
          conversion:
            total > 0 ? Math.round((closures / total) * 1000) / 10 : 0,
          revenueBooked: revenueMap.get(agent.id) ?? 0,
          pipeline: pipelineArr,
          sources: sourcesArr,
        },
      };
    });

    // Ranking is by closures (then leads worked) across the org, 1-based.
    rows.sort(
      (a, b) =>
        b.stats.closures - a.stats.closures ||
        b.stats.leadsAssigned - a.stats.leadsAssigned,
    );
    return rows.map((row, index) => ({ ...row, rank: index + 1 }));
  }

  /**
   * Best-effort deal amount extraction from a lead's form data. Returns 0 when
   * nothing numeric is found (no revenue field on free-text forms).
   */
  private parseAmount(data: Prisma.JsonValue | null | undefined): number {
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      return 0;
    }
    const record = data as Record<string, unknown>;
    for (const key of REVENUE_KEYS) {
      const value = record[key];
      if (typeof value === 'number') {
        return Math.max(0, value);
      }
      if (typeof value === 'string') {
        const parsed = this.parseAmountString(value);
        if (parsed > 0) {
          return parsed;
        }
      }
      if (value && typeof value === 'object') {
        const nested = value as Record<string, unknown>;
        const candidate = [nested.min, nested.max]
          .filter(
            (v): v is string | number =>
              typeof v === 'string' || typeof v === 'number',
          )
          .map((v) =>
            typeof v === 'number' ? Math.max(0, v) : this.parseAmountString(v),
          )
          .sort((a, b) => b - a);
        if (candidate.length > 0 && candidate[0] > 0) {
          return candidate[0];
        }
      }
    }
    return 0;
  }

  /** Parses strings like "₹1.4 – 1.8 Cr", "25 L at 3 BHK", "1,45,00,000". */
  private parseAmountString(input: string): number {
    const text = input.replace(/,/g, '').trim();
    if (!text) {
      return 0;
    }
    const multiplier = /(?:cr|crore)\b/i.test(text)
      ? 1e7
      : /(?:lakh|lac|l)\b/i.test(text)
        ? 1e5
        : 1;
    const matches = text.match(/\d+\.?\d*/g)?.map((m) => parseFloat(m)) ?? [];
    if (matches.length === 0) {
      return 0;
    }
    return Math.max(...matches) * multiplier;
  }
}
