import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { OnboardingStep } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../database/prisma.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { OnboardingAccountDto } from './dto/onboarding-account.dto';
import { OnboardingOrganisationDto } from './dto/onboarding-organisation.dto';
import { ResumeSignupDto } from './dto/resume-signup.dto';
import { JwtPayload } from '../../common/types/jwt-payload.interface';
import {
  nextOnboardingStep,
  furthestOnboardingStep,
} from '../../common/utils/onboarding.util';
import {
  generateRandomToken,
  hashToken,
  parseDuration,
} from '../../common/utils/tokens.util';
import { generateUniqueOrgSlug } from '../../common/utils/slug.util';
import {
  toSafeOrganisation,
  toSafeUser,
} from '../../common/utils/mappers.util';
import { assertTemplateQuota } from '../../common/utils/plan-quota.util';
import { assertEligibleTemplateIds } from '../../common/utils/template-eligibility.util';
import {
  normalizeSubdomain,
  isValidSubdomain,
  subdomainHost,
  normalizeDomain,
  isValidDomain,
  generateSubdomainSuggestions,
} from '../../common/utils/domain.util';
import { buildNotificationData } from '../../common/utils/notifications.util';

const BCRYPT_COST_FACTOR = 12;

@Injectable()
export class AuthService {
  private readonly accessExpiresIn = process.env.JWT_ACCESS_EXPIRES_IN ?? '15m';
  private readonly refreshExpiresIn =
    process.env.JWT_REFRESH_EXPIRES_IN ?? '30d';

  // Ephemeral, single-instance only: password reset tokens. Email sending is
  // stubbed, so the token is returned to the client for local development.
  private readonly resetTokens = new Map<string, { email: string; expires: number }>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async signup(dto: SignupDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.work_email },
    });
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    // Validate plan + template selection if provided at registration
    let plan: any = null;
    const templateIds = dto.templateIds ?? [];
    if (dto.planId) {
      plan = await this.prisma.plan.findUnique({ where: { id: dto.planId } });
      if (!plan || !plan.isActive) throw new NotFoundException('Plan not found');
      if (templateIds.length > 0) {
        await assertEligibleTemplateIds(this.prisma, templateIds);
        assertTemplateQuota(plan, templateIds.length);
      }
    } else if (templateIds.length > 0) {
      // Template assignment without a plan — plan-based quota doesn't apply,
      // but eligibility (published, landing) still does.
      await assertEligibleTemplateIds(this.prisma, templateIds);
    }

    const slug = await generateUniqueOrgSlug(this.prisma, dto.company_name);
    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_COST_FACTOR);
    const adminRole = await this.prisma.role.findUniqueOrThrow({
      where: { key: 'admin' },
    });

    // --- Organisation domain identity (subdomain / custom domain) ---
    // The requested subdomain is validated and reserved on a pending
    // OrgDomainRequest here; it only becomes an active Organisation.subdomain
    // once the Super Admin approves the organisation.
    let subdomain: string | null = null;
    if (dto.subdomain) {
      if (!isValidSubdomain(dto.subdomain)) {
        throw new ConflictException(
          'Subdomain is invalid. Use 2-63 lowercase letters, digits or hyphens (e.g. skylinedev).',
        );
      }
      subdomain = normalizeSubdomain(dto.subdomain);
      await this.assertSubdomainAvailable(subdomain);
    }

    let customDomain: string | null = null;
    if (dto.custom_domain) {
      if (!isValidDomain(dto.custom_domain)) {
        throw new ConflictException(
          'Custom domain is invalid. Example: example.com',
        );
      }
      customDomain = normalizeDomain(dto.custom_domain);
      await this.assertCustomDomainAvailable(customDomain);
    }

    const { user, organisation } = await this.prisma.$transaction(
      async (tx) => {
        const organisation = await tx.organisation.create({
          data: {
            name: dto.company_name,
            slug,
            city: dto.city,
            status: 'pending',
            country: dto.country ?? null,
            currency: dto.currency ?? 'INR',
            timezone: dto.timezone ?? 'Asia/Kolkata',
            // Subdomain only becomes active on approval; reserve the column so
            // external tooling can read the intended value early.
            subdomain,
            customDomain,
            subdomainStatus: subdomain ? 'pending' : 'none',
            customDomainStatus: customDomain ? 'pending' : 'none',
          },
        });

        const user = await tx.user.create({
          data: {
            orgId: organisation.id,
            firstName: dto.first_name,
            lastName: dto.last_name,
            email: dto.work_email,
            phoneNumber: dto.phone_number,
            passwordHash,
            status: 'active',
          },
        });

        await tx.userRole.create({
          data: { userId: user.id, roleId: adminRole.id },
        });

        // Subdomain is stored directly on Organisation (subdomain, subdomainStatus: 'pending')
        // and is auto-activated when the Super Admin approves the organisation.
        if (customDomain) {
          await tx.orgDomainRequest.create({
            data: {
              orgId: organisation.id,
              kind: 'custom_domain',
              customDomain,
              status: 'pending',
              requestedBy: user.id,
            },
          });
        }

        // Create subscription if plan selected at registration
        if (dto.planId && plan) {
          const billingCycle = dto.billingCycle ?? 'monthly';
          const isYearly = billingCycle === 'yearly';
          const amount = isYearly ? plan.priceYearly : plan.priceMonthly;
          const mrr = isYearly ? Math.round(amount / 12) : amount;
          const renewsAt = isYearly
            ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
            : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
          await tx.subscription.create({
            data: {
              orgId: organisation.id,
              planId: plan.id,
              billingCycle: billingCycle as any,
              status: 'active',
              amount,
              mrr,
              currency: 'INR',
              renewsAt,
            },
          });
        }

        if (dto.templateIds && dto.templateIds.length > 0) {
          await tx.organisationTemplate.createMany({
            data: dto.templateIds.map((tid) => ({ orgId: organisation.id, templateId: tid, assignedBy: user.id })),
          });
        }

        await tx.auditLog.create({
          data: {
            orgId: organisation.id,
            actorId: user.id,
            action: 'org_registered_pending',
            entity: 'Organisation',
            entityId: organisation.id,
            metadata: {
              planId: dto.planId ?? null,
              templateIds: dto.templateIds ?? [],
              billingCycle: dto.billingCycle ?? null,
              subdomain,
              customDomain,
            } as any,
          },
        });

        // Notify Super Admin that an organisation registration (and any
        // subdomain / custom-domain request) is awaiting approval.
        await tx.notification.create({
          data: buildNotificationData({
            orgId: organisation.id,
            type: 'organisation_registration',
            title: `New organisation awaiting approval: ${organisation.name}`,
            body: `${organisation.name} (${slug}) registered${subdomain ? ` and requested subdomain ${subdomainHost(subdomain)}` : ''}${customDomain ? ` and/or custom domain ${customDomain}` : ''}. Review and approve or reject from the admin console.`,
            entity: 'Organisation',
            entityId: organisation.id,
          }),
        });

        return { user, organisation };
      },
    );

    // Do NOT issue tokens — organisation is pending approval, user cannot log in yet
    return {
      organisation: toSafeOrganisation(organisation),
      user: toSafeUser(user),
      pending: true,
      message: 'Organisation created — pending super admin approval. You will be able to log in after approval.',
    };
  }

  // ---------------------------------------------------------------------
  // Signup wizard — step-wise persistence (resumable). Replaces the old
  // one-shot `signup()` above for the real registration flow; that method
  // is left in place unmodified as a lower-risk fallback / for any other
  // caller, but the wizard now calls these instead.
  // ---------------------------------------------------------------------

  // Step 1 (Account). Creates the User with no orgId yet and issues a
  // token with no orgId claim. If the email already belongs to a user,
  // this does NOT create anything or issue a token — it just reports
  // which of the two prompts the frontend should show next:
  //   - exists_incomplete: offer "resume where you left off" (the
  //     frontend then calls resumeSignup with just the email — no
  //     password re-entry here, see resumeSignup for why).
  //   - exists_completed: offer "sign in instead", routing to the real,
  //     unchanged /auth/login (password required, pending-org gate
  //     applies as normal).
  async signupStep1(dto: OnboardingAccountDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.work_email },
    });

    if (existing) {
      if (existing.onboardingStep === 'completed') {
        return { status: 'exists_completed' as const };
      }
      return {
        status: 'exists_incomplete' as const,
        onboardingStep: existing.onboardingStep,
      };
    }

    // Duplicate check for phone, same idea as email above — but unlike
    // email there's no resume concept tied to a phone number, so any match
    // here is necessarily a different account (this email is new) and
    // just gets rejected outright rather than offered a resume path.
    const existingByPhone = await this.prisma.user.findFirst({
      where: { phoneNumber: dto.phone_number },
    });
    if (existingByPhone) {
      throw new ConflictException(
        'This phone number is already registered to another account.',
      );
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_COST_FACTOR);
    const user = await this.prisma.user.create({
      data: {
        firstName: dto.first_name,
        lastName: dto.last_name,
        email: dto.work_email,
        phoneNumber: dto.phone_number,
        passwordHash,
        status: 'active',
        onboardingStep: 'account',
      },
    });

    // No roles yet — the admin role is assigned once the organisation
    // exists, at Step 2.
    const tokens = await this.issueTokens(user.id, null, []);

    return {
      status: 'created' as const,
      user: toSafeUser(user),
      onboardingStep: user.onboardingStep,
      nextStep: nextOnboardingStep(user.onboardingStep),
      ...tokens,
    };
  }

  // Dedicated resume path — deliberately NOT a login variant. No password
  // is required: forgot-password doesn't exist in this codebase yet, so
  // requiring a password here would be a dead end for anyone who forgets
  // it mid-onboarding. Accepted trade-off: no real dashboard/customer data
  // exists before onboarding is 'completed', so the exposure is limited to
  // "someone else can resume filling in your half-finished signup form" —
  // and this path explicitly refuses to work at all once onboarding is
  // 'completed' (that's what real login is for, gate and all).
  async resumeSignup(dto: ResumeSignupDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: { userRoles: { include: { role: true } } },
    });
    if (!user) {
      throw new NotFoundException('No signup in progress for this email');
    }
    if (user.onboardingStep === 'completed') {
      throw new ConflictException(
        'This account has already finished setup — please sign in instead.',
      );
    }

    const roles = user.userRoles.map((userRole) => userRole.role.key);
    const tokens = await this.issueTokens(user.id, user.orgId, roles);

    const organisation = user.orgId
      ? await this.prisma.organisation.findUnique({ where: { id: user.orgId } })
      : null;

    let subscription: { planId: string; billingCycle: string } | null = null;
    let templateIds: string[] = [];
    if (user.orgId) {
      const sub = await this.prisma.subscription.findFirst({
        where: { orgId: user.orgId, status: 'active' },
        orderBy: { createdAt: 'desc' },
      });
      subscription = sub ? { planId: sub.planId, billingCycle: sub.billingCycle } : null;

      const assigned = await this.prisma.organisationTemplate.findMany({
        where: { orgId: user.orgId },
        select: { templateId: true },
      });
      templateIds = assigned.map((a) => a.templateId);
    }

    return {
      user: toSafeUser(user),
      organisation: organisation ? toSafeOrganisation(organisation) : null,
      onboardingStep: user.onboardingStep,
      nextStep: nextOnboardingStep(user.onboardingStep),
      subscription,
      templateIds,
      ...tokens,
    };
  }

  // Step 2 (Organisation). JwtAuthGuard only — no org exists yet on first
  // call, so OrgAdminGuard can't be used. Creates the Organisation, sets
  // User.orgId, assigns the creating user the admin role (replicating what
  // the old atomic signup() did at creation time, just moved here), then
  // reissues the JWT so it carries the real orgId from this point on.
  //
  // Idempotent-ish: if the caller's user already has an orgId (a resumed
  // or repeated Step 2 submit), this updates that same organisation in
  // place rather than creating a second one.
  async createOrganisationStep(actor: JwtPayload, dto: OnboardingOrganisationDto) {
    const user = await this.prisma.user.findUnique({ where: { id: actor.sub } });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (user.orgId) {
      return this.updateOrganisationStep(user.id, user.orgId, user.onboardingStep, dto);
    }

    const slug = await generateUniqueOrgSlug(this.prisma, dto.company_name);

    let subdomain: string | null = null;
    if (dto.subdomain) {
      if (!isValidSubdomain(dto.subdomain)) {
        throw new ConflictException(
          'Subdomain is invalid. Use 2-63 lowercase letters, digits or hyphens (e.g. skylinedev).',
        );
      }
      subdomain = normalizeSubdomain(dto.subdomain);
      await this.assertSubdomainAvailable(subdomain);
    }

    let customDomain: string | null = null;
    if (dto.custom_domain) {
      if (!isValidDomain(dto.custom_domain)) {
        throw new ConflictException('Custom domain is invalid. Example: example.com');
      }
      customDomain = normalizeDomain(dto.custom_domain);
      await this.assertCustomDomainAvailable(customDomain);
    }

    const adminRole = await this.prisma.role.findUniqueOrThrow({
      where: { key: 'admin' },
    });

    const { organisation, updatedUser } = await this.prisma.$transaction(async (tx) => {
      const organisation = await tx.organisation.create({
        data: {
          name: dto.company_name,
          slug,
          status: 'pending',
          industry: dto.industry ?? null,
          country: dto.country ?? null,
          currency: dto.currency ?? 'INR',
          timezone: dto.timezone ?? 'Asia/Kolkata',
          subdomain,
          customDomain,
          subdomainStatus: subdomain ? 'pending' : 'none',
          customDomainStatus: customDomain ? 'pending' : 'none',
        },
      });

      await tx.userRole.create({
        data: { userId: user.id, roleId: adminRole.id },
      });

      if (customDomain) {
        await tx.orgDomainRequest.create({
          data: {
            orgId: organisation.id,
            kind: 'custom_domain',
            customDomain,
            status: 'pending',
            requestedBy: user.id,
          },
        });
      }

      const updatedUser = await tx.user.update({
        where: { id: user.id },
        data: {
          orgId: organisation.id,
          onboardingStep: furthestOnboardingStep(user.onboardingStep, 'organisation'),
        },
      });

      await tx.auditLog.create({
        data: {
          orgId: organisation.id,
          actorId: user.id,
          action: 'org_registered_pending',
          entity: 'Organisation',
          entityId: organisation.id,
          metadata: { subdomain, customDomain } as any,
        },
      });

      await tx.notification.create({
        data: buildNotificationData({
          orgId: organisation.id,
          type: 'organisation_registration',
          title: `New organisation awaiting approval: ${organisation.name}`,
          body: `${organisation.name} (${slug}) registered${subdomain ? ` and requested subdomain ${subdomainHost(subdomain)}` : ''}${customDomain ? ` and/or custom domain ${customDomain}` : ''}. Review and approve or reject from the admin console.`,
          entity: 'Organisation',
          entityId: organisation.id,
        }),
      });

      return { organisation, updatedUser };
    });

    const tokens = await this.issueTokens(user.id, organisation.id, ['admin']);

    return {
      organisation: toSafeOrganisation(organisation),
      user: toSafeUser(updatedUser),
      onboardingStep: updatedUser.onboardingStep,
      nextStep: nextOnboardingStep(updatedUser.onboardingStep),
      ...tokens,
    };
  }

  // Re-submit path for Step 2 — the org already exists for this user.
  // Updates the same row (name / country / currency / timezone always;
  // subdomain only if actually sent and different, re-validated for
  // availability against everyone except itself).
  private async updateOrganisationStep(
    userId: string,
    orgId: string,
    currentStep: OnboardingStep,
    dto: OnboardingOrganisationDto,
  ) {
    const current = await this.prisma.organisation.findUniqueOrThrow({
      where: { id: orgId },
    });

    let subdomainUpdate: { subdomain: string | null; subdomainStatus: string } | null = null;
    if (dto.subdomain !== undefined) {
      if (dto.subdomain) {
        if (!isValidSubdomain(dto.subdomain)) {
          throw new ConflictException(
            'Subdomain is invalid. Use 2-63 lowercase letters, digits or hyphens (e.g. skylinedev).',
          );
        }
        const normalized = normalizeSubdomain(dto.subdomain);
        if (normalized !== current.subdomain) {
          await this.assertSubdomainAvailable(normalized);
        }
        subdomainUpdate = { subdomain: normalized, subdomainStatus: 'pending' };
      } else {
        subdomainUpdate = { subdomain: null, subdomainStatus: 'none' };
      }
    }

    const organisation = await this.prisma.organisation.update({
      where: { id: orgId },
      data: {
        name: dto.company_name,
        industry: dto.industry ?? current.industry,
        country: dto.country ?? current.country,
        currency: dto.currency ?? current.currency,
        timezone: dto.timezone ?? current.timezone,
        ...(subdomainUpdate ?? {}),
      },
    });

    const userRoles = await this.prisma.userRole.findMany({
      where: { userId },
      include: { role: true },
    });
    const roles = userRoles.map((ur) => ur.role.key);

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: { onboardingStep: furthestOnboardingStep(currentStep, 'organisation') },
    });

    const tokens = await this.issueTokens(userId, organisation.id, roles);

    return {
      organisation: toSafeOrganisation(organisation),
      user: toSafeUser(updatedUser),
      onboardingStep: updatedUser.onboardingStep,
      nextStep: nextOnboardingStep(updatedUser.onboardingStep),
      ...tokens,
    };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: { userRoles: { include: { role: true } } },
    });

    if (!user || user.status !== 'active') {
      throw new UnauthorizedException('Invalid email or password');
    }

    const passwordMatches = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );
    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Org approval check — pending organisations cannot log in until super admin approves
    if (user.orgId) {
      const org = await this.prisma.organisation.findUnique({ where: { id: user.orgId } });
      if (org && org.status === 'pending') {
        throw new UnauthorizedException('Organisation pending approval — please wait for super admin approval');
      }
      if (org && org.status === 'disabled') {
        throw new UnauthorizedException('Organisation is disabled');
      }
      if (org && org.status === 'draft') {
        throw new UnauthorizedException('Organisation not yet activated');
      }
    }

    const roles = user.userRoles.map((userRole) => userRole.role.key);
    const tokens = await this.issueTokens(user.id, user.orgId, roles);

    return { user: toSafeUser(user), ...tokens };
  }

  async refresh(rawToken: string) {
    const existing = await this.findActiveRefreshToken(rawToken);

    const user = await this.prisma.user.findUnique({
      where: { id: existing.userId },
      include: { userRoles: { include: { role: true } } },
    });
    if (!user || user.status !== 'active') {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    await this.prisma.refreshToken.update({
      where: { id: existing.id },
      data: { revokedAt: new Date() },
    });

    const roles = user.userRoles.map((userRole) => userRole.role.key);
    return this.issueTokens(user.id, user.orgId, roles);
  }

  async logout(rawToken: string) {
    const tokenHash = hashToken(rawToken);
    const existing = await this.prisma.refreshToken.findFirst({
      where: { tokenHash },
    });

    if (existing && !existing.revokedAt) {
      await this.prisma.refreshToken.update({
        where: { id: existing.id },
        data: { revokedAt: new Date() },
      });
    }

    return { success: true };
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { organisation: true },
    });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    const organisation = user.organisation
      ? toSafeOrganisation(user.organisation)
      : null;
    return { user: toSafeUser(user), organisation };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const matches = await bcrypt.compare(dto.current_password, user.passwordHash);
    if (!matches) {
      throw new UnauthorizedException('Current password is incorrect');
    }
    if (dto.current_password === dto.new_password) {
      throw new UnauthorizedException(
        'New password must be different from your current password',
      );
    }

    const passwordHash = await bcrypt.hash(dto.new_password, BCRYPT_COST_FACTOR);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash, mustChangePassword: false },
    });
    return { success: true };
  }

  async forgotPassword(
    email: string,
  ): Promise<{ success: boolean; resetToken?: string }> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    // Always report success to avoid account enumeration.
    if (!user) {
      return { success: true };
    }
    const token = generateRandomToken(32);
    this.resetTokens.set(token, {
      email: user.email,
      expires: Date.now() + 1000 * 60 * 60,
    });
    // TODO: send a real email; for now return the token so local dev can complete the flow.
    return { success: true, resetToken: token };
  }

  async resetPassword(
    token: string,
    newPassword: string,
  ): Promise<{ success: boolean }> {
    const entry = this.resetTokens.get(token);
    if (!entry || entry.expires < Date.now()) {
      throw new UnauthorizedException('Invalid or expired reset token');
    }
    const user = await this.prisma.user.findUnique({
      where: { email: entry.email },
    });
    if (!user) {
      throw new UnauthorizedException('Invalid or expired reset token');
    }
    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_COST_FACTOR);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, mustChangePassword: false },
    });
    this.resetTokens.delete(token);
    return { success: true };
  }

  private async findActiveRefreshToken(rawToken: string) {
    const tokenHash = hashToken(rawToken);
    const existing = await this.prisma.refreshToken.findFirst({
      where: { tokenHash },
    });

    if (!existing || existing.revokedAt || existing.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    return existing;
  }

  private async issueTokens(
    userId: string,
    orgId: string | null,
    roles: string[],
  ) {
    const payload: JwtPayload = { sub: userId, orgId, roles };
    const accessToken = await this.jwtService.signAsync(
      payload as object,
      {
        secret: process.env.JWT_SECRET,
        expiresIn: this.accessExpiresIn,
      } as Parameters<JwtService['signAsync']>[1],
    );

    const rawRefreshToken = generateRandomToken();
    const tokenHash = hashToken(rawRefreshToken);
    const expiresAt = new Date(
      Date.now() + parseDuration(this.refreshExpiresIn),
    );

    await this.prisma.refreshToken.create({
      data: { userId, tokenHash, expiresAt },
    });

    return { access_token: accessToken, refresh_token: rawRefreshToken };
  }

  // Public check used by the sign-up form to show availability live and to
  // suggest alternatives when the requested subdomain is taken.
  async checkSubdomainAvailability(subdomain: string) {
    const label = normalizeSubdomain(subdomain);
    if (!isValidSubdomain(label)) {
      return { subdomain: label, available: false, reasons: ['invalid'], suggestions: [] };
    }
    const taken = await this.isSubdomainTaken(label);
    const reasons: string[] = [];
    if (taken === 'org') reasons.push('already_exists');
    else if (taken === 'pending') reasons.push('pending');
    return {
      subdomain: label,
      host: subdomainHost(label),
      available: taken === null,
      reasons,
      suggestions: taken ? generateSubdomainSuggestions(label) : [],
    };
  }

  // Returns 'org' if an organisation already holds it, 'pending' if a pending
  // subdomain request reserves it, else null when available.
  private async isSubdomainTaken(label: string): Promise<'org' | 'pending' | null> {
    const org = await this.prisma.organisation.findFirst({
      where: { subdomain: label },
      select: { id: true },
    });
    if (org) return 'org';
    const req = await this.prisma.orgDomainRequest.findFirst({
      where: { subdomain: label, status: { in: ['pending', 'approved'] } },
      select: { id: true },
    });
    if (req) return 'pending';
    return null;
  }

  // A subdomain is unavailable if another organisation is already using it
  // (active, pending, or reserved in an approved/rejected-but-held request).
  private async assertSubdomainAvailable(subdomain: string) {
    const label = normalizeSubdomain(subdomain);
    const taken = await this.isSubdomainTaken(label);
    if (taken === 'org') {
      throw new ConflictException(
        `Subdomain "${label}" is already taken on ${subdomainHost(label)}. Please choose another.`,
      );
    }
    if (taken === 'pending') {
      throw new ConflictException(
        `Subdomain "${label}" is currently pending or in use. Please choose another.`,
      );
    }
  }

  // A custom domain is unavailable if another organisation already owns it or
  // has a connecting/connected domain for it (globally unique).
  private async assertCustomDomainAvailable(domain: string) {
    const host = normalizeDomain(domain);
    const org = await this.prisma.organisation.findFirst({
      where: { customDomain: host },
      select: { id: true },
    });
    if (org) {
      throw new ConflictException(`Domain "${host}" is already mapped to another organisation.`);
    }
    const req = await this.prisma.orgDomainRequest.findFirst({
      where: { customDomain: host, status: { in: ['pending', 'approved', 'connected'] } },
      select: { id: true },
    });
    if (req) {
      throw new ConflictException(`Domain "${host}" is currently in use or pending.`);
    }
  }
}
