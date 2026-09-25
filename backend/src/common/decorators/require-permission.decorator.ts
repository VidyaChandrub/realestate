import { SetMetadata } from '@nestjs/common';
import type { PermissionAction } from '../utils/permissions.util';

export const PERMISSION_METADATA_KEY = 'require_permission';

export interface RequiredPermission {
  module: string;
  action: PermissionAction;
  /** Also check the org `admin` role (against its Super Admin defaults). */
  enforceForOrgAdmin?: boolean;
}

/**
 * Declares that a route requires a specific permission on a module, e.g.
 *   @RequirePermission('crm', 'delete')
 * Enforced by the PermissionGuard, which must run after JwtAuthGuard.
 * Platform `super_admin` always passes. The org-wide `admin` role passes too
 * unless `enforceForOrgAdmin` is set, in which case the permission Super Admin
 * configured for the Admin role (Organisation roles) is checked.
 */
export const RequirePermission = (
  module: string,
  action: PermissionAction,
  options: { enforceForOrgAdmin?: boolean } = {},
): MethodDecorator & ClassDecorator =>
  SetMetadata(PERMISSION_METADATA_KEY, {
    module,
    action,
    enforceForOrgAdmin: options.enforceForOrgAdmin === true,
  } satisfies RequiredPermission);
