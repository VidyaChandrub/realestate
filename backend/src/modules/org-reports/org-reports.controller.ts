import {
  Controller,
  Get,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OrgApprovedGuard } from '../../common/guards/org-approved.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/types/jwt-payload.interface';
import { OrgReportsService } from './org-reports.service';
import { GetReportsFilterDto } from './dto/get-reports-filter.dto';

@UseGuards(JwtAuthGuard, OrgApprovedGuard)
@Controller('org/reports')
export class OrgReportsController {
  constructor(private readonly reportsService: OrgReportsService) {}

  @Get('summary')
  getSummary(
    @CurrentUser() user: JwtPayload,
    @Query() dto: GetReportsFilterDto,
  ) {
    return this.reportsService.getSummary(user.orgId as string, dto);
  }

  @Get('lead-sources')
  getLeadSources(
    @CurrentUser() user: JwtPayload,
    @Query() dto: GetReportsFilterDto,
  ) {
    return this.reportsService.getLeadSources(user.orgId as string, dto);
  }

  @Get('funnel')
  getFunnel(
    @CurrentUser() user: JwtPayload,
    @Query() dto: GetReportsFilterDto,
  ) {
    return this.reportsService.getFunnel(user.orgId as string, dto);
  }

  @Get('agent-performance')
  getAgentPerformance(
    @CurrentUser() user: JwtPayload,
    @Query() dto: GetReportsFilterDto,
  ) {
    return this.reportsService.getAgentPerformance(user.orgId as string, dto);
  }

  @Get('projects')
  getProjectAnalytics(
    @CurrentUser() user: JwtPayload,
    @Query() dto: GetReportsFilterDto,
  ) {
    return this.reportsService.getProjectAnalytics(user.orgId as string, dto);
  }

  @Get('export/csv')
  async exportCsv(
    @CurrentUser() user: JwtPayload,
    @Query() dto: GetReportsFilterDto,
    @Query('type') type: string,
    @Res() res: any,
  ) {
    const csvContent = await this.reportsService.exportCsv(
      user.orgId as string,
      dto,
      dto.type || type || 'leads',
    );

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="report-${type || 'leads'}-${Date.now()}.csv"`,
    );
    res.send(csvContent);
  }
}
