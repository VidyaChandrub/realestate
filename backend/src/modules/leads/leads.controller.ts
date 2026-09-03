import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OrgAdminGuard } from '../../common/guards/org-admin.guard';
import { OrgApprovedGuard } from '../../common/guards/org-approved.guard';
import { PermissionGuard } from '../../common/guards/permission.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import type { JwtPayload } from '../../common/types/jwt-payload.interface';
import { LeadsService } from './leads.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { AssignLeadDto } from './dto/assign-lead.dto';
import { ListLeadsQueryDto } from './dto/list-leads-query.dto';
import { CreateLeadNoteDto } from './dto/create-lead-note.dto';
import { UpdateLeadNextActionDto } from './dto/update-lead-next-action.dto';

@Controller('org/leads')
export class LeadsController {
  constructor(private readonly service: LeadsService) {}

  /**
   * Public lead capture. Intentionally unguarded: the published form is filled
   * by anonymous visitors. orgId is derived from landingPageId server-side.
   */
  @Post()
  createPublic(@Body() dto: CreateLeadDto) {
    return this.service.createFromPublic(dto);
  }

  /**
   * Lead inbox. Open to any approved org member; the service scopes the rows
   * by role (admin = all, manager/sales = assigned/project-scoped only).
   */
  @UseGuards(JwtAuthGuard, OrgApprovedGuard, PermissionGuard)
  @RequirePermission('crm', 'view')
  @Get()
  list(
    @CurrentUser() user: JwtPayload,
    @Query() query: ListLeadsQueryDto,
  ) {
    return this.service.list(user.orgId as string, user, query);
  }

  /**
   * Admin-only: org members eligible as assignees (manager/sales) for the
   * assignment UI. Must be before :id to avoid route collision.
   */
  @UseGuards(JwtAuthGuard, OrgAdminGuard, OrgApprovedGuard, PermissionGuard)
  @RequirePermission('crm', 'edit')
  @Get('assignable')
  listAssignableUsers(@CurrentUser() user: JwtPayload) {
    return this.service.listAssignableUsers(user.orgId as string);
  }

  @UseGuards(JwtAuthGuard, OrgApprovedGuard, PermissionGuard)
  @RequirePermission('crm', 'view')
  @Get(':id')
  getById(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ) {
    return this.service.getById(user.orgId as string, id, user);
  }

  @UseGuards(JwtAuthGuard, OrgApprovedGuard, PermissionGuard)
  @RequirePermission('crm', 'add')
  @Post(':id/notes')
  addNote(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: CreateLeadNoteDto,
  ) {
    return this.service.addNote(user.orgId as string, id, user, dto);
  }

  @UseGuards(JwtAuthGuard, OrgApprovedGuard, PermissionGuard)
  @RequirePermission('crm', 'edit')
  @Patch(':id/next-action')
  updateNextAction(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateLeadNextActionDto,
  ) {
    return this.service.updateNextAction(user.orgId as string, id, user, dto);
  }

  /**
   * Admin-only: (re)assign a lead to an org member and/or move its stage.
   */
  @UseGuards(JwtAuthGuard, OrgAdminGuard, OrgApprovedGuard, PermissionGuard)
  @RequirePermission('crm', 'edit')
  @Patch(':id/assign')
  assign(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: AssignLeadDto,
  ) {
    return this.service.assign(user.orgId as string, id, dto);
  }
}
