import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { OnboardingStep, Role, User, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../database/prisma.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { OnboardingAccountDto } from './dto/onboarding-account.dto';
import { OnboardingOrganisationDto } from './dto/onboarding-organisation.dto';
import { ResumeSignupDto } from './dto/resume-signup.dto';
import { ResolveDraftDto } from './dto/resolve-draft.dto';
import { JwtPayload } from '../../common/types/jwt-payload.interface';
import {
  nextOnboardingStep,
  furthestOnboardingStep,
} from '../../common/utils/onboarding.util';
import {
  generateNumericCode,
  generateRandomToken,
  hashToken,
  parseDuration,
} from '../../common/utils/tokens.util';
import { generateUniqueOrgSlug } from '../../common/utils/slug.util';
import { normalizePhoneNumber } from '../../common/utils/phone.util';
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
  extractSubdomainFromHost,
} from '../../common/utils/domain.util';
import { buildNotificationData } from '../../common/utils/notifications.util';
import { generateUniqueSubdomain } from '../../common/utils/org-site.util';
import {
  PERMISSION_MODULES,
  computeEffectivePermissions,
  emptyModulePermission,
  mergeRolePermissions,
  SYSTEM_ORG_ID,
} from '../../common/utils/permissions.util';
import { EmailService } from '../email/email.service';

const BCRYPT_COST_FACTOR = 12;

@Injectable()
export class AuthService {
  private readonly accessExpiresIn = process.env.JWT_ACCESS_EXPIRES_IN ?? '15m';
  private readonly refreshExpiresIn =
    process.env.JWT_REFRESH_EXPIRES_IN ?? '30d';

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
  ) {}

  private uniqueSubdomain(source: string, excludeOrgId?: string) {
    return generateUniqueSubdomain(
      this.prisma as unknown as Parameters<typeof generateUniqueSubdomain>[0],
      source,
      excludeOrgId,
    );
  }

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
    const adminRole = await this.prisma.role.findFirstOrThrow({
      where: { orgId: null, key: 'admin' },
    });

    // --- Organisation domain identity (subdomain / custom domain) ---
    // Every organisation is automatically assigned a unique platform
    // subdomain (its default login URL, e.g. "<slug>.ipixxel.ae"). If the
    // registrant typed one it's used instead and kept pending for Super Admin
    // approval — but an auto-generated one is active immediately.
    let subdomain: string | null = null;
    let subdomainAuto = false;
    if (dto.subdomain) {
      if (!isValidSubdomain(dto.subdomain)) {
        throw new ConflictException(
          'Subdomain is invalid. Use 2-63 lowercase letters, digits or hyphens (e.g. skylinedev).',
        );
      }
      subdomain = normalizeSubdomain(dto.subdomain);
      await this.assertSubdomainAvailable(subdomain);
    } else {
      subdomain = await this.uniqueSubdomain(slug);
      subdomainAuto = true;
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
            // Auto-assigned subdomains are active immediately (they're the
            // org's default login URL); user-requested ones stay pending until
            // a Super Admin approves the label.
            subdomain,
            customDomain,
            subdomainStatus: subdomainAuto ? 'active' : 'pending',
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

        if (subdomain) {
          await tx.orgDomainRequest.create({
            data: {
              orgId: organisation.id,
              kind: 'subdomain',
              subdomain,
              status: subdomainAuto ? 'approved' : 'pending',
              requestedBy: user.id,
              reviewedAt: subdomainAuto ? new Date() : undefined,
              reviewedBy: subdomainAuto ? user.id : undefined,
            },
          });
        }
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
    void this.emailService.sendOrgStatusEmail({
      to: dto.work_email,
      recipientName: [dto.first_name, dto.last_name].filter(Boolean).join(' ') || undefined,
      orgName: dto.company_name,
      status: 'submitted',
    });

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
      // Incomplete draft under this email — don't silently resume it (that
      // used to discard whatever the caller just retyped here, see
      // resumeExistingDraft/restartExistingDraft). Report the match; the
      // frontend asks the user whether to continue or start fresh.
      return {
        status: 'exists_incomplete' as const,
        existingUserId: existing.id,
        firstName: existing.firstName,
        lastName: existing.lastName,
        onboardingStep: existing.onboardingStep,
      };
    }

    // Duplicate check for phone, same idea as email above.
    //
    // Normalized before comparing AND before storing: "+91 9825041200",
    // "+919825041200" and "+91 98250 41200" are the same number, and an
    // exact-string check let all three through as "different" numbers.
    const normalizedPhone = normalizePhoneNumber(dto.phone_number);
    const existingByPhone = await this.prisma.user.findFirst({
      where: { phoneNumber: normalizedPhone },
    });
    if (existingByPhone) {
      if (existingByPhone.onboardingStep === 'completed') {
        throw new ConflictException(
          'This phone number is already registered to another account.',
        );
      }
      // Same offer as the email-match case above — this email is new, but
      // the phone belongs to someone's still-in-progress signup.
      return {
        status: 'exists_incomplete' as const,
        existingUserId: existingByPhone.id,
        firstName: existingByPhone.firstName,
        lastName: existingByPhone.lastName,
        onboardingStep: existingByPhone.onboardingStep,
      };
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_COST_FACTOR);
    const user = await this.prisma.user.create({
      data: {
        firstName: dto.first_name,
        lastName: dto.last_name,
        email: dto.work_email,
        phoneNumber: normalizedPhone,
        passwordHash,
        status: 'active',
        onboardingStep: 'account',
      },
    });

    // No roles yet — the admin role is assigned once the organisation
    // exists, at Step 2.
    const tokens = await this.issueTokens(user.id, null, []);
    await this.issueEmailVerification(user);

    return {
      status: 'created' as const,
      user: toSafeUser(user),
      onboardingStep: user.onboardingStep,
      nextStep: nextOnboardingStep(user.onboardingStep),
      email_verification_required: true,
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

    if (!user.emailVerifiedAt) {
      await this.issueEmailVerification(user);
    }

    return this.buildResumePayload(user);
  }

  // Step 1 collision, "Continue previous setup" branch — the caller picked
  // up their old draft and (optionally) edited name/email/phone/password on
  // the retry. Updates those fields on the SAME user row (onboardingStep is
  // left alone, so the wizard still resumes wherever they'd got to) rather
  // than silently keeping the stale values, which is the bug this fixes.
  async resumeExistingDraft(dto: ResolveDraftDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { id: dto.existingUserId },
    });
    if (!existingUser) {
      throw new NotFoundException('No signup in progress for this account');
    }
    if (existingUser.onboardingStep === 'completed') {
      throw new ConflictException(
        'This account has already finished setup — please sign in instead.',
      );
    }

    const normalizedPhone = normalizePhoneNumber(dto.phone_number);
    if (dto.work_email !== existingUser.email) {
      const emailTaken = await this.prisma.user.findUnique({
        where: { email: dto.work_email },
      });
      if (emailTaken) {
        throw new ConflictException('Email already registered to another account.');
      }
    }
    if (normalizedPhone !== existingUser.phoneNumber) {
      const phoneTaken = await this.prisma.user.findFirst({
        where: { phoneNumber: normalizedPhone, id: { not: existingUser.id } },
      });
      if (phoneTaken) {
        throw new ConflictException(
          'This phone number is already registered to another account.',
        );
      }
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_COST_FACTOR);
    const updated = await this.prisma.user.update({
      where: { id: existingUser.id },
      data: {
        firstName: dto.first_name,
        lastName: dto.last_name,
        email: dto.work_email,
        phoneNumber: normalizedPhone,
        passwordHash,
      },
      include: { userRoles: { include: { role: true } } },
    });

    if (!updated.emailVerifiedAt) {
      await this.issueEmailVerification(updated);
    }

    return this.buildResumePayload(updated);
  }

  // Step 1 collision, "Start fresh instead" branch. The selected signup is
  // explicitly discarded, including its draft organisation and onboarding
  // records, before a new account is created from the submitted values.
  async restartExistingDraft(dto: ResolveDraftDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { id: dto.existingUserId },
    });
    if (!existingUser) {
      throw new NotFoundException('No signup in progress for this account');
    }
    if (existingUser.onboardingStep === 'completed') {
      throw new ConflictException(
        'This account has already finished setup — please sign in instead.',
      );
    }

    const normalizedPhone = normalizePhoneNumber(dto.phone_number);
    if (dto.work_email !== existingUser.email) {
      const emailTaken = await this.prisma.user.findUnique({
        where: { email: dto.work_email },
      });
      if (emailTaken) {
        throw new ConflictException('Email already registered to another account.');
      }
    }
    if (normalizedPhone !== existingUser.phoneNumber) {
      const phoneTaken = await this.prisma.user.findFirst({
        where: { phoneNumber: normalizedPhone, id: { not: existingUser.id } },
      });
      if (phoneTaken) {
        throw new ConflictException(
          'This phone number is already registered to another account.',
        );
      }
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_COST_FACTOR);
    const replacement = await this.prisma.$transaction(async (tx) => {
      if (existingUser.orgId) {
        const organisation = await tx.organisation.findUnique({
          where: { id: existingUser.orgId },
          select: { status: true },
        });
        if (!organisation || organisation.status !== 'draft') {
          throw new ConflictException(
            'This setup is no longer an incomplete draft and cannot be restarted.',
          );
        }

        // User -> Organisation is intentionally not cascade-deleted, so
        // remove every user in this abandoned draft before its org row.
        await tx.user.deleteMany({ where: { orgId: existingUser.orgId } });
        await tx.organisation.delete({ where: { id: existingUser.orgId } });
      } else {
        await tx.user.delete({ where: { id: existingUser.id } });
      }

      return tx.user.create({
        data: {
          firstName: dto.first_name,
          lastName: dto.last_name,
          email: dto.work_email,
          phoneNumber: normalizedPhone,
          passwordHash,
          status: 'active',
          onboardingStep: 'account',
        },
      });
    });

    const tokens = await this.issueTokens(replacement.id, null, []);
    await this.issueEmailVerification(replacement);

    return {
      status: 'created' as const,
      user: toSafeUser(replacement),
      onboardingStep: replacement.onboardingStep,
      nextStep: nextOnboardingStep(replacement.onboardingStep),
      email_verification_required: true,
      ...tokens,
    };
  }

  // Shared by resumeSignup and resumeExistingDraft — everything after the
  // user row itself has been loaded (with its roles) and validated.
  private async buildResumePayload(
    user: User & { userRoles: (UserRole & { role: Role })[] },
  ) {
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
      email_verification_required: !user.emailVerifiedAt,
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

    if (!user.emailVerifiedAt) {
      throw new BadRequestException(
        'Please verify your email before creating an organisation.',
      );
    }

    if (user.orgId) {
      return this.updateOrganisationStep(user.id, user.orgId, user.onboardingStep, dto);
    }

    const slug = await generateUniqueOrgSlug(this.prisma, dto.company_name);

    // Every organisation gets a unique platform subdomain as its default login
    // URL. A user-typed subdomain stays pending for Super Admin approval; an
    // auto-generated one (from the org slug) is active immediately.
    let subdomain: string | null = null;
    let subdomainAuto = false;
    if (dto.subdomain) {
      if (!isValidSubdomain(dto.subdomain)) {
        throw new ConflictException(
          'Subdomain is invalid. Use 2-63 lowercase letters, digits or hyphens (e.g. skylinedev).',
        );
      }
      subdomain = normalizeSubdomain(dto.subdomain);
      await this.assertSubdomainAvailable(subdomain);
    } else {
      subdomain = await this.uniqueSubdomain(slug);
      subdomainAuto = true;
    }

    let customDomain: string | null = null;
    if (dto.custom_domain) {
      if (!isValidDomain(dto.custom_domain)) {
        throw new ConflictException('Custom domain is invalid. Example: example.com');
      }
      customDomain = normalizeDomain(dto.custom_domain);
      await this.assertCustomDomainAvailable(customDomain);
    }

    const adminRole = await this.prisma.role.findFirstOrThrow({
      where: { orgId: null, key: 'admin' },
    });

    const { organisation, updatedUser } = await this.prisma.$transaction(async (tx) => {
      const organisation = await tx.organisation.create({
        data: {
          name: dto.company_name,
          slug,
          // 'draft', not 'pending': the wizard has 6 steps left after this
          // one, and nothing here is actually ready for Super Admin review
          // yet. Flips to 'pending' — with the "awaiting approval" audit
          // log/notification — once OnboardingService.complete() runs, see
          // there for why.
          status: 'draft',
          industry: dto.industry ?? null,
          teamSize: dto.teamSize ?? null,
          country: dto.country ?? null,
          currency: dto.currency ?? 'INR',
          timezone: dto.timezone ?? 'Asia/Kolkata',
          subdomain,
          customDomain,
          subdomainStatus: subdomainAuto ? 'active' : 'pending',
          customDomainStatus: customDomain ? 'pending' : 'none',
        },
      });

      await tx.userRole.create({
        data: { userId: user.id, roleId: adminRole.id },
      });

      if (subdomain) {
        await tx.orgDomainRequest.create({
          data: {
            orgId: organisation.id,
            kind: 'subdomain',
            subdomain,
            status: subdomainAuto ? 'approved' : 'pending',
            requestedBy: user.id,
            reviewedAt: subdomainAuto ? new Date() : undefined,
            reviewedBy: subdomainAuto ? user.id : undefined,
          },
        });
      }
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

    let subdomainUpdate: { subdomain: string | null; subdomainStatus: string; auto?: boolean } | null = null;
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
    } else if (!current.subdomain) {
      // Auto-assign a unique subdomain the first time (resumed/organisation
      // step with no subdomain yet) — it becomes the org's default login URL.
      const auto = await this.uniqueSubdomain(current.slug, orgId);
      subdomainUpdate = { subdomain: auto, subdomainStatus: 'active', auto: true };
    }

    const organisation = await this.prisma.organisation.update({
      where: { id: orgId },
      data: {
        name: dto.company_name,
        industry: dto.industry ?? current.industry,
        teamSize: dto.teamSize ?? current.teamSize,
        country: dto.country ?? current.country,
        currency: dto.currency ?? current.currency,
        timezone: dto.timezone ?? current.timezone,
        ...(subdomainUpdate ?? {}),
      },
    });

    if (subdomainUpdate?.subdomain) {
      const pendingSub = await this.prisma.orgDomainRequest.findFirst({
        where: { orgId, kind: 'subdomain', status: 'pending' },
      });
      if (pendingSub) {
        await this.prisma.orgDomainRequest.update({
          where: { id: pendingSub.id },
          data: { subdomain: subdomainUpdate.subdomain },
        });
      } else if (subdomainUpdate.auto) {
        await this.prisma.orgDomainRequest.create({
          data: {
            orgId,
            kind: 'subdomain',
            subdomain: subdomainUpdate.subdomain,
            status: 'approved',
            requestedBy: userId,
            reviewedAt: new Date(),
            reviewedBy: userId,
          },
        });
      } else {
        await this.prisma.orgDomainRequest.create({
          data: {
            orgId,
            kind: 'subdomain',
            subdomain: subdomainUpdate.subdomain,
            status: 'pending',
            requestedBy: userId,
          },
        });
      }
    }

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
      select: {
        id: true,
        orgId: true,
        firstName: true,
        lastName: true,
        email: true,
        phoneNumber: true,
        passwordHash: true,
        status: true,
        mustChangePassword: true,
        createdAt: true,
        onboardingStep: true,
        userRoles: { select: { role: { select: { key: true } } } },
      },
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

    const roles = user.userRoles.map((userRole) => userRole.role.key);
    const isSuperAdmin = roles.includes('super_admin');

    if (dto.host && !isSuperAdmin) {
      try {
        const portal = await this.resolveLoginHost(dto.host);
        if (portal && user.orgId !== portal.id) {
          throw new UnauthorizedException(
            'This login page belongs to another organisation. Use your organisation subdomain.',
          );
        }
      } catch (err) {
        if (err instanceof UnauthorizedException) throw err;
        // Host lookup must not take login down if domain tables are incomplete.
      }
    }

    // Org approval check — pending organisations cannot use the dashboard
    // until a Super Admin approves. Draft / incomplete signups are allowed
    // through so the wizard can be resumed from /register.
    let orgStatus: string | null = null;
    if (user.orgId) {
      const org = await this.prisma.organisation.findUnique({
        where: { id: user.orgId },
        select: { status: true },
      });
      orgStatus = org?.status ?? null;
      if (org && org.status === 'pending' && user.onboardingStep === 'completed') {
        throw new UnauthorizedException('Organisation pending approval — please wait for super admin approval');
      }
      if (org && org.status === 'disabled') {
        throw new UnauthorizedException('Organisation is disabled');
      }
      if (org && org.status === 'rejected') {
        throw new UnauthorizedException('Organisation registration was rejected');
      }
    }

    const tokens = await this.issueTokens(user.id, user.orgId, roles);

    const safeUser = toSafeUser(user);
    // Password changes are mandatory for organisation users provisioned by
    // an Organisation Admin. Platform Super Admins use their managed admin
    // credentials and must not be redirected into the org-user flow.
    if (!user.orgId) {
      safeUser.must_change_password = false;
    }

    const isOrgAdmin = roles.includes('admin');
    const stillInDraftSignup =
      !isSuperAdmin &&
      isOrgAdmin &&
      user.onboardingStep !== 'completed' &&
      (orgStatus === null || orgStatus === 'draft');

    return {
      user: safeUser,
      roles,
      onboarding_incomplete: stillInDraftSignup,
      ...tokens,
    };
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
    const permissions = organisation
      ? await this.effectivePermissions(userId, organisation.id)
      : null;
    return { user: toSafeUser(user), organisation, permissions };
  }

  /** Effective page/action permissions for a user within their org. */
  private async effectivePermissions(userId: string, orgId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        orgId: true,
        userRoles: { select: { role: { select: { key: true } } } },
        userPermissions: {
          select: {
            moduleKey: true,
            canView: true,
            canAdd: true,
            canEdit: true,
            canDelete: true,
            canApprove: true,
          },
        },
      },
    });
    if (!user || user.orgId !== orgId) {
      return null;
    }

    const roleKeys = user.userRoles.map((ur) => ur.role.key);
    const rawRolePermissions = await this.prisma.roleModulePermission.findMany({
      where: {
        orgId: { in: [orgId, SYSTEM_ORG_ID] },
        role: { key: { in: roleKeys } },
      },
      select: {
        orgId: true,
        role: { select: { key: true } },
        moduleKey: true,
        canView: true,
        canAdd: true,
        canEdit: true,
        canDelete: true,
        canApprove: true,
      },
    });

    const rolePermissions = mergeRolePermissions(rawRolePermissions);

    const effective = computeEffectivePermissions({
      roleKeys,
      rolePermissions,
      userOverrides: user.userPermissions,
    });

    const result: Record<string, Record<string, boolean>> = {};
    for (const module of PERMISSION_MODULES) {
      const value = effective.byModule[module.key] ?? emptyModulePermission(module.key);
      result[module.key] = {
        view: value.canView,
        add: value.canAdd,
        edit: value.canEdit,
        delete: value.canDelete,
        approve: value.canApprove,
      };
    }
    return result;
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

  async forgotPassword(email: string): Promise<{ success: boolean }> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    // Always report success to avoid account enumeration.
    if (!user) {
      return { success: true };
    }

    await this.prisma.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    });

    const token = generateRandomToken(32);
    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    try {
      const emailService = new EmailService(this.prisma);
      const recipientName = [user.firstName, user.lastName]
        .filter(Boolean)
        .join(' ');
      const result = await emailService.sendPasswordResetEmail({
        to: user.email,
        recipientName: recipientName || undefined,
        resetToken: token,
      });
      if (!result.success) {
        console.error(`[Forgot Password] Could not deliver email: ${result.error}`);
      }
    } catch (err: any) {
      console.error(`[Forgot Password] Could not deliver email: ${err.message}`);
    }

    return { success: true };
  }

  async resetPassword(
    token: string,
    newPassword: string,
  ): Promise<{ success: boolean }> {
    const entry = await this.prisma.passwordResetToken.findFirst({
      where: {
        tokenHash: hashToken(token),
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
    });
    if (!entry) {
      throw new UnauthorizedException('Invalid or expired reset token');
    }
    const user = await this.prisma.user.findUnique({
      where: { id: entry.userId },
    });
    if (!user) {
      throw new UnauthorizedException('Invalid or expired reset token');
    }
    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_COST_FACTOR);
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: { passwordHash, mustChangePassword: false },
      });
      await tx.passwordResetToken.update({
        where: { id: entry.id },
        data: { usedAt: new Date() },
      });
      await tx.refreshToken.updateMany({
        where: { userId: user.id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    });
    return { success: true };
  }

  async verifyEmail(email: string, code: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new UnauthorizedException('Invalid or expired verification code');
    }
    if (user.emailVerifiedAt) {
      return { success: true, alreadyVerified: true, user: toSafeUser(user) };
    }

    const entry = await this.prisma.emailVerificationToken.findFirst({
      where: {
        userId: user.id,
        tokenHash: hashToken(code.trim()),
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });
    if (!entry) {
      throw new UnauthorizedException('Invalid or expired verification code');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.emailVerificationToken.update({
        where: { id: entry.id },
        data: { usedAt: new Date() },
      });
      return tx.user.update({
        where: { id: user.id },
        data: { emailVerifiedAt: new Date() },
      });
    });

    return { success: true, user: toSafeUser(updated) };
  }

  async resendVerification(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || user.emailVerifiedAt) {
      return { success: true };
    }

    const latest = await this.prisma.emailVerificationToken.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    });
    if (latest && Date.now() - latest.createdAt.getTime() < 30_000) {
      return { success: true };
    }

    await this.issueEmailVerification(user);
    return { success: true };
  }

  private async issueEmailVerification(user: User) {
    if (user.emailVerifiedAt) {
      return;
    }

    await this.prisma.emailVerificationToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    });

    const code = generateNumericCode(6);
    await this.prisma.emailVerificationToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(code),
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    try {
      const emailService = new EmailService(this.prisma);
      const recipientName = [user.firstName, user.lastName]
        .filter(Boolean)
        .join(' ');
      const result = await emailService.sendVerificationEmail({
        to: user.email,
        recipientName: recipientName || undefined,
        code,
      });
      if (!result.success) {
        console.error(
          `[Email Verification] Could not deliver email to ${user.email}: ${result.error}`,
        );
      }
    } catch (err: any) {
      console.error(
        `[Email Verification] Could not deliver email to ${user.email}: ${err.message}`,
      );
    }

    if (process.env.NODE_ENV !== 'production') {
      console.log(`[Email Verification] Code for ${user.email}: ${code}`);
    }
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
  //
  // Called unauthenticated (a brand-new visitor has no account yet), but
  // also called by an already-signed-up user resuming the wizard, whose
  // Step 2 form is pre-filled with their OWN org's existing subdomain —
  // apiFetch already attaches whatever token is in localStorage to every
  // request, so if one is present and valid we decode it (soft: an
  // invalid/expired/missing token just means "treat as anonymous", never
  // a 401 here) and exclude that caller's own org from the "taken" check,
  // so their own unchanged subdomain doesn't falsely show as taken.
  async checkSubdomainAvailability(subdomain: string, authHeader?: string) {
    const label = normalizeSubdomain(subdomain);
    if (!isValidSubdomain(label)) {
      return { subdomain: label, available: false, reasons: ['invalid'], suggestions: [] };
    }
    const excludeOrgId = this.tryDecodeOrgId(authHeader);
    const taken = await this.isSubdomainTaken(label, excludeOrgId);
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

  // Best-effort, never throws — a missing/invalid/expired token here just
  // means "treat this caller as anonymous", not an auth failure. Only used
  // by the one endpoint above that's intentionally unauthenticated but
  // still wants to recognise its own caller when possible.
  private tryDecodeOrgId(authHeader?: string): string | null {
    if (!authHeader?.startsWith('Bearer ')) return null;
    try {
      const payload = this.jwtService.verify<JwtPayload>(
        authHeader.slice('Bearer '.length),
        { secret: process.env.JWT_SECRET },
      );
      return payload.orgId ?? null;
    } catch {
      return null;
    }
  }

  // Returns 'org' if an organisation already holds it, 'pending' if a pending
  // subdomain request reserves it, else null when available. excludeOrgId
  // (the caller's own org, if known) is never considered "taken" — see
  // checkSubdomainAvailability above for why.
  private async isSubdomainTaken(
    label: string,
    excludeOrgId?: string | null,
  ): Promise<'org' | 'pending' | null> {
    const org = await this.prisma.organisation.findFirst({
      where: { subdomain: label, ...(excludeOrgId ? { id: { not: excludeOrgId } } : {}) },
      select: { id: true },
    });
    if (org) return 'org';
    const req = await this.prisma.orgDomainRequest.findFirst({
      where: {
        subdomain: label,
        status: { in: ['pending', 'approved'] },
        ...(excludeOrgId ? { orgId: { not: excludeOrgId } } : {}),
      },
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
  private async resolveLoginHost(host: string) {
    const normalized = host.trim().toLowerCase().replace(/:\d+$/, '').replace(/^www\./, '');
    const label = extractSubdomainFromHost(normalized);
    if (label) {
      return this.prisma.organisation.findFirst({
        where: { subdomain: label, subdomainStatus: 'active', status: 'active' },
        select: { id: true },
      });
    }
    return this.prisma.organisation.findFirst({
      where: { customDomain: normalized, customDomainStatus: 'connected', status: 'active' },
      select: { id: true },
    });
  }

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
