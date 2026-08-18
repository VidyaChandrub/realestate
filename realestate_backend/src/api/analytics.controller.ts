import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/roles.guard';
import { AnalyticsDateRangeQueryDto } from '../analytics/dto/analytics-date-range-query.dto';
import {
  CampaignAnalyticsResponseDto,
  EventAnalyticsResponseDto,
  EmployerOverviewResponseDto,
  JobAnalyticsResponseDto,
  PlatformSummaryResponseDto,
} from '../analytics/dto/analytics-dashboard-response.dto';
import { AnalyticsService } from '../analytics/services/analytics.service';

@ApiTags('Analytics')
@Controller('api/v1/analytics')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @ApiOperation({ summary: 'Get campaign analytics (organization member only)' })
  @ApiResponse({ status: 200, type: CampaignAnalyticsResponseDto })
  @Get('campaign/:campaignId')
  async getCampaignAnalytics(
    @Param('campaignId', ParseUUIDPipe) campaignId: string,
    @Query() query: AnalyticsDateRangeQueryDto,
    @Request() req: { user: { userId: string } },
  ): Promise<CampaignAnalyticsResponseDto> {
    return this.analyticsService.getCampaignDashboard(campaignId, req.user.userId, query);
  }

  @ApiOperation({ summary: 'Get property analytics (organization member only)' })
  @ApiResponse({ status: 200, type: JobAnalyticsResponseDto })
  @Get('job/:jobId')
  async getJobAnalytics(
    @Param('jobId', ParseUUIDPipe) jobId: string,
    @Query() query: AnalyticsDateRangeQueryDto,
    @Request() req: { user: { userId: string } },
  ): Promise<JobAnalyticsResponseDto> {
    return this.analyticsService.getJobDashboard(jobId, req.user.userId, query);
  }

  @ApiOperation({ summary: 'Get event analytics (organization member only)' })
  @ApiResponse({ status: 200, type: EventAnalyticsResponseDto })
  @Get('event/:eventId')
  async getEventAnalytics(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Query() query: AnalyticsDateRangeQueryDto,
    @Request() req: { user: { userId: string } },
  ): Promise<EventAnalyticsResponseDto> {
    return this.analyticsService.getEventDashboard(eventId, req.user.userId, query);
  }

  @ApiOperation({ summary: 'Get organization analytics overview (organization member only)' })
  @ApiResponse({ status: 200, type: EmployerOverviewResponseDto })
  @Get('employer/overview')
  async getEmployerOverview(
    @Query('organizationId', ParseUUIDPipe) organizationId: string,
    @Query() query: AnalyticsDateRangeQueryDto,
    @Request() req: { user: { userId: string } },
  ): Promise<EmployerOverviewResponseDto> {
    return this.analyticsService.getEmployerOverview(organizationId, req.user.userId, query);
  }

  @ApiOperation({ summary: 'Get platform analytics summary (admin only)' })
  @ApiResponse({ status: 200, type: PlatformSummaryResponseDto })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Get('platform/summary')
  async getPlatformSummary(@Query() query: AnalyticsDateRangeQueryDto): Promise<PlatformSummaryResponseDto> {
    return this.analyticsService.getPlatformSummary(query);
  }
}
