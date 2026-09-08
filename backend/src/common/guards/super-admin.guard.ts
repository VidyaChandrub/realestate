import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Request } from 'express';
import { PrismaService } from '../../database/prisma.service';
import { JwtPayload } from '../types/jwt-payload.interface';
import { USER_INACTIVE_ERROR } from './org-approved.guard';
import {
  PLATFORM_PERMISSION_MODULES,
  SYSTEM_ORG_ID,
  actionFromHttpMethod,
  platformModuleForPath,
} from '../utils/permissions.util';

function userInactive(message: string): ForbiddenException {
  return new ForbiddenException({
    statusCode: 403,
    error: USER_INACTIVE_ERROR,
    message,
  });
}

const ACCOUNT_REVOKED_MESSAGE =
  'Your account access has been revoked. Please contact your administrator.';

@Injectable()
export class SuperAdminGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<Request & { user: JwtPayload }>();

    const actor = request.user;
    const roleKeys = actor?.roles ?? [];
    if (!actor?.sub) {
      throw new ForbiddenException('Super Admin access required');
    }

    // Account-status gate for the Platform Team — the console-side counterpart
    // of OrgApprovedGuard's per-request user check. Reads status fresh from the
    // DB on every request (never from the JWT) so a Super Admin disabling a
    // Platform Team member takes effect on that member's very next call:
    //   - account gone / disabled  -> USER_INACTIVE (frontend force-logout to
    //     /admin-login with the "access revoked" notice).
    //   - access token predates a tokenInvalidBefore stamp (disable, admin
    //     password reset, forced session invalidation) -> USER_INACTIVE, so a
    //     still-valid access JWT cannot outlive the disable, and re-enabling an
    //     account never silently resurrects a pre-disable session.
    //   - first-login password change still pending -> plain 403 (NOT
    //     USER_INACTIVE); the frontend shell routes them to /change-password
    //     rather than ending the session.
    const account = await this.prisma.user.findUnique({
      where: { id: actor.sub },
      select: { status: true, tokenInvalidBefore: true, mustChangePassword: true },
    });
    if (!account || account.status === 'disabled') {
      throw userInactive(ACCOUNT_REVOKED_MESSAGE);
    }
    const iatMs = actor.iat ? actor.iat * 1000 : null;
    if (
      account.tokenInvalidBefore &&
      iatMs !== null &&
      iatMs < account.tokenInvalidBefore.getTime()
    ) {
      throw userInactive('Your session has ended. Please sign in again.');
    }
    if (account.mustChangePassword) {
      throw new ForbiddenException(
        'Password change required before accessing the console',
      );
    }

    if (roleKeys.includes('super_admin')) {
      return true;
    }

    const platformRoles = await this.prisma.role.findMany({
      where: {
        orgId: null,
        scope: 'platform',
        status: 'active',
        key: { in: roleKeys },
      },
      select: { id: true, key: true },
    });

    if (actor.orgId !== null || platformRoles.length === 0) {
      throw new ForbiddenException('Super Admin access required');
    }

    const path = request.path || request.url.split('?')[0];
    if (path === '/admin/platform-roles/me') {
      return true;
    }
    if (
      request.method === 'GET' &&
      (path === '/admin/notifications' || path.startsWith('/admin/notifications/'))
    ) {
      return true;
    }

    const moduleKey = platformModuleForPath(path);
    if (!moduleKey) {
      return true;
    }

    const action = actionFromHttpMethod(request.method);
    const rows = await this.prisma.roleModulePermission.findMany({
      where: {
        orgId: SYSTEM_ORG_ID,
        roleId: { in: platformRoles.map((r) => r.id) },
        moduleKey,
      },
    });

    const granted = rows.some((row) => {
      if (action === 'view') return row.canView;
      if (action === 'add') return row.canAdd;
      if (action === 'edit') return row.canEdit;
      if (action === 'delete') return row.canDelete;
      return row.canApprove;
    });

    if (granted) {
      return true;
    }

    const known = PLATFORM_PERMISSION_MODULES.some((m) => m.key === moduleKey);
    if (!known) {
      return true;
    }

    throw new ForbiddenException(
      `Missing platform permission: ${moduleKey}:${action}`,
    );
  }
}
