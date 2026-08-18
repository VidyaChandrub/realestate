import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AnalyticsDbService } from '../prisma.service';
import { AnalyticsIngestionInput, DateRangeFilter, PaginationFilter } from '../analytics.types';

type EventRow = {
  id: string;
  event_type: string;
  user_id: string | null;
  organization_id: string | null;
  entity_type: string;
  entity_id: string | null;
  metadata: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: Date;
};

@Injectable()
export class AnalyticsRepository {
  constructor(private readonly prisma: AnalyticsDbService) {}

  async ingestDomainEvent(input: AnalyticsIngestionInput): Promise<boolean> {
    return this.prisma.$transaction(async (tx) => {
      if (input.ingestionKey) {
        const dedupInsert = await tx.$queryRaw<{ ingestion_key: string }[]>`
          INSERT INTO analytics.analytics_event_dedup (ingestion_key)
          VALUES (${input.ingestionKey})
          ON CONFLICT (ingestion_key) DO NOTHING
          RETURNING ingestion_key
        `;

        if (dedupInsert.length === 0) {
          return false;
        }
      }

      const inserted = await tx.$queryRaw<{ id: string }[]>`
        INSERT INTO analytics.analytics_events (
          id,
          event_type,
          user_id,
          organization_id,
          entity_type,
          entity_id,
          metadata,
          ip_address,
          user_agent,
          created_at
        )
        VALUES (
          gen_random_uuid(),
          ${input.eventType},
          ${input.userId ?? null},
          ${input.organizationId ?? null},
          ${input.entityType}::analytics."AnalyticsEntityType",
          ${input.entityId ?? null},
          ${JSON.stringify(input.metadata)}::jsonb,
          ${input.ipAddress ?? null},
          ${input.userAgent ?? null},
          ${input.createdAt ?? new Date()}
        )
        RETURNING id
      `;

      if (inserted.length === 0) {
        return false;
      }

      if (input.ingestionKey) {
        await tx.$executeRaw`
          UPDATE analytics.analytics_event_dedup
          SET analytics_event_id = ${inserted[0].id}::uuid,
              processed_at = now()
          WHERE ingestion_key = ${input.ingestionKey}
        `;
      }

      await this.applyAggregateMutations(tx, input.aggregateMutations);
      return true;
    });
  }

  private async applyAggregateMutations(
    tx: Prisma.TransactionClient,
    mutations: AnalyticsIngestionInput['aggregateMutations'],
  ): Promise<void> {
    for (const mutation of mutations) {
      if (mutation.kind === 'campaign') {
        await tx.$executeRaw`
          INSERT INTO analytics.campaign_metrics (
            campaign_id,
            impressions,
            clicks,
            video_completions,
            spend,
            last_updated_at
          )
          VALUES (
            ${mutation.campaignId}::uuid,
            ${mutation.counter === 'impressions' ? mutation.delta : 0},
            ${mutation.counter === 'clicks' ? mutation.delta : 0},
            ${mutation.counter === 'videoCompletions' ? mutation.delta : 0},
            ${mutation.spendDelta ?? 0},
            now()
          )
          ON CONFLICT (campaign_id)
          DO UPDATE SET
            impressions = analytics.campaign_metrics.impressions + EXCLUDED.impressions,
            clicks = analytics.campaign_metrics.clicks + EXCLUDED.clicks,
            video_completions = analytics.campaign_metrics.video_completions + EXCLUDED.video_completions,
            spend = analytics.campaign_metrics.spend + EXCLUDED.spend,
            last_updated_at = now()
        `;
      }

      if (mutation.kind === 'job') {
        await tx.$executeRaw`
          INSERT INTO analytics.job_metrics (job_id, views, applications, last_updated_at)
          VALUES (
            ${mutation.jobId}::uuid,
            ${mutation.counter === 'views' ? mutation.delta : 0},
            ${mutation.counter === 'applications' ? mutation.delta : 0},
            now()
          )
          ON CONFLICT (job_id)
          DO UPDATE SET
            views = analytics.job_metrics.views + EXCLUDED.views,
            applications = analytics.job_metrics.applications + EXCLUDED.applications,
            last_updated_at = now()
        `;
      }

      if (mutation.kind === 'event') {
        await tx.$executeRaw`
          INSERT INTO analytics.event_metrics (event_id, views, registrations, external_registration_clicks, last_updated_at)
          VALUES (
            ${mutation.eventId}::uuid,
            ${mutation.counter === 'views' ? mutation.delta : 0},
            ${mutation.counter === 'registrations' ? mutation.delta : 0},
            ${mutation.counter === 'external_registration_clicks' ? mutation.delta : 0},
            now()
          )
          ON CONFLICT (event_id)
          DO UPDATE SET
            views = analytics.event_metrics.views + EXCLUDED.views,
            registrations = analytics.event_metrics.registrations + EXCLUDED.registrations,
            external_registration_clicks = analytics.event_metrics.external_registration_clicks + EXCLUDED.external_registration_clicks,
            last_updated_at = now()
        `;
      }

      if (mutation.kind === 'user') {
        await tx.$executeRaw`
          INSERT INTO analytics.user_engagement_summary (
            user_id,
            total_sessions,
            total_clicks,
            total_applications,
            last_active_at
          )
          VALUES (
            ${mutation.userId},
            ${mutation.sessionsDelta ?? 0},
            ${mutation.clicksDelta ?? 0},
            ${mutation.applicationsDelta ?? 0},
            ${mutation.lastActiveAt ?? new Date()}
          )
          ON CONFLICT (user_id)
          DO UPDATE SET
            total_sessions = analytics.user_engagement_summary.total_sessions + EXCLUDED.total_sessions,
            total_clicks = analytics.user_engagement_summary.total_clicks + EXCLUDED.total_clicks,
            total_applications = analytics.user_engagement_summary.total_applications + EXCLUDED.total_applications,
            last_active_at = GREATEST(analytics.user_engagement_summary.last_active_at, EXCLUDED.last_active_at)
        `;
      }
    }
  }

  async getCampaignMetrics(campaignId: string): Promise<{
    campaignId: string;
    impressions: number;
    clicks: number;
    videoCompletions: number;
    spend: number;
    lastUpdatedAt: Date;
  }> {
    const rows = await this.prisma.$queryRaw<
      {
        campaign_id: string;
        impressions: bigint;
        clicks: bigint;
        video_completions: bigint;
        spend: Prisma.Decimal;
        last_updated_at: Date;
      }[]
    >`
      SELECT campaign_id, impressions, clicks, video_completions, spend, last_updated_at
      FROM analytics.campaign_metrics
      WHERE campaign_id = ${campaignId}::uuid
      LIMIT 1
    `;

    if (rows.length === 0) {
      return {
        campaignId,
        impressions: 0,
        clicks: 0,
        videoCompletions: 0,
        spend: 0,
        lastUpdatedAt: new Date(0),
      };
    }

    return {
      campaignId: rows[0].campaign_id,
      impressions: Number(rows[0].impressions),
      clicks: Number(rows[0].clicks),
      videoCompletions: Number(rows[0].video_completions),
      spend: Number(rows[0].spend),
      lastUpdatedAt: rows[0].last_updated_at,
    };
  }

  async getJobMetrics(jobId: string): Promise<{
    jobId: string;
    views: number;
    applications: number;
    lastUpdatedAt: Date;
  }> {
    const rows = await this.prisma.$queryRaw<
      { job_id: string; views: bigint; applications: bigint; last_updated_at: Date }[]
    >`
      SELECT job_id, views, applications, last_updated_at
      FROM analytics.job_metrics
      WHERE job_id = ${jobId}::uuid
      LIMIT 1
    `;

    if (rows.length === 0) {
      return {
        jobId,
        views: 0,
        applications: 0,
        lastUpdatedAt: new Date(0),
      };
    }

    return {
      jobId: rows[0].job_id,
      views: Number(rows[0].views),
      applications: Number(rows[0].applications),
      lastUpdatedAt: rows[0].last_updated_at,
    };
  }

  async getEventMetrics(eventId: string): Promise<{
    eventId: string;
    views: number;
    registrations: number;
    externalRegistrationClicks: number;
    lastUpdatedAt: Date;
  }> {
    const rows = await this.prisma.$queryRaw<
      { event_id: string; views: bigint; registrations: bigint; external_registration_clicks: bigint; last_updated_at: Date }[]
    >`
      SELECT event_id, views, registrations, external_registration_clicks, last_updated_at
      FROM analytics.event_metrics
      WHERE event_id = ${eventId}::uuid
      LIMIT 1
    `;

    if (rows.length === 0) {
      return {
        eventId,
        views: 0,
        registrations: 0,
        externalRegistrationClicks: 0,
        lastUpdatedAt: new Date(0),
      };
    }

    return {
      eventId: rows[0].event_id,
      views: Number(rows[0].views),
      registrations: Number(rows[0].registrations),
      externalRegistrationClicks: Number(rows[0].external_registration_clicks),
      lastUpdatedAt: rows[0].last_updated_at,
    };
  }

  async getJobMetricsMap(jobIds: string[]): Promise<Record<string, { views: number; applications: number }>> {
    if (jobIds.length === 0) {
      return {};
    }

    const rows = await this.prisma.$queryRaw<
      { job_id: string; views: bigint; applications: bigint }[]
    >`
      SELECT job_id, views, applications
      FROM analytics.job_metrics
      WHERE job_id IN (${Prisma.join(jobIds.map((id) => Prisma.sql`${id}::uuid`))})
    `;

    const result: Record<string, { views: number; applications: number }> = {};
    for (const row of rows) {
      result[row.job_id] = {
        views: Number(row.views),
        applications: Number(row.applications),
      };
    }
    return result;
  }

  async getEventMetricsMap(eventIds: string[]): Promise<Record<string, { views: number; registrations: number }>> {
    if (eventIds.length === 0) {
      return {};
    }

    const rows = await this.prisma.$queryRaw<
      { event_id: string; views: bigint; registrations: bigint }[]
    >`
      SELECT event_id, views, registrations
      FROM analytics.event_metrics
      WHERE event_id IN (${Prisma.join(eventIds.map((id) => Prisma.sql`${id}::uuid`))})
    `;

    const result: Record<string, { views: number; registrations: number }> = {};
    for (const row of rows) {
      result[row.event_id] = {
        views: Number(row.views),
        registrations: Number(row.registrations),
      };
    }
    return result;
  }

  async getCampaignMetricsMap(campaignIds: string[]): Promise<Record<string, { impressions: number; clicks: number }>> {
    if (campaignIds.length === 0) {
      return {};
    }

    const rows = await this.prisma.$queryRaw<
      { campaign_id: string; impressions: bigint; clicks: bigint }[]
    >`
      SELECT campaign_id, impressions, clicks
      FROM analytics.campaign_metrics
      WHERE campaign_id IN (${Prisma.join(campaignIds.map((id) => Prisma.sql`${id}::uuid`))})
    `;

    const result: Record<string, { impressions: number; clicks: number }> = {};
    for (const row of rows) {
      result[row.campaign_id] = {
        impressions: Number(row.impressions),
        clicks: Number(row.clicks),
      };
    }
    return result;
  }

  async getViewedFeedIds(userId: string): Promise<Set<string>> {
    if (!userId) return new Set();

    const rows = await this.prisma.$queryRaw<{ entity_id: string }[]>`
      SELECT entity_id::text
      FROM analytics.user_seen_feed
      WHERE user_id = ${userId}
        AND viewed_at IS NOT NULL
    `;
    return new Set(rows.map((r) => r.entity_id));
  }

  // Called for every organic item in a feed response — records that an item was
  // served, not that the user looked at it. Does not affect hideSeenFeeds exclusion
  // on its own (see markFeedItemsViewed for that).
  async markFeedItemsServed(
    userId: string,
    items: Array<{ entityId: string; entityType: string }>,
  ): Promise<void> {
    if (!userId || items.length === 0) return;

    const ids = items.map((i) => i.entityId);
    const types = items.map((i) => i.entityType);

    await this.prisma.$executeRaw`
      INSERT INTO analytics.user_seen_feed (user_id, entity_id, entity_type)
      SELECT
        ${userId},
        unnest(${ids}::uuid[]),
        unnest(${types}::text[])
      ON CONFLICT (user_id, entity_id) DO NOTHING
    `;
  }

  // Called from POST /api/v1/feed/impressions when the client confirms an item
  // actually crossed a visibility threshold. Upserts in case an impression somehow
  // arrives before/without a prior "served" row, and preserves the first-viewed
  // timestamp on repeat calls (COALESCE keeps the existing value if already set).
  async markFeedItemsViewed(
    userId: string,
    items: Array<{ entityId: string; entityType: string }>,
  ): Promise<void> {
    if (!userId || items.length === 0) return;

    const ids = items.map((i) => i.entityId);
    const types = items.map((i) => i.entityType);

    await this.prisma.$executeRaw`
      INSERT INTO analytics.user_seen_feed (user_id, entity_id, entity_type, viewed_at)
      SELECT
        ${userId},
        unnest(${ids}::uuid[]),
        unnest(${types}::text[]),
        CURRENT_TIMESTAMP
      ON CONFLICT (user_id, entity_id)
      DO UPDATE SET viewed_at = COALESCE(analytics.user_seen_feed.viewed_at, EXCLUDED.viewed_at)
    `;
  }

  async clearUserSeenFeeds(userId: string, entityType?: 'JOB' | 'EVENT'): Promise<void> {
    if (!userId) return;
    if (entityType) {
      await this.prisma.$executeRaw`
        DELETE FROM analytics.user_seen_feed
        WHERE user_id = ${userId}
          AND entity_type = ${entityType}
      `;
      return;
    }
    await this.prisma.$executeRaw`
      DELETE FROM analytics.user_seen_feed
      WHERE user_id = ${userId}
    `;
  }

  async getCampaignOrganizationId(campaignId: string): Promise<string | null> {
    const rows = await this.prisma.$queryRaw<{ organization_id: string }[]>`
      SELECT organization_id
      FROM ads.campaigns
      WHERE id = ${campaignId}
      LIMIT 1
    `;
    return rows[0]?.organization_id ?? null;
  }

  async getJobOrganizationId(jobId: string): Promise<string | null> {
    const rows = await this.prisma.$queryRaw<{ organization_id: string }[]>`
      SELECT organization_id
      FROM jobs.jobs
      WHERE id = ${jobId}
      LIMIT 1
    `;
    return rows[0]?.organization_id ?? null;
  }

  async getEventOrganizationId(eventId: string): Promise<string | null> {
    const rows = await this.prisma.$queryRaw<{ organization_id: string }[]>`
      SELECT organization_id
      FROM events.events
      WHERE id = ${eventId}
      LIMIT 1
    `;
    return rows[0]?.organization_id ?? null;
  }

  async listCampaignEvents(
    campaignId: string,
    dateRange: DateRangeFilter,
    pagination: PaginationFilter,
  ): Promise<{ rows: EventRow[]; total: number }> {
    const whereSql = this.buildWhereSql(dateRange, Prisma.sql`
      (
        (e.entity_type = 'AD' AND e.entity_id = ${campaignId})
        OR (e.metadata->>'campaignId' = ${campaignId})
      )
    `);

    return this.listEvents(whereSql, pagination);
  }

  async listJobEvents(
    jobId: string,
    dateRange: DateRangeFilter,
    pagination: PaginationFilter,
  ): Promise<{ rows: EventRow[]; total: number }> {
    const whereSql = this.buildWhereSql(dateRange, Prisma.sql`
      (
        (e.entity_type = 'JOB' AND e.entity_id = ${jobId})
        OR (e.metadata->>'jobId' = ${jobId})
      )
    `);

    return this.listEvents(whereSql, pagination);
  }

  async listEventEvents(
    eventId: string,
    dateRange: DateRangeFilter,
    pagination: PaginationFilter,
  ): Promise<{ rows: EventRow[]; total: number }> {
    const whereSql = this.buildWhereSql(dateRange, Prisma.sql`
      (
        (e.entity_type = 'EVENT' AND e.entity_id = ${eventId})
        OR (e.metadata->>'eventId' = ${eventId})
      )
    `);

    return this.listEvents(whereSql, pagination);
  }

  async getEmployerOverview(
    organizationId: string,
    dateRange: DateRangeFilter,
    pagination: PaginationFilter,
  ): Promise<{
    summary: {
      totalEvents: number;
      totalClicks: number;
      totalApplications: number;
      totalRegistrations: number;
      activeUsers: number;
    };
    rows: EventRow[];
    total: number;
  }> {
    const baseWhere = this.buildWhereSql(dateRange, Prisma.sql`e.organization_id = ${organizationId}::uuid`);

    const summaryRows = await this.prisma.$queryRaw<
      {
        total_events: bigint;
        total_clicks: bigint;
        total_applications: bigint;
        total_registrations: bigint;
        active_users: bigint;
      }[]
    >(
      Prisma.sql`
        SELECT
          COUNT(*) AS total_events,
          COUNT(*) FILTER (WHERE e.event_type = 'ad.click') AS total_clicks,
          COUNT(*) FILTER (WHERE e.event_type = 'application.submitted') AS total_applications,
          COUNT(*) FILTER (WHERE e.event_type = 'event.registered') AS total_registrations,
          COUNT(DISTINCT e.user_id) FILTER (WHERE e.user_id IS NOT NULL) AS active_users
        FROM analytics.analytics_events e
        ${baseWhere}
      `,
    );

    const list = await this.listEvents(baseWhere, pagination);

    return {
      summary: {
        totalEvents: Number(summaryRows[0]?.total_events ?? 0),
        totalClicks: Number(summaryRows[0]?.total_clicks ?? 0),
        totalApplications: Number(summaryRows[0]?.total_applications ?? 0),
        totalRegistrations: Number(summaryRows[0]?.total_registrations ?? 0),
        activeUsers: Number(summaryRows[0]?.active_users ?? 0),
      },
      rows: list.rows,
      total: list.total,
    };
  }

  async getPlatformSummary(
    dateRange: DateRangeFilter,
    pagination: PaginationFilter,
  ): Promise<{
    summary: {
      totalEvents: number;
      totalClicks: number;
      totalApplications: number;
      totalRegistrations: number;
      activeUsers: number;
    };
    rows: EventRow[];
    total: number;
  }> {
    const baseWhere = this.buildWhereSql(dateRange);

    const summaryRows = await this.prisma.$queryRaw<
      {
        total_events: bigint;
        total_clicks: bigint;
        total_applications: bigint;
        total_registrations: bigint;
        active_users: bigint;
      }[]
    >(
      Prisma.sql`
        SELECT
          COUNT(*) AS total_events,
          COUNT(*) FILTER (WHERE e.event_type = 'ad.click') AS total_clicks,
          COUNT(*) FILTER (WHERE e.event_type = 'application.submitted') AS total_applications,
          COUNT(*) FILTER (WHERE e.event_type = 'event.registered') AS total_registrations,
          COUNT(DISTINCT e.user_id) FILTER (WHERE e.user_id IS NOT NULL) AS active_users
        FROM analytics.analytics_events e
        ${baseWhere}
      `,
    );

    const list = await this.listEvents(baseWhere, pagination);

    return {
      summary: {
        totalEvents: Number(summaryRows[0]?.total_events ?? 0),
        totalClicks: Number(summaryRows[0]?.total_clicks ?? 0),
        totalApplications: Number(summaryRows[0]?.total_applications ?? 0),
        totalRegistrations: Number(summaryRows[0]?.total_registrations ?? 0),
        activeUsers: Number(summaryRows[0]?.active_users ?? 0),
      },
      rows: list.rows,
      total: list.total,
    };
  }

  private buildWhereSql(dateRange: DateRangeFilter, basePredicate?: Prisma.Sql): Prisma.Sql {
    const filters: Prisma.Sql[] = [];
    if (basePredicate) {
      filters.push(basePredicate);
    }

    if (dateRange.startDate) {
      filters.push(Prisma.sql`e.created_at >= ${dateRange.startDate}`);
    }

    if (dateRange.endDate) {
      filters.push(Prisma.sql`e.created_at <= ${dateRange.endDate}`);
    }

    if (filters.length === 0) {
      return Prisma.empty;
    }

    return Prisma.sql`WHERE ${Prisma.join(filters, ' AND ')}`;
  }

  private async listEvents(whereSql: Prisma.Sql, pagination: PaginationFilter): Promise<{ rows: EventRow[]; total: number }> {
    const offset = (pagination.page - 1) * pagination.limit;

    const rows = await this.prisma.$queryRaw<EventRow[]>(
      Prisma.sql`
        SELECT
          e.id::text,
          e.event_type,
          e.user_id,
          e.organization_id::text,
          e.entity_type,
          e.entity_id,
          e.metadata,
          e.ip_address,
          e.user_agent,
          e.created_at
        FROM analytics.analytics_events e
        ${whereSql}
        ORDER BY e.created_at DESC
        LIMIT ${pagination.limit}
        OFFSET ${offset}
      `,
    );

    const countRows = await this.prisma.$queryRaw<{ total: bigint }[]>(
      Prisma.sql`
        SELECT COUNT(*) AS total
        FROM analytics.analytics_events e
        ${whereSql}
      `,
    );

    return {
      rows,
      total: Number(countRows[0]?.total ?? 0),
    };
  }
}
