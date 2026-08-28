import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OrgAdminGuard } from '../../common/guards/org-admin.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/types/jwt-payload.interface';
import { OrgBillingService } from './org-billing.service';
import { ChangePlanDto } from './dto/change-plan.dto';

@UseGuards(JwtAuthGuard, OrgAdminGuard)
@Controller('org/billing')
export class OrgBillingController {
  constructor(private readonly service: OrgBillingService) {}

  @Get()
  get(@CurrentUser() user: JwtPayload) {
    return this.service.get(user.orgId as string);
  }

  @Get('invoices')
  listInvoices(@CurrentUser() user: JwtPayload) {
    return this.service.listInvoices(user.orgId as string);
  }

  @Patch('plan')
  changePlan(@CurrentUser() user: JwtPayload, @Body() dto: ChangePlanDto) {
    return this.service.changePlan(user.orgId as string, dto);
  }
}
