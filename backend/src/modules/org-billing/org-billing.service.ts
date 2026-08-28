import { Injectable } from '@nestjs/common';
import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { resolveTemplateQuota } from '../../common/utils/plan-quota.util';
import type { ChangePlanDto } from './dto/change-plan.dto';

export interface InvoiceRow {
  id: string;
  number: string;
  issuedAt: string;
  dueAt: string;
  amount: number;
  currency: string;
  billingCycle: 'monthly' | 'yearly';
  status: 'paid' | 'pending';
  planName: string;
}

function computeAmountAndMrr(
  plan: { priceMonthly: number; priceYearly: number },
  billingCycle: string,
) {
  const isYearly = billingCycle === 'yearly';
  const amount = isYearly ? plan.priceYearly : plan.priceMonthly;
  const mrr = isYearly ? Math.round(amount / 12) : amount;
  return { amount, mrr };
}

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

  /**
   * Upgrade / downgrade the org's own plan. Reuses the same "one non-cancelled
   * subscription per org" rule as SubscriptionsService: if a subscription
   * exists we switch its plan (recomputing amount/mrr); otherwise we create
   * one. Delegates nothing to the super-admin subscriptions module — this is
   * the org-self-service path guarded by OrgAdminGuard.
   */
  async changePlan(orgId: string, dto: ChangePlanDto) {
    const plan = await this.prisma.plan.findUnique({ where: { id: dto.planId } });
    if (!plan || !plan.isActive) throw new NotFoundException('Plan not found or inactive');

    const billingCycle = dto.billingCycle ?? 'monthly';
    const { amount, mrr } = computeAmountAndMrr(plan, billingCycle);

    const existing = await this.prisma.subscription.findFirst({
      where: { orgId, status: { not: 'cancelled' } },
    });

    let subscription: any;
    if (existing) {
      subscription = await this.prisma.subscription.update({
        where: { id: existing.id },
        data: { planId: plan.id, billingCycle: billingCycle as any, amount, mrr },
        include: { plan: true },
      });
    } else {
      const renewsAt =
        billingCycle === 'yearly'
          ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
          : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      subscription = await this.prisma.subscription.create({
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
        include: { plan: true },
      });
    }

    await this.prisma.auditLog
      .create({
        data: {
          orgId,
          action: existing ? 'subscription_updated' : 'subscription_created',
          entity: 'Subscription',
          entityId: subscription.id,
          metadata: { planId: plan.id, billingCycle, amount },
        },
      })
      .catch(() => {
        /* audit log is best-effort */
      });

    return {
      id: subscription.id,
      planId: subscription.planId,
      planName: subscription.plan.name,
      billingCycle: subscription.billingCycle,
      status: subscription.status,
      amount: subscription.amount,
      currency: subscription.currency,
      renewsAt: subscription.renewsAt,
      startedAt: subscription.startedAt,
    };
  }

  /**
   * Derives an invoice history from the org's active subscription. There is no
   * payment provider or Invoice table in the schema, so invoices are generated
   * from the billing cycle + term (startedAt → renewsAt) rather than stored.
   * Past periods are marked paid, the upcoming period pending.
   */
  async listInvoices(orgId: string): Promise<InvoiceRow[]> {
    const sub = await this.prisma.subscription.findFirst({
      where: { orgId, status: { not: 'cancelled' } },
      include: { plan: true },
    });
    if (!sub) return [];

    const periodMs =
      sub.billingCycle === 'yearly'
        ? 365 * 24 * 60 * 60 * 1000
        : 30 * 24 * 60 * 60 * 1000;
    const now = Date.now();
    const start = new Date(sub.startedAt).getTime();
    const renews = sub.renewsAt ? new Date(sub.renewsAt).getTime() : start + periodMs;

    const short = orgId.replace(/-/g, '').slice(0, 6).toUpperCase();
    const invoices: InvoiceRow[] = [];
    // Start up to 11 periods before now (but never before the subscription
    // start) so the list shows recent history plus the current term.
    let cursor = Math.max(start, now - 11 * periodMs);
    cursor = start + Math.floor((cursor - start) / periodMs) * periodMs;
    let safety = 0;
    while (cursor < renews && safety < 60) {
      const periodStart = new Date(cursor);
      const periodEnd = new Date(cursor + periodMs);
      const status: InvoiceRow['status'] = periodEnd.getTime() <= now ? 'paid' : 'pending';
      const label =
        sub.billingCycle === 'yearly'
          ? `${periodStart.getFullYear()}`
          : `${periodStart.getFullYear()}${String(periodStart.getMonth() + 1).padStart(2, '0')}`;
      invoices.push({
        id: `inv-${sub.id}-${label}`,
        number: `INV-${short}-${label}`,
        issuedAt: periodStart.toISOString(),
        dueAt: periodStart.toISOString(),
        amount: sub.amount,
        currency: sub.currency,
        billingCycle: sub.billingCycle,
        status,
        planName: sub.plan.name,
      });
      cursor += periodMs;
      safety++;
    }
    return invoices.reverse();
  }
}
