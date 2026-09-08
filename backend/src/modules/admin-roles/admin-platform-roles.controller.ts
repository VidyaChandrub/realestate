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
import { SuperAdminGuard } from '../../common/guards/super-admin.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/types/jwt-payload.interface';
import { AdminRolesService } from './admin-roles.service';
import { CreatePlatformRoleDto } from './dto/create-platform-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { UpdatePlatformRolePermissionsDto } from './dto/update-platform-role-permissions.dto';

@UseGuards(JwtAuthGuard, SuperAdminGuard)
@Controller('admin/platform-roles')
export class AdminPlatformRolesController {
  constructor(private readonly adminRolesService: AdminRolesService) {}

  @Get('me')
  me(@CurrentUser() actor: JwtPayload) {
    return this.adminRolesService.effectivePlatformPermissions(actor.sub);
  }

  @Get()
  list() {
    return this.adminRolesService.listPlatformRoles();
  }

  @Post()
  create(@Body() dto: CreatePlatformRoleDto) {
    return this.adminRolesService.createPlatformRole(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateRoleDto) {
    return this.adminRolesService.updatePlatformRole(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.adminRolesService.removePlatformRole(id);
  }

  @Get(':id/permissions')
  getPermissions(@Param('id') id: string) {
    return this.adminRolesService.getPlatformRolePermissions(id);
  }

  @Put(':id/permissions')
  updatePermissions(
    @Param('id') id: string,
    @Body() dto: UpdatePlatformRolePermissionsDto,
  ) {
    return this.adminRolesService.updatePlatformRolePermissions(id, dto);
  }
}
