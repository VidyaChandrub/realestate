import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SetMetadata } from '@nestjs/common';

/**
 * Decorator to specify required roles for an endpoint
 * 
 * Usage:
 * @Roles('admin', 'employer')
 * @Get('admin/users')
 */
export const Roles = (...roles: string[]) => SetMetadata('roles', roles);

/**
 * Decorator to skip the controller/handler-level role check performed by RolesGuard.
 * JwtAuthGuard still runs — the request must be authenticated. Use only when the
 * target handler enforces its own, more granular authorization (e.g. ownership checks).
 *
 * Usage:
 * @SkipRoleCheck()
 * @Get('admin/applications')
 */
export const SkipRoleCheck = () => SetMetadata('skipRoleCheck', true);

/**
 * Roles Guard - Checks if user has required roles
 * 
 * Must be used AFTER JwtAuthGuard
 * 
 * Usage:
 * @UseGuards(JwtAuthGuard, RolesGuard)
 * @Roles('admin')
 * @Get('admin/users')
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const skipRoleCheck = this.reflector.getAllAndOverride<boolean>('skipRoleCheck', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (skipRoleCheck) {
      return true;
    }

    const requiredRoles = this.reflector.getAllAndOverride<string[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true; // No roles required
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.role) {
      throw new ForbiddenException('Access denied - no roles found');
    }

    const hasRole = requiredRoles.some((role) => role === user.role);

    if (!hasRole) {
      throw new ForbiddenException(`Access denied - requires one of: ${requiredRoles.join(', ')}`);
    }

    return true;
  }
}
