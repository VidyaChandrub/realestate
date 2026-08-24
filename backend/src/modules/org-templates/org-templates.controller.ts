import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OrgAdminGuard } from '../../common/guards/org-admin.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/types/jwt-payload.interface';
import { OrgTemplatesService } from './org-templates.service';
import { ListOrgTemplatesQueryDto } from './dto/list-org-templates-query.dto';

// Read-only — org admins browse assigned templates based on package.
// If organisation has package assignments, only those are visible.
@UseGuards(JwtAuthGuard, OrgAdminGuard)
@Controller('org/templates')
export class OrgTemplatesController {
  constructor(private readonly orgTemplatesService: OrgTemplatesService) {}

  @Get()
  list(@Query() query: ListOrgTemplatesQueryDto, @CurrentUser() user: JwtPayload) {
    return this.orgTemplatesService.list(query, user.orgId);
  }

  @Get(':id')
  getById(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.orgTemplatesService.getById(id, user.orgId);
  }
}
