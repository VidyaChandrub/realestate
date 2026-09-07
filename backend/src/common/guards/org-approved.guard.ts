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
// Disabled/rejected orgs carry `error: 'ORG_INACTIVE'` so the frontend can
// tell "your org access was revoked mid-session" apart from an ordinary
// 403 and end the session immediately — e.g. a Super Admin deactivating an
// org while its admin is still logged in. Draft/pending use ORG_NOT_READY
// instead so signup and holding states never force-logout.
export const ORG_INACTIVE_ERROR = 'ORG_INACTIVE';

// Member-level counterpart of ORG_INACTIVE. Raised when the authenticated
// user's own account has been disapproved/deactivated, or when a stale access
// token predates a password reset / session-invalidation stamp. The frontend
// (lib/api.ts) treats it exactly like ORG_INACTIVE — clear the session and
// bounce to the login page with an "access revoked" notice.
export const USER_INACTIVE_ERROR = 'USER_INACTIVE';

function orgInactive(message: string): ForbiddenException {
  return new ForbiddenException({
    statusCode: 403,
    error: ORG_INACTIVE_ERROR,
    message,
  });
}

function userInactive(message: string): ForbiddenException {
  return new ForbiddenException({
    statusCode: 403,
    error: USER_INACTIVE_ERROR,
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
      throw new ForbiddenException('Organisation Admin access required');
    }

    const organisation = await this.prisma.organisation.findUnique({
      where: { id: orgId },
      select: { status: true },
    });

    if (!organisation) {
      throw new ForbiddenException('Organisation not found');
    }
    // Draft/pending are expected during signup — they must NOT be tagged
    // ORG_INACTIVE or the frontend will force-logout mid-wizard.
    if (organisation.status === 'pending') {
      throw new ForbiddenException({
        statusCode: 403,
        error: 'ORG_NOT_READY',
        message:
          'Organisation pending approval — please wait for super admin approval',
      });
    }
    if (organisation.status === 'draft') {
      throw new ForbiddenException({
        statusCode: 403,
        error: 'ORG_NOT_READY',
        message: 'Organisation not yet activated',
      });
    }
    if (organisation.status === 'disabled') {
      throw orgInactive('Organisation is disabled');
    }
    if (organisation.status === 'rejected') {
      throw orgInactive('Organisation registration was rejected');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: request.user.sub },
      select: {
        status: true,
        mustChangePassword: true,
        tokenInvalidBefore: true,
      },
    });

    // Account disapproved / deactivated after this token was issued — reject
    // immediately so a still-valid access JWT cannot keep working (mirrors the
    // Super Admin -> deactivate-Organisation model).
    if (user?.status === 'disabled') {
      throw userInactive(
        'Your account access has been revoked. Please contact your administrator.',
      );
    }

    // Access token predates a password reset / forced session invalidation.
    const iatMs = request.user.iat ? request.user.iat * 1000 : null;
    if (
      user?.tokenInvalidBefore &&
      iatMs !== null &&
      iatMs < user.tokenInvalidBefore.getTime()
    ) {
      throw userInactive('Your session has ended. Please sign in again.');
    }

    // Approved member who still has to set their own password: allowed to
    // reach /auth/change-password (JwtAuthGuard only), but not normal
    // dashboard APIs. Plain 403 (not USER_INACTIVE) — the frontend shell
    // routes them to the change-password screen rather than force-logging out.
    if (user?.mustChangePassword) {
      throw new ForbiddenException(
        'Password change required before accessing the organisation',
      );
    }

    return true;
  }
}
