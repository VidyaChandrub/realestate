import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OrgApprovedGuard } from '../../common/guards/org-approved.guard';
import { PermissionGuard } from '../../common/guards/permission.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { SETTINGS_ACTIONS } from '../../common/utils/permissions.util';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/types/jwt-payload.interface';
import { OrgLeadStageDisplayService } from './org-lead-stage-display.service';
import { UpdateLeadStageDisplayDto } from './dto/update-lead-stage-display.dto';

// Per-org DISPLAY labels/colours for the fixed lead pipeline stages. orgId is
// always taken from the JWT, never a param, so one org can't read or change
// another's. Reading is open to any approved org member (the labels render on
// the leads inbox, lead detail, project-leads and sales-agent pages, which
// team members use). Changing them needs Settings > Edit pipeline — held for
// the org admin too, to what Super Admin granted.
@UseGuards(JwtAuthGuard, OrgApprovedGuard, PermissionGuard)
@Controller('org/lead-stage-displays')
export class OrgLeadStageDisplayController {
  constructor(private readonly service: OrgLeadStageDisplayService) {}

  @Get()
  list(@CurrentUser() user: JwtPayload) {
    return this.service.listMerged(user.orgId as string);
  }

  @RequirePermission('settings', SETTINGS_ACTIONS.editPipeline, {
    enforceForOrgAdmin: true,
  })
  @Put(':status')
  update(
    @CurrentUser() user: JwtPayload,
    @Param('status') status: string,
    @Body() dto: UpdateLeadStageDisplayDto,
  ) {
    return this.service.upsert(user.orgId as string, status, dto);
  }
}
