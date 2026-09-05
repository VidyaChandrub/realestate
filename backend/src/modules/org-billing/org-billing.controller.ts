import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OrgApprovedGuard } from '../../common/guards/org-approved.guard';
import { PermissionGuard } from '../../common/guards/permission.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import type { JwtPayload } from '../../common/types/jwt-payload.interface';
import { OrgBillingService } from './org-billing.service';
import { ChangePlanDto } from './dto/change-plan.dto';

@UseGuards(JwtAuthGuard, OrgApprovedGuard, PermissionGuard)
@Controller('org/billing')
export class OrgBillingController {
  constructor(private readonly service: OrgBillingService) {}

  @RequirePermission('billing', 'view')
  @Get()
  get(@CurrentUser() user: JwtPayload) {
    return this.service.get(user.orgId as string);
  }

  @RequirePermission('billing', 'view')
  @Get('invoices')
  listInvoices(@CurrentUser() user: JwtPayload) {
    return this.service.listInvoices(user.orgId as string);
  }

  @RequirePermission('billing', 'edit')
  @Patch('plan')
  changePlan(@CurrentUser() user: JwtPayload, @Body() dto: ChangePlanDto) {
    return this.service.changePlan(user.orgId as string, dto);
  }
}
