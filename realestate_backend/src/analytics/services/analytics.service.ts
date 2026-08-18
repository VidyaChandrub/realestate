import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EmployerUsersService } from '../../employers/services/employer-users.service';
import {
  AnalyticsEntityType,
  AnalyticsEventType,
} from '../analytics.constants';
import { AnalyticsDateRangeQueryDto } from '../dto/analytics-date-range-query.dto';
import { AnalyticsAccessDeniedException } from '../exceptions/analytics-access-denied.exception';
import { AnalyticsResourceNotFoundException } from '../exceptions/analytics-resource-not-found.exception';
import { AnalyticsAggregateMutation, DateRangeFilter, PaginationFilter } from '../analytics.types';
import { AnalyticsRepository } from '../repositories/analytics.repository';
import { AnalyticsPartitionService } from './analytics-partition.service';

export interface AdEventPayload extends Record<string, unknown> {
  campaignId: string;
  organizationId?: string;
  userId?: string;
  spend?: number;
  idempotencyKey?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface ApplicationSubmittedPayload extends Record<string, unknown> {
  applicationId: string;
  jobId: string;
  organizationId: string;
  userId: string;
}

@Injectable()
export class AnalyticsService implements OnModuleInit {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    private readonly analyticsRepository: AnalyticsRepository,
    private readonly employerUsersService: EmployerUsersService,
    private readonly partitionService: AnalyticsPartitionService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.partitionService.maintainPartitions().catch((error: unknown) => {
      this.logger.error(`Analytics partition warmup failed: ${this.stringifyError(error)}`);
    });
  }

  @OnEvent(AnalyticsEventType.AD_IMPRESSION, {
    async: true,
    promisify: true,
    suppressErrors: true,
  })
  async handleAdImpression(payload: AdEventPayload): Promise<void> {
    await this.safeIngest({
      eventType: AnalyticsEventType.AD_IMPRESSION,
      userId: payload.userId ?? null,
      organizationId: payload.organizationId ?? null,
      entityType: AnalyticsEntityType.AD,
      entityId: payload.campaignId,
      metadata: payload,
      ipAddress: payload.ipAddress ?? null,
      userAgent: payload.userAgent ?? null,
      ingestionKey: this.pickIngestionKey(payload, AnalyticsEventType.AD_IMPRESSION, payload.campaignId),
      aggregateMutations: [
        {
          kind: 'campaign',
          campaignId: payload.campaignId,
          counter: 'impressions',
          delta: 1,
        },
      ],
    });
  }

  @OnEvent(AnalyticsEventType.AD_CLICK, {
    async: true,
    promisify: true,
    suppressErrors: true,
  })
  async handleAdClick(payload: AdEventPayload): Promise<void> {
    const spendDelta = Number(payload.spend ?? 0);

    await this.safeIngest({
      eventType: AnalyticsEventType.AD_CLICK,
      userId: payload.userId ?? null,
      organizationId: payload.organizationId ?? null,
      entityType: AnalyticsEntityType.AD,
      entityId: payload.campaignId,
      metadata: payload,
      ipAddress: payload.ipAddress ?? null,
      userAgent: payload.userAgent ?? null,
      ingestionKey: this.pickIngestionKey(payload, AnalyticsEventType.AD_CLICK, payload.campaignId),
      aggregateMutations: [
        {
          kind: 'campaign',
          campaignId: payload.campaignId,
          counter: 'clicks',
          delta: 1,
          spendDelta,
        },
        ...(payload.userId
          ? [
              {
                kind: 'user' as const,
                userId: payload.userId ?? '',
                clicksDelta: 1,
                sessionsDelta: 1,
                lastActiveAt: new Date(),
              },
            ]
          : []),
      ],
    });
  }

  @OnEvent(AnalyticsEventType.APPLICATION_SUBMITTED, {
    async: true,
    promisify: true,
    suppressErrors: true,
  })
  async handleApplicationSubmitted(payload: ApplicationSubmittedPayload): Promise<void> {
    await this.safeIngest({
      eventType: AnalyticsEventType.APPLICATION_SUBMITTED,
      userId: payload.userId,
      organizationId: payload.organizationId,
      entityType: AnalyticsEntityType.APPLICATION,
      entityId: payload.applicationId,
      metadata: payload,
      ingestionKey: this.pickIngestionKey(payload, AnalyticsEventType.APPLICATION_SUBMITTED, payload.applicationId),
      aggregateMutations: [
        {
          kind: 'job',
          jobId: payload.jobId,
          counter: 'applications',
          delta: 1,
        },
        {
          kind: 'user',
          userId: payload.userId,
          applicationsDelta: 1,
          sessionsDelta: 1,
          lastActiveAt: new Date(),
        },
      ],
    });
  }

  @OnEvent(AnalyticsEventType.EVENT_REGISTERED, {
    async: true,
    promisify: true,
    suppressErrors: true,
  })
  async handleEventRegistered(payload: Record<string, unknown>): Promise<void> {
    const event = (payload.event ?? {}) as Record<string, unknown>;
    const registration = (payload.registration ?? {}) as Record<string, unknown>;

    const eventId = String(event.id ?? payload.eventId ?? '');
    if (!eventId) {
      return;
    }

    const userId = this.optionalString(registration.userId) ?? this.optionalString(payload.userId);
    const organizationId = this.optionalString(event.organizationId) ?? this.optionalString(payload.organizationId);

    const aggregateMutations: AnalyticsAggregateMutation[] = [
      {
        kind: 'event',
        eventId,
        counter: 'registrations',
        delta: 1,
      },
    ];

    if (userId) {
      aggregateMutations.push({
        kind: 'user',
        userId,
        sessionsDelta: 1,
        lastActiveAt: new Date(),
      });
    }

    await this.safeIngest({
      eventType: AnalyticsEventType.EVENT_REGISTERED,
      userId,
      organizationId,
      entityType: AnalyticsEntityType.EVENT,
      entityId: eventId,
      metadata: payload,
      ingestionKey: this.pickIngestionKey(payload, AnalyticsEventType.EVENT_REGISTERED, eventId),
      aggregateMutations,
    });
  }

  @OnEvent(AnalyticsEventType.EVENT_EXTERNAL_REGISTRATION_CLICKED, {
    async: true,
    promisify: true,
    suppressErrors: true,
  })
  async handleEventExternalRegistrationClicked(payload: Record<string, unknown>): Promise<void> {
    const eventId = String(payload.eventId ?? '');
    if (!eventId) return;

    const userId = this.optionalString(payload.userId);
    const organizationId = this.optionalString(payload.organizationId);

    const aggregateMutations: AnalyticsAggregateMutation[] = [
      {
        kind: 'event',
        eventId,
        counter: 'external_registration_clicks',
        delta: 1,
      },
    ];

    await this.safeIngest({
      eventType: AnalyticsEventType.EVENT_EXTERNAL_REGISTRATION_CLICKED,
      userId,
      organizationId,
      entityType: AnalyticsEntityType.EVENT,
      entityId: eventId,
      metadata: payload,
      ingestionKey: this.pickIngestionKey(payload, AnalyticsEventType.EVENT_EXTERNAL_REGISTRATION_CLICKED, eventId),
      aggregateMutations,
    });
  }

  @OnEvent(AnalyticsEventType.NOTIFICATION_READ, {
    async: true,
    promisify: true,
    suppressErrors: true,
  })
  async handleNotificationRead(payload: Record<string, unknown>): Promise<void> {
    const userId = this.optionalString(payload.userId);
    if (!userId) {
      return;
    }

    const readCount = Number(payload.count ?? 1);
    const notificationId = this.optionalString(payload.id);

    await this.safeIngest({
      eventType: AnalyticsEventType.NOTIFICATION_READ,
      userId,
      organizationId: null,
      entityType: AnalyticsEntityType.SYSTEM,
      entityId: notificationId ?? null,
      metadata: payload,
      ingestionKey: this.pickIngestionKey(payload, AnalyticsEventType.NOTIFICATION_READ, userId),
      aggregateMutations: [
        {
          kind: 'user',
          userId,
          clicksDelta: Math.max(readCount, 1),
          lastActiveAt: new Date(),
        },
      ],
    });
  }

  async getCampaignDashboard(campaignId: string, userId: string, query: AnalyticsDateRangeQueryDto) {
    const organizationId = await this.analyticsRepository.getCampaignOrganizationId(campaignId);
    if (!organizationId) {
      throw new AnalyticsResourceNotFoundException('Campaign', campaignId);
    }

    await this.assertOrgAccess(userId, organizationId);
    const dateRange = this.parseDateRange(query);
    const pagination = this.parsePagination(query);

    const [metrics, events] = await Promise.all([
      this.analyticsRepository.getCampaignMetrics(campaignId),
      this.analyticsRepository.listCampaignEvents(campaignId, dateRange, pagination),
    ]);

    return {
      campaignId,
      impressions: metrics.impressions,
      clicks: metrics.clicks,
      videoCompletions: metrics.videoCompletions,
      spend: metrics.spend,
      lastUpdatedAt: metrics.lastUpdatedAt.toISOString(),
      events: events.rows.map(this.toEventRowDto),
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total: events.total,
        totalPages: Math.ceil(events.total / pagination.limit),
      },
    };
  }

  async getJobDashboard(jobId: string, userId: string, query: AnalyticsDateRangeQueryDto) {
    const organizationId = await this.analyticsRepository.getJobOrganizationId(jobId);
    if (!organizationId) {
      throw new AnalyticsResourceNotFoundException('Job', jobId);
    }

    await this.assertOrgAccess(userId, organizationId);
    const dateRange = this.parseDateRange(query);
    const pagination = this.parsePagination(query);

    const [metrics, events] = await Promise.all([
      this.analyticsRepository.getJobMetrics(jobId),
      this.analyticsRepository.listJobEvents(jobId, dateRange, pagination),
    ]);

    return {
      jobId,
      views: metrics.views,
      applications: metrics.applications,
      lastUpdatedAt: metrics.lastUpdatedAt.toISOString(),
      events: events.rows.map(this.toEventRowDto),
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total: events.total,
        totalPages: Math.ceil(events.total / pagination.limit),
      },
    };
  }

  async getEventDashboard(eventId: string, userId: string, query: AnalyticsDateRangeQueryDto) {
    const organizationId = await this.analyticsRepository.getEventOrganizationId(eventId);
    if (!organizationId) {
      throw new AnalyticsResourceNotFoundException('Event', eventId);
    }

    await this.assertOrgAccess(userId, organizationId);
    const dateRange = this.parseDateRange(query);
    const pagination = this.parsePagination(query);

    const [metrics, events] = await Promise.all([
      this.analyticsRepository.getEventMetrics(eventId),
      this.analyticsRepository.listEventEvents(eventId, dateRange, pagination),
    ]);

    return {
      eventId,
      views: metrics.views,
      registrations: metrics.registrations,
      externalRegistrationClicks: metrics.externalRegistrationClicks,
      lastUpdatedAt: metrics.lastUpdatedAt.toISOString(),
      events: events.rows.map(this.toEventRowDto),
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total: events.total,
        totalPages: Math.ceil(events.total / pagination.limit),
      },
    };
  }

  async getEmployerOverview(organizationId: string, userId: string, query: AnalyticsDateRangeQueryDto) {
    await this.assertOrgAccess(userId, organizationId);

    const dateRange = this.parseDateRange(query);
    const pagination = this.parsePagination(query);
    const result = await this.analyticsRepository.getEmployerOverview(organizationId, dateRange, pagination);

    return {
      organizationId,
      ...result.summary,
      recentEvents: result.rows.map(this.toEventRowDto),
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total: result.total,
        totalPages: Math.ceil(result.total / pagination.limit),
      },
    };
  }

  async getPlatformSummary(query: AnalyticsDateRangeQueryDto) {
    const dateRange = this.parseDateRange(query);
    const pagination = this.parsePagination(query);
    const result = await this.analyticsRepository.getPlatformSummary(dateRange, pagination);

    return {
      ...result.summary,
      recentEvents: result.rows.map(this.toEventRowDto),
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total: result.total,
        totalPages: Math.ceil(result.total / pagination.limit),
      },
    };
  }

  async getJobEngagementMap(jobIds: string[]): Promise<Record<string, number>> {
    const metrics = await this.analyticsRepository.getJobMetricsMap(jobIds);
    const result: Record<string, number> = {};
    for (const [jobId, value] of Object.entries(metrics)) {
      result[jobId] = value.views + (value.applications * 2);
    }
    return result;
  }

  async getEventEngagementMap(eventIds: string[]): Promise<Record<string, number>> {
    const metrics = await this.analyticsRepository.getEventMetricsMap(eventIds);
    const result: Record<string, number> = {};
    for (const [eventId, value] of Object.entries(metrics)) {
      result[eventId] = value.views + (value.registrations * 3);
    }
    return result;
  }

  async getCampaignEngagementMap(campaignIds: string[]): Promise<Record<string, number>> {
    const metrics = await this.analyticsRepository.getCampaignMetricsMap(campaignIds);
    const result: Record<string, number> = {};
    for (const [campaignId, value] of Object.entries(metrics)) {
      result[campaignId] = value.clicks + Math.floor(value.impressions / 100);
    }
    return result;
  }

  async getViewedFeedIds(userId: string): Promise<Set<string>> {
    return this.analyticsRepository.getViewedFeedIds(userId);
  }

  async markFeedItemsServed(
    userId: string,
    items: Array<{ entityId: string; entityType: string }>,
  ): Promise<void> {
    return this.analyticsRepository.markFeedItemsServed(userId, items);
  }

  async markFeedItemsViewed(
    userId: string,
    items: Array<{ entityId: string; entityType: string }>,
  ): Promise<void> {
    return this.analyticsRepository.markFeedItemsViewed(userId, items);
  }

  async clearUserSeenFeeds(userId: string, entityType?: 'JOB' | 'EVENT'): Promise<void> {
    return this.analyticsRepository.clearUserSeenFeeds(userId, entityType);
  }

  private async safeIngest(input: Parameters<AnalyticsRepository['ingestDomainEvent']>[0]): Promise<void> {
    try {
      await this.analyticsRepository.ingestDomainEvent(input);
    } catch (error) {
      this.logger.error(`Failed to ingest analytics event ${input.eventType}: ${this.stringifyError(error)}`);
    }
  }

  private async assertOrgAccess(userId: string, organizationId: string): Promise<void> {
    const role = await this.employerUsersService.getUserRole(userId, organizationId);
    if (!role) {
      throw new AnalyticsAccessDeniedException();
    }
  }

  private parseDateRange(query: AnalyticsDateRangeQueryDto): DateRangeFilter {
    return {
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
    };
  }

  private parsePagination(query: AnalyticsDateRangeQueryDto): PaginationFilter {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    return { page, limit };
  }

  private toEventRowDto(row: {
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
  }) {
    return {
      id: row.id,
      eventType: row.event_type,
      userId: row.user_id,
      organizationId: row.organization_id,
      entityType: row.entity_type,
      entityId: row.entity_id,
      metadata: row.metadata ?? {},
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
      createdAt: row.created_at.toISOString(),
    };
  }

  private pickIngestionKey(payload: Record<string, any>, eventType: string, fallbackId: string): string | null {
    const explicit = this.optionalString(payload.idempotencyKey) ?? this.optionalString(payload.eventId);
    const sourceId =
      explicit ??
      this.optionalString(payload.id) ??
      this.optionalString((payload as { registration?: { id?: string } }).registration?.id) ??
      this.optionalString((payload as { applicationId?: string }).applicationId) ??
      null;

    if (!sourceId) {
      return null;
    }

    return `${eventType}:${fallbackId}:${sourceId}`;
  }

  private optionalString(value: unknown): string | null {
    if (typeof value === 'string' && value.trim().length > 0) {
      return value;
    }

    return null;
  }

  private stringifyError(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    return String(error);
  }
}
