import {
  Body,
  Controller,
  Get,
  HttpCode,
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
import { OrgUsersService } from './org-users.service';
import { CreateOrgUserDto } from './dto/create-org-user.dto';
import { UpdateOrgUserDto } from './dto/update-org-user.dto';
import { UpdateOrgUserStatusDto } from './dto/update-org-user-status.dto';
import { ListOrgUsersQueryDto } from './dto/list-org-users-query.dto';

// orgId always comes from the JWT, never a client-supplied param — core
// multi-tenant isolation rule for every /org/* endpoint. The org-wide `admin`
// role always passes the permission guard (unrestricted); a manager/sales who
// has been granted `users` access can also manage members.
@UseGuards(JwtAuthGuard, OrgApprovedGuard, PermissionGuard)
@Controller('org/users')
export class OrgUsersController {
  constructor(private readonly orgUsersService: OrgUsersService) {}

  @RequirePermission('users', 'view')
  @Get()
  list(@CurrentUser() actor: JwtPayload, @Query() query: ListOrgUsersQueryDto) {
    return this.orgUsersService.list(actor.orgId as string, query);
  }

  @RequirePermission('users', 'add')
  @Post()
  create(@CurrentUser() actor: JwtPayload, @Body() dto: CreateOrgUserDto) {
    return this.orgUsersService.create(actor.orgId as string, dto);
  }

  @RequirePermission('users', 'view')
  @Get(':id')
  getById(@CurrentUser() actor: JwtPayload, @Param('id') id: string) {
    return this.orgUsersService.getById(actor.orgId as string, id);
  }

  @RequirePermission('users', 'edit')
  @Patch(':id')
  update(
    @CurrentUser() actor: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateOrgUserDto,
  ) {
    return this.orgUsersService.update(actor.orgId as string, id, dto);
  }

  @RequirePermission('users', 'edit')
  @Patch(':id/status')
  updateStatus(
    @CurrentUser() actor: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateOrgUserStatusDto,
  ) {
    return this.orgUsersService.updateStatus(
      actor.orgId as string,
      id,
      actor.sub,
      dto,
    );
  }

  @RequirePermission('users', 'edit')
  @Post(':id/resend-invite')
  @HttpCode(200)
  resendInvite(@CurrentUser() actor: JwtPayload, @Param('id') id: string) {
    return this.orgUsersService.resendInvite(actor.orgId as string, id);
  }
}
