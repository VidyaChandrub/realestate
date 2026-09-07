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
import { AdminRolesService } from './admin-roles.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { UpdateRolePermissionsDto } from './dto/update-role-permissions.dto';

@UseGuards(JwtAuthGuard, SuperAdminGuard)
@Controller('admin/roles')
export class AdminRolesController {
  constructor(private readonly adminRolesService: AdminRolesService) {}

  @Get()
  list() {
    return this.adminRolesService.listOrgRoles();
  }

  @Post()
  create(@Body() dto: CreateRoleDto) {
    return this.adminRolesService.createOrgRole(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateRoleDto) {
    return this.adminRolesService.updateOrgRole(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.adminRolesService.removeOrgRole(id);
  }

  @Get(':id/permissions')
  getPermissions(@Param('id') id: string) {
    return this.adminRolesService.getOrgRolePermissions(id);
  }

  @Put(':id/permissions')
  updatePermissions(
    @Param('id') id: string,
    @Body() dto: UpdateRolePermissionsDto,
  ) {
    return this.adminRolesService.updateOrgRolePermissions(id, dto);
  }
}
