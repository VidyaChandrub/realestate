import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OrgApprovedGuard } from '../../common/guards/org-approved.guard';
import { PermissionGuard } from '../../common/guards/permission.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/types/jwt-payload.interface';
import { OrgDashboardService } from './org-dashboard.service';
import { OrgDashboardQueryDto } from './dto/org-dashboard-query.dto';

@UseGuards(JwtAuthGuard, OrgApprovedGuard, PermissionGuard)
@Controller('org/dashboard')
export class OrgDashboardController {
  constructor(private readonly service: OrgDashboardService) {}

  @RequirePermission('dashboard', 'view')
  @Get()
  getDashboard(
    @CurrentUser() actor: JwtPayload,
    @Query() query: OrgDashboardQueryDto,
  ) {
    return this.service.getDashboard(actor.orgId as string, actor, query);
  }
}
