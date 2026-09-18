import {
  Controller,
  Get,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { SuperAdminGuard } from '../../common/guards/super-admin.guard';
import { OrgReportsService } from './org-reports.service';
import { GetReportsFilterDto } from './dto/get-reports-filter.dto';

@UseGuards(JwtAuthGuard, SuperAdminGuard)
@Controller('admin/reports')
export class AdminReportsController {
  constructor(private readonly reportsService: OrgReportsService) {}

  @Get('summary')
  getSummary(@Query() dto: GetReportsFilterDto) {
    return this.reportsService.getSummary(dto.orgId || null, dto);
  }

  @Get('lead-sources')
  getLeadSources(@Query() dto: GetReportsFilterDto) {
    return this.reportsService.getLeadSources(dto.orgId || null, dto);
  }

  @Get('funnel')
  getFunnel(@Query() dto: GetReportsFilterDto) {
    return this.reportsService.getFunnel(dto.orgId || null, dto);
  }

  @Get('agent-performance')
  getAgentPerformance(@Query() dto: GetReportsFilterDto) {
    return this.reportsService.getAgentPerformance(dto.orgId || null, dto);
  }

  @Get('projects')
  getProjectAnalytics(@Query() dto: GetReportsFilterDto) {
    return this.reportsService.getProjectAnalytics(dto.orgId || null, dto);
  }

  @Get('export/csv')
  async exportCsv(
    @Query() dto: GetReportsFilterDto,
    @Query('type') type: string,
    @Res() res: any,
  ) {
    const csvContent = await this.reportsService.exportCsv(
      dto.orgId || null,
      dto,
      dto.type || type || 'leads',
    );

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="admin-report-${type || 'leads'}-${Date.now()}.csv"`,
    );
    res.send(csvContent);
  }
}
