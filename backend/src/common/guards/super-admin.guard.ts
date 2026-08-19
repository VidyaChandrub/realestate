import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtPayload } from '../types/jwt-payload.interface';

// Must run after JwtAuthGuard — relies on it having already attached
// request.user. Use as @UseGuards(JwtAuthGuard, SuperAdminGuard).
@Injectable()
export class SuperAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context
      .switchToHttp()
      .getRequest<Request & { user: JwtPayload }>();

    if (!request.user?.roles?.includes('super_admin')) {
      throw new ForbiddenException('Super Admin access required');
    }

    return true;
  }
}
