import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { OnboardingStep } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { StorageService } from '../../common/storage/storage.service';
import { TeamService } from '../team/team.service';
import { JwtPayload } from '../../common/types/jwt-payload.interface';
import { toSafeOrganisation } from '../../common/utils/mappers.util';
import { assertTemplateQuota } from '../../common/utils/plan-quota.util';
import { assertEligibleTemplateIds } from '../../common/utils/template-eligibility.util';
import { furthestOnboardingStep, nextOnboardingStep } from '../../common/utils/onboarding.util';
import { BusinessDetailsDto } from './dto/business-details.dto';
import { LogoUploadUrlDto } from './dto/logo-upload-url.dto';
import { SubscriptionStepDto } from './dto/subscription-step.dto';
import { TemplatesStepDto } from './dto/templates-step.dto';
import { ModulesStepDto } from './dto/modules-step.dto';
import { InviteStepDto } from './dto/invite-step.dto';

@Injectable()
export class OnboardingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly teamService: TeamService,
  ) {}

  // Step 3 — Business Details.
  async saveBusinessDetails(actor: JwtPayload, dto: BusinessDetailsDto) {
    const orgId = actor.orgId as string;
    const organisation = await this.prisma.organisation.update({
      where: { id: orgId },
      data: {
        city: dto.city ?? undefined,
        reraLicenseNo: dto.reraLicenseNo ?? undefined,
        gstin: dto.gstin ?? undefined,
        brandColour: dto.brandColour ?? undefined,
        logoUrl: dto.logoUrl ?? undefined,
      },
    });
    const onboardingStep = await this.advanceStep(actor.sub, 'business_details');
    return {
      organisation: toSafeOrganisation(organisation),
      onboardingStep,
      nextStep: nextOnboardingStep(onboardingStep),
    };
  }

  // Presigned upload URL for the logo shown on the same step. Org already
  // exists by now (created at Step 2), so this is a normal org-scoped
  // upload — no pre-signup nonce scheme needed.
  createLogoUploadUrl(actor: JwtPayload, dto: LogoUploadUrlDto) {
    return this.storage.createUploadUrl({
      orgId: actor.orgId as string,
      field: 'logo',
      filename: dto.filename,
      contentType: dto.contentType,
      size: dto.size,
    });
  }

  // Step 5 — Subscription (mandatory). Re-submitting replaces the org's
  // current active subscription in place rather than creating a second
  // one, so resuming and changing plan doesn't leave duplicate rows.
  async saveSubscription(actor: JwtPayload, dto: SubscriptionStepDto) {
    const orgId = actor.orgId as string;
    const plan = await this.prisma.plan.findUnique({ where: { id: dto.planId } });
    if (!plan || !plan.isActive) {
      throw new NotFoundException('Plan not found');
    }

    const billingCycle = dto.billingCycle ?? 'monthly';
    const isYearly = billingCycle === 'yearly';
    const amount = isYearly ? plan.priceYearly : plan.priceMonthly;
    const mrr = isYearly ? Math.round(amount / 12) : amount;
    const renewsAt = isYearly
      ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const existing = await this.prisma.subscription.findFirst({
      where: { orgId, status: 'active' },
      orderBy: { createdAt: 'desc' },
    });

    const subscription = existing
      ? await this.prisma.subscription.update({
          where: { id: existing.id },
          data: {
            planId: plan.id,
            billingCycle: billingCycle as any,
            amount,
            mrr,
            currency: 'INR',
            renewsAt,
          },
        })
      : await this.prisma.subscription.create({
          data: {
            orgId,
            planId: plan.id,
            billingCycle: billingCycle as any,
            status: 'active',
            amount,
            mrr,
            currency: 'INR',
            renewsAt,
          },
        });

    const onboardingStep = await this.advanceStep(actor.sub, 'subscription');
    return {
      subscription: {
        id: subscription.id,
        planId: subscription.planId,
        billingCycle: subscription.billingCycle,
      },
      onboardingStep,
      nextStep: nextOnboardingStep(onboardingStep),
    };
  }

  // Step 6 — Templates (mandatory). Wholesale replace: re-submitting
  // Templates replaces the org's assignments rather than appending to
  // them, so going back and changing the selection is clean.
  async saveTemplates(actor: JwtPayload, dto: TemplatesStepDto) {
    const orgId = actor.orgId as string;
    await assertEligibleTemplateIds(this.prisma, dto.templateIds);

    const subscription = await this.prisma.subscription.findFirst({
      where: { orgId, status: 'active' },
      orderBy: { createdAt: 'desc' },
    });
    if (subscription) {
      const plan = await this.prisma.plan.findUnique({ where: { id: subscription.planId } });
      assertTemplateQuota(plan, dto.templateIds.length);
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.organisationTemplate.deleteMany({ where: { orgId } });
      if (dto.templateIds.length > 0) {
        await tx.organisationTemplate.createMany({
          data: dto.templateIds.map((templateId) => ({
            orgId,
            templateId,
            assignedBy: actor.sub,
          })),
        });
      }
    });

    const onboardingStep = await this.advanceStep(actor.sub, 'templates');
    return {
      templateIds: dto.templateIds,
      onboardingStep,
      nextStep: nextOnboardingStep(onboardingStep),
    };
  }

  // Step 4 — Modules (skippable, informational only — no enforcement
  // reads this yet). skip:true (or omitting enabledModules) advances past
  // the step without touching the org's saved list.
  async saveModules(actor: JwtPayload, dto: ModulesStepDto) {
    const orgId = actor.orgId as string;
    const organisation =
      dto.skip || dto.enabledModules === undefined
        ? await this.prisma.organisation.findUniqueOrThrow({ where: { id: orgId } })
        : await this.prisma.organisation.update({
            where: { id: orgId },
            data: { enabledModules: dto.enabledModules },
          });

    const onboardingStep = await this.advanceStep(actor.sub, 'modules');
    return {
      enabledModules: organisation.enabledModules,
      onboardingStep,
      nextStep: nextOnboardingStep(onboardingStep),
    };
  }

  // Step 7 — Invite team (skippable). Each invite fires immediately via
  // the existing TeamService.invite() — same provisioning path as
  // /team/invite. A per-entry failure (e.g. duplicate email) is reported
  // back but never blocks the others or onboarding progress.
  async sendInvites(actor: JwtPayload, dto: InviteStepDto) {
    const sent: unknown[] = [];
    const failed: { email: string; reason: string }[] = [];

    for (const invite of dto.invites) {
      try {
        // No names — see InviteEntryDto. provisionInvitedUser accepts
        // them as optional, so this creates the user with firstName/
        // lastName left null; every display site falls back to email.
        const user = await this.teamService.invite(actor, {
          email: invite.email,
          role: invite.role,
        });
        sent.push(user);
      } catch (err) {
        failed.push({
          email: invite.email,
          reason: err instanceof Error ? err.message : 'Failed to send invite',
        });
      }
    }

    const onboardingStep = await this.advanceStep(actor.sub, 'invite');
    return { sent, failed, onboardingStep, nextStep: nextOnboardingStep(onboardingStep) };
  }

  // Step 8 — Connect channels (still a placeholder, no backend
  // integration). Reaching or skipping it is what marks onboarding
  // 'completed' — gated on the two actually-mandatory steps having real
  // data (checked against the DB, not just the stored step pointer, so
  // this can't be bypassed by resubmitting an earlier step's endpoint).
  async complete(actor: JwtPayload) {
    const orgId = actor.orgId as string;
    const [subscription, templateCount] = await Promise.all([
      this.prisma.subscription.findFirst({ where: { orgId, status: 'active' } }),
      this.prisma.organisationTemplate.count({ where: { orgId } }),
    ]);
    if (!subscription || templateCount === 0) {
      throw new ConflictException(
        'Complete Subscription and Templates before finishing setup.',
      );
    }

    const onboardingStep = await this.advanceStep(actor.sub, 'completed');

    // Tell the frontend whether the org is actually usable yet — finishing
    // the wizard and being approved are two different gates (see
    // OrgApprovedGuard). A still-pending org should land on a holding
    // screen, not a dashboard that 403s on its first real request.
    const organisation = await this.prisma.organisation.findUniqueOrThrow({
      where: { id: orgId },
      select: { status: true },
    });

    return { onboardingStep, organisationStatus: organisation.status };
  }

  // Shared "advance, never regress" update — re-submitting an earlier
  // step never rolls onboardingStep backwards, it only moves forward.
  private async advanceStep(
    userId: string,
    justCompleted: OnboardingStep,
  ): Promise<OnboardingStep> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const next = furthestOnboardingStep(user.onboardingStep, justCompleted);
    if (next === user.onboardingStep) return next;
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { onboardingStep: next },
    });
    return updated.onboardingStep;
  }
}
