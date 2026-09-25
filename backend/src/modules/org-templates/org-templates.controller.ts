import { Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OrgApprovedGuard } from '../../common/guards/org-approved.guard';
import { PermissionGuard } from '../../common/guards/permission.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/types/jwt-payload.interface';
import { OrgTemplatesService } from './org-templates.service';
import { ListOrgTemplatesQueryDto } from './dto/list-org-templates-query.dto';

// Browse and manage assigned Super Admin templates based on package. Routes
// map to the Templates pills; the org `admin` is held to what Super Admin
// granted the Admin role (`enforceForOrgAdmin`).
const ENFORCE = { enforceForOrgAdmin: true } as const;

@UseGuards(JwtAuthGuard, OrgApprovedGuard, PermissionGuard)
@Controller('org/templates')
export class OrgTemplatesController {
  constructor(private readonly orgTemplatesService: OrgTemplatesService) {}

  @RequirePermission('templates', 'view', ENFORCE)
  @Get()
  list(@Query() query: ListOrgTemplatesQueryDto, @CurrentUser() user: JwtPayload) {
    return this.orgTemplatesService.list(query, user.orgId);
  }

  @RequirePermission('templates', 'view', ENFORCE)
  @Get('available')
  getAvailable(@CurrentUser() user: JwtPayload) {
    return this.orgTemplatesService.getAvailable(user.orgId!);
  }

  // Templates > Add Template from Plan.
  @RequirePermission('templates', 'add', ENFORCE)
  @Post(':id/assign')
  assignTemplate(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.orgTemplatesService.assignTemplate(id, user.orgId!, user.sub);
  }

  // Templates > Remove.
  @RequirePermission('templates', 'delete', ENFORCE)
  @Delete(':id/assign')
  unassignTemplate(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.orgTemplatesService.unassignTemplate(id, user.orgId!);
  }

  @RequirePermission('templates', 'view', ENFORCE)
  @Get(':id')
  getById(@Param('id') id: string) {
    return this.orgTemplatesService.getById(id);
  }
}

