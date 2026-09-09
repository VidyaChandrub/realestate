import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OrgApprovedGuard } from '../../common/guards/org-approved.guard';
import { OrgAdminGuard } from '../../common/guards/org-admin.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/types/jwt-payload.interface';
import { OrgLeadStageDisplayService } from './org-lead-stage-display.service';
import { UpdateLeadStageDisplayDto } from './dto/update-lead-stage-display.dto';

// Per-org DISPLAY labels/colours for the fixed lead pipeline stages. orgId is
// always taken from the JWT, never a param, so one org can't read or change
// another's. Reading is open to any approved org member (the labels render on
// the leads inbox, lead detail, project-leads and sales-agent pages, which
// team members use); only an Org Admin can change them.
@UseGuards(JwtAuthGuard, OrgApprovedGuard)
@Controller('org/lead-stage-displays')
export class OrgLeadStageDisplayController {
  constructor(private readonly service: OrgLeadStageDisplayService) {}

  @Get()
  list(@CurrentUser() user: JwtPayload) {
    return this.service.listMerged(user.orgId as string);
  }

  @UseGuards(OrgAdminGuard)
  @Put(':status')
  update(
    @CurrentUser() user: JwtPayload,
    @Param('status') status: string,
    @Body() dto: UpdateLeadStageDisplayDto,
  ) {
    return this.service.upsert(user.orgId as string, status, dto);
  }
}
