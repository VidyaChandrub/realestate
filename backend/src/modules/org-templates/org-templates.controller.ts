import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OrgAdminGuard } from '../../common/guards/org-admin.guard';
import { OrgTemplatesService } from './org-templates.service';
import { ListOrgTemplatesQueryDto } from './dto/list-org-templates-query.dto';

// Read-only — org admins browse the shared free template library. No
// create/update/delete: templates are the shared platform library, editing
// happens later on an org-owned copy, not here.
@UseGuards(JwtAuthGuard, OrgAdminGuard)
@Controller('org/templates')
export class OrgTemplatesController {
  constructor(private readonly orgTemplatesService: OrgTemplatesService) {}

  @Get()
  list(@Query() query: ListOrgTemplatesQueryDto) {
    return this.orgTemplatesService.list(query);
  }

  @Get(':id')
  getById(@Param('id') id: string) {
    return this.orgTemplatesService.getById(id);
  }
}
