import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { PrismaService } from '../../database/prisma.service';
import { JwtPayload } from '../types/jwt-payload.interface';
import {
  PERMISSION_METADATA_KEY,
  RequiredPermission,
} from '../decorators/require-permission.decorator';
import {
  assertPermission,
  computeEffectivePermissions,
  mergeRolePermissions,
  SYSTEM_ORG_ID,
} from '../utils/permissions.util';

/**
 * Enforces page/action permissions declared with @RequirePermission(module, action).
 * Must run after JwtAuthGuard (relies on request.user) and is typically chained
 * with OrgAdminGuard/OrgApprovedGuard per the existing convention — this guard
 * only narrows further based on the @RequirePermission decorator.
 *
 * Rules:
 *   - user with super_admin or the org's admin role always passes.
 *   - otherwise the effective permission is resolved from the DB (role rows +
 *     any per-user override rows), falling back to role defaults, and the
 *     requested (module, action) must be granted.
 *   - routes without @RequirePermission metadata pass through untouched.
 */
@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<RequiredPermission | undefined>(
      PERMISSION_METADATA_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!required) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<Request & { user: JwtPayload }>();
    const actor = request.user;
    const orgId = actor?.orgId;
    if (!orgId) {
      throw new ForbiddenException('Organisation access required');
    }

    // Resolve roles + permission rows for this org member.
    const user = await this.prisma.user.findUnique({
      where: { id: actor.sub },
      select: {
        id: true,
        orgId: true,
        userRoles: { select: { role: { select: { key: true } } } },
      },
    });
    if (!user || user.orgId !== orgId) {
      throw new ForbiddenException('User not found in this organisation');
    }

    const roleKeys = user.userRoles.map((ur) => ur.role.key);

    // Unrestricted roles bypass immediately — no DB reads needed for them.
    if (isUnrestricted(roleKeys)) {
      return true;
    }

    const [rawRolePermissions, userOverrides] = await Promise.all([
      this.prisma.roleModulePermission.findMany({
        where: {
          orgId: { in: [orgId, SYSTEM_ORG_ID] },
          role: { key: { in: roleKeys } },
        },
        select: {
          orgId: true,
          moduleKey: true,
          canView: true,
          canAdd: true,
          canEdit: true,
          canDelete: true,
          canApprove: true,
        },
      }),
      this.prisma.userModulePermission.findMany({
        where: { orgId, userId: actor.sub },
        select: {
          moduleKey: true,
          canView: true,
          canAdd: true,
          canEdit: true,
          canDelete: true,
          canApprove: true,
        },
      }),
    ]);

    const rolePermissions = mergeRolePermissions(rawRolePermissions);

    const effective = computeEffectivePermissions({
      roleKeys,
      rolePermissions: rolePermissions.map((row) => ({ role: { key: roleKeys[0] ?? '' }, ...row })),
      userOverrides,
    });

    assertPermission(effective, required.module, required.action);
    return true;
  }
}

function isUnrestricted(roleKeys: string[]): boolean {
  return roleKeys.includes('super_admin') || roleKeys.includes('admin');
}
