import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OrgAdminGuard } from '../../common/guards/org-admin.guard';
import { OrgApprovedGuard } from '../../common/guards/org-approved.guard';
import { PermissionGuard } from '../../common/guards/permission.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import type { JwtPayload } from '../../common/types/jwt-payload.interface';
import { SalesAgentsService } from './sales-agents.service';

@Controller('org/sales-agents')
export class SalesAgentsController {
  constructor(private readonly service: SalesAgentsService) {}

  /**
   * Org-admin team dashboard: every sales agent in the org with their live
   * lead pipeline, closures, conversion and booked revenue.
   */
  @UseGuards(JwtAuthGuard, OrgAdminGuard, OrgApprovedGuard, PermissionGuard)
  @RequirePermission('sales_agents', 'view')
  @Get()
  list(@CurrentUser() user: JwtPayload) {
    return this.service.list(user.orgId);
  }

  /**
   * Single-agent dashboard. Open to any approved org member for their own
   * profile; admins may open any agent. Access is enforced in the service.
   */
  @UseGuards(JwtAuthGuard, OrgApprovedGuard, PermissionGuard)
  @RequirePermission('sales_agents', 'view')
  @Get(':id')
  detail(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.service.detail(user.orgId, user, id);
  }
}
