import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OrgAdminGuard } from '../../common/guards/org-admin.guard';
import { OrgApprovedGuard } from '../../common/guards/org-approved.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/types/jwt-payload.interface';
import { OrgActivityService } from './org-activity.service';
import { ListOrgActivityQueryDto } from './dto/list-org-activity-query.dto';

@UseGuards(JwtAuthGuard, OrgAdminGuard, OrgApprovedGuard)
@Controller('org/activity')
export class OrgActivityController {
  constructor(private readonly service: OrgActivityService) {}

  @Get()
  list(@CurrentUser() actor: JwtPayload, @Query() query: ListOrgActivityQueryDto) {
    return this.service.list(actor.orgId as string, query.entityId);
  }
}
