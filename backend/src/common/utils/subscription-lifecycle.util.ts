import { BadRequestException, ForbiddenException } from '@nestjs/common';
import type { NotificationType, Subscription, PrismaClient } from '@prisma/client';
import {
  assertLimit,
  countOrgLandingPages,
  resolveLimit,
} from './plan-quota.util';

// ---------------------------------------------------------------------------
// Subscription expiry lifecycle + plan-package gates for org-owned resources.
//
// Rules (all of them read the single PlatformConfig row, so a Super Admin can
// tune every knob live from the console):
//   - active/trial with renewsAt in the past  => `past_due`, grace starts
//     (graceEndsAt = renewsAt + gracePeriodDays). During the grace window the
//     org keeps working — publishing still allowed.
//   - past_due past graceEndsAt               => `expired` (behavior
//     'restrict') or `cancelled` (behavior 'cancel'). Publishing (and other
//     quota-gated actions) stop for `expired`.
//   - active/trial whose renewsAt falls within `notifyDays` => an
//     "expiring soon" popup notification is raised for the org's admins.
//
// The sweep is cheap (a single scan) and runs on a timer + lazily on every
// org billing read / publish attempt, so the UI always reflects reality even
// if the timer hasn't ticked yet.
// ---------------------------------------------------------------------------

export interface BillingExpiryConfig {
  gracePeriodDays: number;
  notifyDays: number;
  behavior: 'restrict' | 'cancel';
  message: string;
}

export const DEFAULT_BILLING_EXPIRY_CONFIG: BillingExpiryConfig = {
  gracePeriodDays: 7,
  notifyDays: 3,
  behavior: 'restrict',
  message:
    'Your subscription is due for renewal soon. Renew to keep your landing pages and features running without interruption.',
};

export type LifecycleRunSummary = {
  scanned: number;
  newlyPastDue: number;
  newlyExpired: number;
  newlyCancelled: number;
  expiringNotified: number;
  pastDueNotified: number;
  expiredNotified: number;
};

const EMPTY_SUMMARY: LifecycleRunSummary = {
  scanned: 0,
  newlyPastDue: 0,
  newlyExpired: 0,
  newlyCancelled: 0,
  expiringNotified: 0,
  pastDueNotified: 0,
  expiredNotified: 0,
};

const DAY_MS = 24 * 60 * 60 * 1000;

type PrismaLike = Pick<
  PrismaClient,
  | 'platformConfig'
  | 'subscription'
  | 'notification'
  | 'user'
  | 'landingPage'
>;

/** Read the Super Admin's expiry policy, falling back to safe defaults. */
export async function getBillingExpiryConfig(
  prisma: PrismaLike,
): Promise<BillingExpiryConfig> {
  try {
    const row = await prisma.platformConfig.findUnique({
      where: { id: 'platform' },
    });
    if (!row) return { ...DEFAULT_BILLING_EXPIRY_CONFIG };
    return {
      gracePeriodDays:
        typeof row.billingGracePeriodDays === 'number'
          ? row.billingGracePeriodDays
          : DEFAULT_BILLING_EXPIRY_CONFIG.gracePeriodDays,
      notifyDays:
        typeof row.billingExpiryNotifyDays === 'number'
          ? row.billingExpiryNotifyDays
          : DEFAULT_BILLING_EXPIRY_CONFIG.notifyDays,
      behavior:
        row.billingExpiryBehavior === 'cancel' ? 'cancel' : 'restrict',
      message:
        row.billingExpiryMessage?.trim() ||
        DEFAULT_BILLING_EXPIRY_CONFIG.message,
    };
  } catch {
    return { ...DEFAULT_BILLING_EXPIRY_CONFIG };
  }
}

/**
 * Statuses that keep the org usable (past_due = still inside the grace
 * window). Any other status blocks publishing and reads as "subscription
 * not active" across the platform.
 */
export function isSubscriptionUsable(status: string | null | undefined): boolean {
  return status === 'active' || status === 'trial' || status === 'past_due';
}

/**
 * Run one pass of the lifecycle over every non-cancelled subscription (or only
 * `orgId`'s, when given). Idempotent: transitions apply once and notifications
 * are deduped, so callers may run it freely from the timer or a per-request
 * lazy read.
 */
export async function applyOrgSubscriptionLifecycle(
  prisma: PrismaLike,
  orgId?: string,
): Promise<LifecycleRunSummary> {
  const summary: LifecycleRunSummary = { ...EMPTY_SUMMARY };
  try {
    const cfg = await getBillingExpiryConfig(prisma);
    const now = new Date();

    const subs = await prisma.subscription.findMany({
      where: {
        ...(orgId ? { orgId } : {}),
        status: { in: ['active', 'trial', 'past_due'] as never[] },
        renewsAt: { not: null },
      },
    });

    summary.scanned = subs.length;

    for (const sub of subs) {
      const renewsAt = sub.renewsAt as Date;

      // Term ended -> enter the grace window.
      if (
        (sub.status === 'active' || sub.status === 'trial') &&
        renewsAt.getTime() <= now.getTime()
      ) {
        await prisma.subscription.update({
          where: { id: sub.id },
          data: {
            status: 'past_due',
            graceEndsAt: new Date(renewsAt.getTime() + cfg.gracePeriodDays * DAY_MS),
          },
        });
        summary.newlyPastDue++;
        if (
          await ensureOrgNotified(prisma, sub, 'subscription_past_due', 'Subscription past due', cfg)
        ) {
          summary.pastDueNotified++;
        }
        continue;
      }

      // Still within the active term but expiring soon -> notify admins.
      if (
        (sub.status === 'active' || sub.status === 'trial') &&
        renewsAt.getTime() <= now.getTime() + cfg.notifyDays * DAY_MS
      ) {
        if (await ensureOrgNotified(prisma, sub, 'subscription_expiring', 'Subscription renewing soon', cfg)) {
          summary.expiringNotified++;
        }
        continue;
      }

      // Grace window over -> apply the configured expiry behaviour.
      if (
        sub.status === 'past_due' &&
        sub.graceEndsAt &&
        sub.graceEndsAt.getTime() <= now.getTime()
      ) {
        if (cfg.behavior === 'cancel') {
          await prisma.subscription.update({
            where: { id: sub.id },
            data: { status: 'cancelled', cancelledAt: now },
          });
          summary.newlyCancelled++;
        } else {
          await prisma.subscription.update({
            where: { id: sub.id },
            data: { status: 'expired' },
          });
          summary.newlyExpired++;
        }
        if (
          await ensureOrgNotified(prisma, sub, 'subscription_expired', 'Subscription ended', cfg)
        ) {
          summary.expiredNotified++;
        }
      }
    }
  } catch (err) {
    // Pre-migration prod DBs may lack grace_ends_at / the billing config
    // columns. Never let the sweep blow up a request — callers that need to
    // act (publish, quota asserts) still do their own hard checks.
    return summary;
  }
  return summary;
}

async function ensureOrgNotified(
  prisma: PrismaLike,
  sub: Subscription,
  type: NotificationType,
  title: string,
  cfg: BillingExpiryConfig,
): Promise<boolean> {
  // Already raised an unread event for this subscription? Skip — repeated
  // lazy reads must not spam the org's admins.
  const existing = await prisma.notification.count({
    where: { orgId: sub.orgId, type, entityId: sub.id, readAt: null },
  });
  if (existing > 0) return false;

  // Addressed to every active member of the org — the expiry popup is a
  // platform-wide "you're affected" signal, not just for the person who pays.
  const recipients = await prisma.user.findMany({
    where: { orgId: sub.orgId, status: 'active' },
    select: { id: true },
  });
  if (recipients.length === 0) return false;

  await prisma.notification.createMany({
    data: recipients.map((u) => ({
      orgId: sub.orgId,
      recipientId: u.id,
      type,
      title,
      body: cfg.message,
      entity: 'Subscription',
      entityId: sub.id,
    })),
  });
  return true;
}

/**
 * Renew the org's subscription, ending any grace/expired state. If the plan
 * or billing cycle changed the amount/mrr are left to changePlan — this only
 * extends the term on the current plan.
 */
export async function renewOrgSubscription(
  prisma: PrismaLike,
  orgId: string,
): Promise<Subscription> {
  // Re-run the lifecycle first so a stuck `past_due` reflects post-grace once
  // the config says so — after that, renewing a genuinely expired/cancelled
  // subscription is still allowed (an org can always buy its way back).
  await applyOrgSubscriptionLifecycle(prisma, orgId);

  const sub = await prisma.subscription.findFirst({
    where: { orgId, status: { not: 'cancelled' } },
  });
  if (!sub) {
    throw new BadRequestException(
      'No active subscription to renew — choose a plan to continue.',
    );
  }

  const periodMs = sub.billingCycle === 'yearly' ? 365 * DAY_MS : 30 * DAY_MS;
  const renewed = await prisma.subscription.update({
    where: { id: sub.id },
    data: {
      status: 'active',
      graceEndsAt: null,
      cancelledAt: null,
      renewsAt: new Date(Date.now() + periodMs),
    },
  });
  return renewed;
}

/**
 * Resolve the org's active plan (the one its subscription is on). Returns
 * null when there is no usable subscription. Applies the lazy lifecycle first
 * so `expired` reads don't masquerade as usable.
 */
export async function getOrgActivePlan(
  prisma: PrismaLike,
  orgId: string,
): Promise<{
  subscription: Subscription;
  plan: { name: string; limits: unknown };
} | null> {
  await applyOrgSubscriptionLifecycle(prisma, orgId);

  let sub = await prisma.subscription.findFirst({
    where: { orgId, status: { not: 'cancelled' } },
    include: { plan: true },
  });
  if (!sub || !isSubscriptionUsable(sub.status)) return null;

  return {
    subscription: sub,
    plan: { name: (sub as any).plan?.name, limits: (sub as any).plan?.limits },
  };
}

// --- Package gates ---------------------------------------------------------

/**
 * Enforce the plan's `landingPages` quota before creating/duplicating a page.
 * Unlimited (null) never blocks. The count and error copy live in plan-quota.
 */
export async function assertOrgLandingPageQuota(
  prisma: PrismaLike,
  orgId: string,
  addCount = 1,
): Promise<void> {
  const active = await getOrgActivePlan(prisma, orgId);
  if (!active) {
    throw new BadRequestException(
      'An active subscription is required to create landing pages. Choose a plan from Org Settings → Billing.',
    );
  }
  const used = await countOrgLandingPages(prisma, orgId);
  assertLimit(active.plan, 'landingPages', used, addCount);
}

/**
 * Gate for the publish/unpublish actions. Three independent checks, each with
 * a targeted message so the UI can offer the right action (upgrade vs renew):
 *   1. a usable subscription must exist (active / trial / inside grace);
 *   2. otherwise it must not be a plan without the `publishing` capability.
 * Nothing here modifies the landing page — callers perform the write.
 */
export async function assertOrgCanPublish(prisma: PrismaLike, orgId: string): Promise<void> {
  // Lazy sweep so a past-due-entering-grace / expired transition is reflected
  // the moment the user hits publish instead of waiting for the timer.
  await applyOrgSubscriptionLifecycle(prisma, orgId);

  const sub = await prisma.subscription.findFirst({
    where: { orgId, status: { not: 'cancelled' } },
    include: { plan: true },
  });

  if (!sub) {
    throw new ForbiddenException(
      'A paid plan is required to publish landing pages. Choose a plan from Org Settings → Billing, then try again.',
    );
  }
  if (!isSubscriptionUsable(sub.status)) {
    if (sub.status === 'expired') {
      throw new ForbiddenException(
        'Your subscription has expired. Renew from Org Settings → Billing to keep your live pages running.',
      );
    }
    throw new ForbiddenException(
      'Your subscription is not active. Renew from Org Settings → Billing to continue publishing.',
    );
  }

  const capabilities = ((sub as any).plan?.capabilities ??
    {}) as Record<string, boolean>;
  if (capabilities.publishing !== true) {
    throw new ForbiddenException(
      'Your current plan does not include Publishing. Upgrade your plan from Org Settings → Billing to publish landing pages.',
    );
  }
}