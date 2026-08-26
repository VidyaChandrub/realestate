import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OrgAdminGuard } from '../../common/guards/org-admin.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/types/jwt-payload.interface';
import { OrgBillingService } from './org-billing.service';

@UseGuards(JwtAuthGuard, OrgAdminGuard)
@Controller('org/billing')
export class OrgBillingController {
  constructor(private readonly service: OrgBillingService) {}

  @Get()
  get(@CurrentUser() user: JwtPayload) {
    return this.service.get(user.orgId as string);
  }
}
