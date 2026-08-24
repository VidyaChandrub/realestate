import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtPayload } from '../types/jwt-payload.interface';

// Minimal org-scoping guard — NOT the full Team/Role permission system
// (that's a separate module). Only confirms the caller has the `admin` role
// and a real orgId on their token; every org-scoped endpoint must still
// derive orgId from request.user, never from a client-supplied param.
// Must run after JwtAuthGuard — relies on it having already attached
// request.user. Use as @UseGuards(JwtAuthGuard, OrgAdminGuard).
@Injectable()
export class OrgAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context
      .switchToHttp()
      .getRequest<Request & { user: JwtPayload }>();

    if (!request.user?.roles?.includes('admin') || !request.user.orgId) {
      throw new ForbiddenException('Organisation Admin access required');
    }

    return true;
  }
}
