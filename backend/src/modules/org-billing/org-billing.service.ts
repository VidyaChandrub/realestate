import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { resolveTemplateQuota } from '../../common/utils/plan-quota.util';

// Read-only view over Shubham's billing/subscriptions module for the org
// settings screen — never writes to Plan/Subscription. No invoice/payment
// data exists anywhere in the schema, so this is deliberately just plan +
// usage.
@Injectable()
export class OrgBillingService {
  constructor(private readonly prisma: PrismaService) {}

  async get(orgId: string) {
    // At most one non-cancelled subscription per org — enforced by
    // SubscriptionsService.create(), not a DB constraint. Mirrors that
    // same lookup rather than assuming a unique index exists.
    const [subscription, templatesUsed] = await Promise.all([
      this.prisma.subscription.findFirst({
        where: { orgId, status: { not: 'cancelled' } },
        include: { plan: true },
      }),
      this.prisma.organisationTemplate.count({ where: { orgId } }),
    ]);

    if (!subscription) {
      return { plan: null, subscription: null, usage: { templatesUsed, templatesLimit: null } };
    }

    const quota = resolveTemplateQuota(subscription.plan);

    return {
      plan: {
        id: subscription.plan.id,
        name: subscription.plan.name,
        slug: subscription.plan.slug,
        priceMonthly: subscription.plan.priceMonthly,
        priceYearly: subscription.plan.priceYearly,
        color: subscription.plan.color,
        badge: subscription.plan.badge,
        isPopular: subscription.plan.isPopular,
        // Passed through as-is (whatever shape Shubham's plan editor wrote)
        // alongside the resolved numeric quota below — don't reshape it.
        limits: subscription.plan.limits,
      },
      subscription: {
        status: subscription.status,
        billingCycle: subscription.billingCycle,
        amount: subscription.amount,
        currency: subscription.currency,
        startedAt: subscription.startedAt,
        renewsAt: subscription.renewsAt,
        cancelledAt: subscription.cancelledAt,
      },
      usage: {
        templatesUsed,
        // null = unlimited ("All"/"Unlimited" on the plan) — distinct from
        // the no-subscription case above only in that the caller already
        // knows `plan` is non-null here, so there's no ambiguity in practice.
        templatesLimit: quota === Infinity ? null : quota,
      },
    };
  }
}
