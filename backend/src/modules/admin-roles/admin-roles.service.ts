import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { UpdateRolePermissionsDto } from './dto/update-role-permissions.dto';
import {
  defaultForRole,
  PERMISSION_MODULES,
  SYSTEM_ORG_ID,
} from '../../common/utils/permissions.util';

const SYSTEM_ROLES = new Set(['super_admin', 'admin', 'manager', 'sales', 'telecaller']);

@Injectable()
export class AdminRolesService {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    return this.prisma.role.findMany({
      where: { orgId: null },
      orderBy: { sortOrder: 'asc' },
      include: {
        _count: {
          select: { userRoles: true },
        },
      },
    });
  }

  async create(dto: CreateRoleDto) {
    const rawKey = dto.key
      ? dto.key.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_')
      : dto.name.trim().toLowerCase().replace(/[^a-z0-9_]+/g, '_');

    const existing = await this.prisma.role.findFirst({
      where: { orgId: null, key: rawKey },
    });
    if (existing) {
      throw new ConflictException(`Role key '${rawKey}' already exists`);
    }

    const count = await this.prisma.role.count();

    return this.prisma.role.create({
      data: {
        key: rawKey,
        name: dto.name,
        description: dto.description ?? '',
        scope: dto.scope ?? 'team',
        status: 'active',
        sortOrder: count + 1,
      },
    });
  }

  async update(id: string, dto: UpdateRoleDto) {
    const role = await this.prisma.role.findUnique({ where: { id } });
    if (!role) {
      throw new NotFoundException('Role not found');
    }

    const rawKey = dto.key
      ? dto.key.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_')
      : undefined;

    if (rawKey !== undefined && rawKey !== role.key) {
      if (SYSTEM_ROLES.has(role.key)) {
        throw new BadRequestException(
          `System role '${role.name}' key cannot be changed`,
        );
      }
      const existing = await this.prisma.role.findFirst({
        where: { orgId: null, key: rawKey },
      });
      if (existing) {
        throw new ConflictException(`Role key '${rawKey}' already exists`);
      }
    }

    return this.prisma.role.update({
      where: { id },
      data: {
        ...(dto.name ? { name: dto.name } : {}),
        ...(rawKey !== undefined ? { key: rawKey } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.scope ? { scope: dto.scope } : {}),
        ...(dto.status ? { status: dto.status } : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
      },
    });
  }

  async remove(id: string) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: { _count: { select: { userRoles: true } } },
    });
    if (!role) {
      throw new NotFoundException('Role not found');
    }

    if (SYSTEM_ROLES.has(role.key)) {
      throw new BadRequestException(`System role '${role.name}' cannot be deleted`);
    }

    if (role._count.userRoles > 0) {
      throw new BadRequestException(
        `Cannot delete role '${role.name}' because ${role._count.userRoles} user(s) are currently assigned to it`,
      );
    }

    await this.prisma.role.delete({ where: { id } });
    return { success: true };
  }

  async getRolePermissions(roleId: string) {
    const role = await this.prisma.role.findUnique({
      where: { id: roleId },
      select: {
        id: true,
        name: true,
        key: true,
        description: true,
        scope: true,
        status: true,
      },
    });
    if (!role) {
      throw new NotFoundException('Role not found');
    }

    const systemRows = await this.prisma.roleModulePermission.findMany({
      where: { orgId: SYSTEM_ORG_ID, roleId },
    });

    const isUnrestricted = role.key === 'super_admin' || role.key === 'admin';
    const rowMap = new Map(systemRows.map((r) => [r.moduleKey, r]));

    const permissions = PERMISSION_MODULES.map((def) => {
      if (isUnrestricted) {
        return {
          moduleKey: def.key,
          label: def.label,
          description: def.description,
          canView: true,
          canAdd: true,
          canEdit: true,
          canDelete: true,
          canApprove: true,
        };
      }

      const existingRow = rowMap.get(def.key);
      if (existingRow) {
        return {
          moduleKey: def.key,
          label: def.label,
          description: def.description,
          canView: existingRow.canView,
          canAdd: existingRow.canAdd,
          canEdit: existingRow.canEdit,
          canDelete: existingRow.canDelete,
          canApprove: existingRow.canApprove,
        };
      }

      const bakedIn = defaultForRole(role.key, def.key);
      return {
        moduleKey: def.key,
        label: def.label,
        description: def.description,
        canView: bakedIn.view ?? false,
        canAdd: bakedIn.add ?? false,
        canEdit: bakedIn.edit ?? false,
        canDelete: bakedIn.delete ?? false,
        canApprove: bakedIn.approve ?? false,
      };
    });

    return {
      role,
      modules: PERMISSION_MODULES,
      permissions,
    };
  }

  async updateRolePermissions(roleId: string, dto: UpdateRolePermissionsDto) {
    const role = await this.prisma.role.findUnique({ where: { id: roleId } });
    if (!role) {
      throw new NotFoundException('Role not found');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.roleModulePermission.deleteMany({
        where: { orgId: SYSTEM_ORG_ID, roleId },
      });

      const validModuleKeys = new Set(PERMISSION_MODULES.map((m) => m.key));
      const validPermissions = dto.permissions.filter((p) =>
        validModuleKeys.has(p.moduleKey),
      );

      if (validPermissions.length > 0) {
        await tx.roleModulePermission.createMany({
          data: validPermissions.map((p) => ({
            orgId: SYSTEM_ORG_ID,
            roleId,
            moduleKey: p.moduleKey,
            canView: p.canView,
            canAdd: p.canAdd,
            canEdit: p.canEdit,
            canDelete: p.canDelete,
            canApprove: p.canApprove,
          })),
        });
      }
    });

    return this.getRolePermissions(roleId);
  }
}
