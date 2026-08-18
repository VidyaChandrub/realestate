import { ApiProperty } from '@nestjs/swagger';
import { AnalyticsEventRowDto } from './analytics-event-row.dto';

export class PaginationMetaDto {
  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  total!: number;

  @ApiProperty()
  totalPages!: number;
}

export class CampaignAnalyticsResponseDto {
  @ApiProperty()
  campaignId!: string;

  @ApiProperty()
  impressions!: number;

  @ApiProperty()
  clicks!: number;

  @ApiProperty()
  videoCompletions!: number;

  @ApiProperty()
  spend!: number;

  @ApiProperty()
  lastUpdatedAt!: string;

  @ApiProperty({ type: [AnalyticsEventRowDto] })
  events!: AnalyticsEventRowDto[];

  @ApiProperty({ type: PaginationMetaDto })
  pagination!: PaginationMetaDto;
}

export class JobAnalyticsResponseDto {
  @ApiProperty()
  jobId!: string;

  @ApiProperty()
  views!: number;

  @ApiProperty()
  applications!: number;

  @ApiProperty()
  lastUpdatedAt!: string;

  @ApiProperty({ type: [AnalyticsEventRowDto] })
  events!: AnalyticsEventRowDto[];

  @ApiProperty({ type: PaginationMetaDto })
  pagination!: PaginationMetaDto;
}

export class EventAnalyticsResponseDto {
  @ApiProperty()
  eventId!: string;

  @ApiProperty()
  views!: number;

  @ApiProperty()
  registrations!: number;

  @ApiProperty()
  externalRegistrationClicks!: number;

  @ApiProperty()
  lastUpdatedAt!: string;

  @ApiProperty({ type: [AnalyticsEventRowDto] })
  events!: AnalyticsEventRowDto[];

  @ApiProperty({ type: PaginationMetaDto })
  pagination!: PaginationMetaDto;
}

export class EmployerOverviewResponseDto {
  @ApiProperty()
  organizationId!: string;

  @ApiProperty()
  totalEvents!: number;

  @ApiProperty()
  totalClicks!: number;

  @ApiProperty()
  totalApplications!: number;

  @ApiProperty()
  totalRegistrations!: number;

  @ApiProperty()
  activeUsers!: number;

  @ApiProperty({ type: [AnalyticsEventRowDto] })
  recentEvents!: AnalyticsEventRowDto[];

  @ApiProperty({ type: PaginationMetaDto })
  pagination!: PaginationMetaDto;
}

export class PlatformSummaryResponseDto {
  @ApiProperty()
  totalEvents!: number;

  @ApiProperty()
  totalClicks!: number;

  @ApiProperty()
  totalApplications!: number;

  @ApiProperty()
  totalRegistrations!: number;

  @ApiProperty()
  activeUsers!: number;

  @ApiProperty({ type: [AnalyticsEventRowDto] })
  recentEvents!: AnalyticsEventRowDto[];

  @ApiProperty({ type: PaginationMetaDto })
  pagination!: PaginationMetaDto;
}
