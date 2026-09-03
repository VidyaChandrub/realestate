import { SetMetadata } from '@nestjs/common';
import type { PermissionAction } from '../utils/permissions.util';

export const PERMISSION_METADATA_KEY = 'require_permission';

export interface RequiredPermission {
  module: string;
  action: PermissionAction;
}

/**
 * Declares that a route requires a specific permission on a module, e.g.
 *   @RequirePermission('crm', 'delete')
 * Enforced by the PermissionGuard, which must run after JwtAuthGuard.
 * The org-wide `admin` role and platform `super_admin` always pass.
 */
export const RequirePermission = (
  module: string,
  action: PermissionAction,
): MethodDecorator & ClassDecorator =>
  SetMetadata(PERMISSION_METADATA_KEY, {
    module,
    action,
  } satisfies RequiredPermission);
