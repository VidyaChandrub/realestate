import { AnalyticsEntityType } from './analytics.constants';

export type CampaignMetricCounter = 'impressions' | 'clicks' | 'videoCompletions';
export type JobMetricCounter = 'views' | 'applications';
export type EventMetricCounter = 'views' | 'registrations' | 'external_registration_clicks';

export type AnalyticsAggregateMutation =
  | {
      kind: 'campaign';
      campaignId: string;
      counter: CampaignMetricCounter;
      delta: number;
      spendDelta?: number;
    }
  | {
      kind: 'job';
      jobId: string;
      counter: JobMetricCounter;
      delta: number;
    }
  | {
      kind: 'event';
      eventId: string;
      counter: EventMetricCounter;
      delta: number;
    }
  | {
      kind: 'user';
      userId: string;
      sessionsDelta?: number;
      clicksDelta?: number;
      applicationsDelta?: number;
      lastActiveAt?: Date;
    };

export interface AnalyticsIngestionInput {
  eventType: string;
  userId?: string | null;
  organizationId?: string | null;
  entityType: AnalyticsEntityType;
  entityId?: string | null;
  metadata: Record<string, unknown>;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt?: Date;
  ingestionKey?: string | null;
  aggregateMutations: AnalyticsAggregateMutation[];
}

export interface DateRangeFilter {
  startDate?: Date;
  endDate?: Date;
}

export interface PaginationFilter {
  page: number;
  limit: number;
}
