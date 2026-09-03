import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import {
  ACTION_TO_COLUMN,
  PERMISSION_ACTIONS,
  PERMISSION_MODULES,
  computeEffectivePermissions,
  emptyModulePermission,
  loadRolePermissions,
  modulePermissionUpsertData,
  type ModulePermission,
  type PermissionAction,
} from '../../common/utils/permissions.util';
import { UpdateRolePermissionsDto } from './dto/update-role-permissions.dto';
import { SetUserPermissionsDto } from './dto/set-user-permissions.dto';

// Roles the org admin is allowed to configure for their own org. The org's
// own `admin` role is intentionally included so its rows persist (and the UI
// can show a locked, full-access state) — but it can never actually be
// restricted.
const UNRESTRICTABLE = new Set(['admin', 'super_admin']);

export type UserPermissionItem = Partial<Record<PermissionAction, boolean>> & {
  moduleKey: string;
};

@Injectable()
export class OrgPermissionsService {
  constructor(private readonly prisma: PrismaService) {}

  /** The page/action matrix the admin UI renders, plus role defaults. */
  async getCatalog(orgId: string) {
    const roles = await this.prisma.role.findMany({
      where: {
        status: 'active',
        scope: { in: ['organisation', 'team'] },
        OR: [{ orgId: null }, { orgId }],
      },
      select: { id: true, key: true, name: true, scope: true, sortOrder: true, orgId: true },
      orderBy: { sortOrder: 'asc' },
    });

    return {
      actions: [...PERMISSION_ACTIONS],
      modules: PERMISSION_MODULES.map((def) => ({
        key: def.key,
        label: def.label,
        description: def.description,
        actions: [...PERMISSION_ACTIONS],
      })),
      roles: roles.map((role) => ({
        id: role.id,
        key: role.key,
        name: role.name,
        scope: role.scope,
        // Org admin + platform roles are always full-access and locked.
        locked: UNRESTRICTABLE.has(role.key),
        // Org-created custom role — the org admin can rename/delete it.
        custom: role.orgId === orgId,
      })),
    };
  }

  /** Roles this org may create for its own members (custom roles). */
  async listOrgRoles(orgId: string) {
    return this.prisma.role.findMany({
      where: { orgId },
      orderBy: { sortOrder: 'asc' },
      include: { _count: { select: { userRoles: true } } },
    });
  }

  /** Create a new custom role scoped to this org (org admin only). */
  async createOrgRole(
    orgId: string,
    dto: { name: string; description?: string },
  ) {
    const rawKey = `org_${orgId.slice(0, 8)}_${dto.name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_]+/g, '_')}`;

    const existing = await this.prisma.role.findFirst({
      where: { orgId, key: rawKey },
    });
    if (existing) {
      throw new BadRequestException(`A role named '${dto.name}' already exists`);
    }

    const count = await this.prisma.role.count({ where: { orgId } });

    return this.prisma.role.create({
      data: {
        orgId,
        key: rawKey,
        name: dto.name,
        description: dto.description ?? '',
        scope: 'team',
        status: 'active',
        sortOrder: 100 + count,
      },
    });
  }

  /** Rename/disable a custom role this org created. */
  async updateOrgRole(
    orgId: string,
    roleId: string,
    dto: { name?: string; description?: string; status?: 'active' | 'inactive' },
  ) {
    const role = await this.prisma.role.findFirst({ where: { id: roleId, orgId } });
    if (!role) {
      throw new NotFoundException('Role not found');
    }

    return this.prisma.role.update({
      where: { id: roleId },
      data: {
        ...(dto.name ? { name: dto.name } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.status ? { status: dto.status } : {}),
      },
    });
  }

  /** Delete a custom role this org created, if unused. */
  async removeOrgRole(orgId: string, roleId: string) {
    const role = await this.prisma.role.findFirst({
      where: { id: roleId, orgId },
      include: { _count: { select: { userRoles: true } } },
    });
    if (!role) {
      throw new NotFoundException('Role not found');
    }
    if (role._count.userRoles > 0) {
      throw new BadRequestException(
        `Cannot delete role '${role.name}' because ${role._count.userRoles} user(s) are currently assigned to it`,
      );
    }

    await this.prisma.role.delete({ where: { id: roleId } });
    return { success: true };
  }

  /** Every configurable role with its current page/action rows for this org. */
  async listRoles(orgId: string) {
    return loadRolePermissions(this.prisma, orgId);
  }

  /**
   * Full-set replace of ONE role's permissions within this org. Missing
   * modules are cleared so they fall back to the role default. `admin` /
   * `super_admin` rows are accepted but never actually restrict.
   */
  async updateRole(
    orgId: string,
    roleKey: string,
    dto: UpdateRolePermissionsDto,
  ) {
    const role = await this.prisma.role.findFirst({
      where: {
        key: roleKey,
        status: 'active',
        scope: { in: ['organisation', 'team'] },
        OR: [{ orgId: null }, { orgId }],
      },
      select: { id: true },
    });
    if (!role) {
      throw new BadRequestException('That role is not configurable');
    }

    const input = dto.permissions;
    const seen = new Set<string>();

    await this.prisma.$transaction(async (tx) => {
      for (const item of input) {
        if (seen.has(item.moduleKey)) continue;
        seen.add(item.moduleKey);
        const data = modulePermissionUpsertData(item);
        await tx.roleModulePermission.upsert({
          where: {
            orgId_roleId_moduleKey: {
              orgId,
              roleId: role.id,
              moduleKey: item.moduleKey,
            },
          },
          update: data,
          create: { orgId, roleId: role.id, moduleKey: item.moduleKey, ...data },
        });
      }
      // Anything not sent is removed so it falls back to the role default.
      if (seen.size < PERMISSION_MODULES.length) {
        await tx.roleModulePermission.deleteMany({
          where: {
            orgId,
            roleId: role.id,
            moduleKey: { notIn: [...seen] },
          },
        });
      }
    });

    const rows = await loadRolePermissions(this.prisma, orgId);
    return rows.find((r) => r.roleKey === roleKey) ?? null;
  }

  /** Effective (role + overrides) permissions for a specific user. */
  async getUserPermissions(orgId: string, userId: string) {
    return this.loadUserPermissions(orgId, userId);
  }

  /**
   * Full-set replace of one user's per-module overrides. Sending a null (or
   * omitting) an action clears that override so it inherits from the role. A
   * module whose five columns are all clear is removed entirely.
   */
  async setUserPermissions(
    orgId: string,
    actorUserId: string,
    userId: string,
    dto: SetUserPermissionsDto,
  ) {
    const target = await this.prisma.user.findFirst({
      where: { id: userId, orgId },
      select: {
        id: true,
        userRoles: { select: { role: { select: { key: true } } } },
      },
    });
    if (!target) {
      throw new NotFoundException('User not found');
    }
    if (userId === actorUserId) {
      throw new ForbiddenException('You cannot change your own permissions');
    }
    if (target.userRoles.some((ur) => ur.role.key === 'admin')) {
      throw new BadRequestException(
        'Organisation admins always have full access and cannot be restricted',
      );
    }

    // Normalise to (module -> {action: boolean}) keeping only explicit values.
    const byModule = new Map<string, Partial<Record<PermissionAction, boolean>>>();
    for (const item of dto.permissions) {
      const actions = byModule.get(item.moduleKey) ?? {};
      for (const action of PERMISSION_ACTIONS) {
        const value = (item as unknown as Record<PermissionAction, boolean | null | undefined>)[action];
        if (typeof value === 'boolean') actions[action] = value;
      }
      byModule.set(item.moduleKey, actions);
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.userModulePermission.deleteMany({ where: { orgId, userId } });

      for (const [moduleKey, actions] of byModule) {
        if (Object.keys(actions).length === 0) continue;
        const row: Record<string, unknown> = { orgId, userId, moduleKey };
        for (const action of PERMISSION_ACTIONS) {
          const value = actions[action];
          if (typeof value === 'boolean') row[ACTION_TO_COLUMN[action]] = value;
        }
        await tx.userModulePermission.create({ data: row as never });
      }
    });

    return this.loadUserPermissions(orgId, userId);
  }

  /** Effective permissions for the caller — enriches /auth/me. */
  async getMyPermissions(orgId: string, userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        orgId: true,
        userRoles: { select: { role: { select: { key: true } } } },
        userPermissions: {
          select: {
            moduleKey: true,
            canView: true,
            canAdd: true,
            canEdit: true,
            canDelete: true,
            canApprove: true,
          },
        },
      },
    });
    if (!user || user.orgId !== orgId) {
      throw new NotFoundException('User not found');
    }

    const roleKeys = user.userRoles.map((ur) => ur.role.key);
    const rolePermissions = await this.prisma.roleModulePermission.findMany({
      where: { orgId, role: { key: { in: roleKeys } } },
      select: {
        role: { select: { key: true } },
        moduleKey: true,
        canView: true,
        canAdd: true,
        canEdit: true,
        canDelete: true,
        canApprove: true,
      },
    });

    const effective = computeEffectivePermissions({
      roleKeys,
      rolePermissions,
      userOverrides: user.userPermissions,
    });

    const byModule: Record<string, ModulePermission> = {};
    for (const module of PERMISSION_MODULES) {
      byModule[module.key] =
        effective.byModule[module.key] ?? { ...emptyModulePermission(module.key) };
    }

    return {
      role: roleKeys[0] ?? null,
      permissions: Object.fromEntries(
        Object.entries(byModule).map(([key, value]) => [
          key,
          {
            view: value.canView,
            add: value.canAdd,
            edit: value.canEdit,
            delete: value.canDelete,
            approve: value.canApprove,
          },
        ]),
      ),
    };
  }

  private async loadUserPermissions(orgId: string, userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, orgId },
      select: {
        id: true,
        userRoles: { select: { role: { select: { key: true, name: true } } } },
        userPermissions: {
          where: { orgId },
          select: {
            moduleKey: true,
            canView: true,
            canAdd: true,
            canEdit: true,
            canDelete: true,
            canApprove: true,
          },
        },
      },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const roleKeys = user.userRoles.map((ur) => ur.role.key);
    const rolePermissions = await this.prisma.roleModulePermission.findMany({
      where: { orgId, role: { key: { in: roleKeys } } },
      select: {
        role: { select: { key: true } },
        moduleKey: true,
        canView: true,
        canAdd: true,
        canEdit: true,
        canDelete: true,
        canApprove: true,
      },
    });

    const effective = computeEffectivePermissions({
      roleKeys,
      rolePermissions,
      userOverrides: user.userPermissions,
    });

    return {
      userId: user.id,
      role: user.userRoles[0]
        ? { key: user.userRoles[0].role.key, name: user.userRoles[0].role.name }
        : null,
      effective: effective.byModule,
      overrides: PERMISSION_MODULES.map((module) => {
        const override = user.userPermissions.find(
          (p) => p.moduleKey === module.key,
        );
        return override
          ? {
              moduleKey: module.key,
              canView: override.canView,
              canAdd: override.canAdd,
              canEdit: override.canEdit,
              canDelete: override.canDelete,
              canApprove: override.canApprove,
            }
          : null;
      }).filter((x): x is NonNullable<typeof x> => x !== null),
    };
  }
}
