import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OrgApprovedGuard } from '../../common/guards/org-approved.guard';
import { OrgAdminGuard } from '../../common/guards/org-admin.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/types/jwt-payload.interface';
import { OrgTeamsService } from './org-teams.service';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
import { SetTeamMembersDto } from './dto/set-team-members.dto';
import { SetTeamProjectsDto } from './dto/set-team-projects.dto';

// Deliberately guarded by OrgAdminGuard only — NOT PermissionGuard /
// @RequirePermission. Teams has no dependency on the org-wide RBAC module
// another developer owns; every route here is admin-only, full stop. Every
// route still derives orgId from the JWT, never a client param, so one org
// can never read or touch another org's teams.
@UseGuards(JwtAuthGuard, OrgApprovedGuard, OrgAdminGuard)
@Controller('org/teams')
export class OrgTeamsController {
  constructor(private readonly service: OrgTeamsService) {}

  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateTeamDto) {
    return this.service.create(user.orgId as string, dto);
  }

  @Get()
  list(@CurrentUser() user: JwtPayload) {
    return this.service.list(user.orgId as string);
  }

  @Get(':id')
  getById(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.service.getById(user.orgId as string, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateTeamDto,
  ) {
    return this.service.update(user.orgId as string, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.service.remove(user.orgId as string, id);
  }

  @Get(':id/members')
  listMembers(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.service.listMembers(user.orgId as string, id);
  }

  @Put(':id/members')
  setMembers(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: SetTeamMembersDto,
  ) {
    return this.service.setMembers(user.orgId as string, id, dto.members);
  }

  @Get(':id/projects')
  listProjects(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.service.listProjects(user.orgId as string, id);
  }

  @Put(':id/projects')
  setProjects(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: SetTeamProjectsDto,
  ) {
    return this.service.setProjects(user.orgId as string, id, dto.projectIds);
  }
}
