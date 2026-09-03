import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Patch,
  Put,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OrgAdminGuard } from '../../common/guards/org-admin.guard';
import { OrgApprovedGuard } from '../../common/guards/org-approved.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/types/jwt-payload.interface';
import { OrgPermissionsService } from './org-permissions.service';
import { UpdateRolePermissionsDto } from './dto/update-role-permissions.dto';
import { SetUserPermissionsDto } from './dto/set-user-permissions.dto';
import { CreateOrgRoleDto } from './dto/create-org-role.dto';
import { UpdateOrgRoleDto } from './dto/update-org-role.dto';

// Page/action permission configuration. The org admin manages what each role
// (and optionally each individual user / sales agent) can view/add/edit/delete
///approve per page. Every route derives orgId from the JWT — never from a
// client-supplied param — so one org can never touch another org's config.
@Controller('org/permissions')
export class OrgPermissionsController {
  constructor(private readonly service: OrgPermissionsService) {}

  /** The page/action matrix + configurable roles, for the admin UI. */
  @UseGuards(JwtAuthGuard, OrgAdminGuard, OrgApprovedGuard)
  @Get('modules')
  catalog(@CurrentUser() actor: JwtPayload) {
    return this.service.getCatalog(actor.orgId as string);
  }

  /** The caller's own effective permissions (used to gate pages/buttons). */
  @UseGuards(JwtAuthGuard, OrgApprovedGuard)
  @Get('me')
  myPermissions(@CurrentUser() actor: JwtPayload) {
    return this.service.getMyPermissions(actor.orgId as string, actor.sub);
  }

  /** This org's own custom roles (created by its Admin). */
  @UseGuards(JwtAuthGuard, OrgAdminGuard, OrgApprovedGuard)
  @Get('org-roles')
  listOrgRoles(@CurrentUser() actor: JwtPayload) {
    return this.service.listOrgRoles(actor.orgId as string);
  }

  /** Create a new custom role scoped to this org. */
  @UseGuards(JwtAuthGuard, OrgAdminGuard, OrgApprovedGuard)
  @Post('org-roles')
  createOrgRole(@CurrentUser() actor: JwtPayload, @Body() dto: CreateOrgRoleDto) {
    return this.service.createOrgRole(actor.orgId as string, dto);
  }

  /** Rename/disable one of this org's custom roles. */
  @UseGuards(JwtAuthGuard, OrgAdminGuard, OrgApprovedGuard)
  @Patch('org-roles/:roleId')
  updateOrgRole(
    @CurrentUser() actor: JwtPayload,
    @Param('roleId') roleId: string,
    @Body() dto: UpdateOrgRoleDto,
  ) {
    return this.service.updateOrgRole(actor.orgId as string, roleId, dto);
  }

  /** Delete one of this org's custom roles, if unused. */
  @UseGuards(JwtAuthGuard, OrgAdminGuard, OrgApprovedGuard)
  @Delete('org-roles/:roleId')
  removeOrgRole(@CurrentUser() actor: JwtPayload, @Param('roleId') roleId: string) {
    return this.service.removeOrgRole(actor.orgId as string, roleId);
  }

  /** Every configurable role's current permission rows for this org. */
  @UseGuards(JwtAuthGuard, OrgAdminGuard, OrgApprovedGuard)
  @Get()
  listRoles(@CurrentUser() actor: JwtPayload) {
    return this.service.listRoles(actor.orgId as string);
  }

  /** Replace one role's page/action permissions for this org. */
  @UseGuards(JwtAuthGuard, OrgAdminGuard, OrgApprovedGuard)
  @Put('roles/:roleKey')
  updateRole(
    @CurrentUser() actor: JwtPayload,
    @Param('roleKey') roleKey: string,
    @Body() dto: UpdateRolePermissionsDto,
  ) {
    return this.service.updateRole(actor.orgId as string, roleKey, dto);
  }

  /** A specific user's effective permissions (+ their overrides). */
  @UseGuards(JwtAuthGuard, OrgAdminGuard, OrgApprovedGuard)
  @Get('users/:userId')
  getUserPermissions(
    @CurrentUser() actor: JwtPayload,
    @Param('userId') userId: string,
  ) {
    return this.service.getUserPermissions(actor.orgId as string, userId);
  }

  /** Replace a specific user's (sales agent / member) permission overrides. */
  @UseGuards(JwtAuthGuard, OrgAdminGuard, OrgApprovedGuard)
  @Put('users/:userId')
  setUserPermissions(
    @CurrentUser() actor: JwtPayload,
    @Param('userId') userId: string,
    @Body() dto: SetUserPermissionsDto,
  ) {
    return this.service.setUserPermissions(
      actor.orgId as string,
      actor.sub,
      userId,
      dto,
    );
  }
}
