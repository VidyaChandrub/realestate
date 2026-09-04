import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Request } from 'express';
import { PrismaService } from '../../database/prisma.service';
import { JwtPayload } from '../types/jwt-payload.interface';

// Gates real dashboard/business functionality behind Super Admin approval.
// Deliberately a SEPARATE guard from OrgAdminGuard (role + orgId presence)
// rather than folded into it: every organisation sits at status 'pending'
// for its entire trip through the signup wizard (Step 2 through Step 8),
// and the wizard's own token has to keep working through all of that — so
// /onboarding/* routes use OrgAdminGuard alone, and this guard is added
// only to the actual dashboard-facing modules (org-settings, org-users,
// org-billing, projects, leads, org-landing-pages, org-templates,
// org-domain, org-tracking, org-activity, org-typography-sets,
// org-domain-requests, and POST /team/invite). Keeping the two guards
// separate keeps that distinction visible in each controller's
// @UseGuards(...) list instead of hidden inside shared guard logic.
//
// Reads Organisation.status fresh from the database on every request
// (never from the JWT) so approval takes effect immediately — an approved
// org admin does not need to log out and back in; their existing token
// starts passing on their very next request.
//
// Must run after JwtAuthGuard (and typically OrgAdminGuard) — relies on
// request.user.orgId already being attached.
// Use as @UseGuards(JwtAuthGuard, OrgAdminGuard, OrgApprovedGuard).
//
// Every rejection here carries `error: 'ORG_INACTIVE'` in the response body
// (alongside the human message, which is unchanged) so the frontend can
// tell "your org access was revoked mid-session" apart from an ordinary
// 403 and end the session immediately — e.g. a Super Admin deactivating an
// org while its admin is still logged in.
export const ORG_INACTIVE_ERROR = 'ORG_INACTIVE';

function orgInactive(message: string): ForbiddenException {
  return new ForbiddenException({
    statusCode: 403,
    error: ORG_INACTIVE_ERROR,
    message,
  });
}

@Injectable()
export class OrgApprovedGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<Request & { user: JwtPayload }>();

    const orgId = request.user?.orgId;
    if (!orgId) {
      throw orgInactive('Organisation Admin access required');
    }

    const organisation = await this.prisma.organisation.findUnique({
      where: { id: orgId },
      select: { status: true },
    });

    if (!organisation) {
      throw orgInactive('Organisation not found');
    }
    if (organisation.status === 'pending') {
      throw orgInactive(
        'Organisation pending approval — please wait for super admin approval',
      );
    }
    if (organisation.status === 'disabled') {
      throw orgInactive('Organisation is disabled');
    }
    if (organisation.status === 'rejected') {
      throw orgInactive('Organisation registration was rejected');
    }
    if (organisation.status === 'draft') {
      throw orgInactive('Organisation not yet activated');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: request.user.sub },
      select: { mustChangePassword: true },
    });
    if (user?.mustChangePassword) {
      throw new ForbiddenException(
        'Password change required before accessing the organisation',
      );
    }

    return true;
  }
}
