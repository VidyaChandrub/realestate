import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';
import { ListSubscriptionsQueryDto } from './dto/list-subscriptions-query.dto';

function computeAmountAndMrr(
  plan: { priceMonthly: number; priceYearly: number },
  billingCycle: string,
) {
  const isYearly = billingCycle === 'yearly';
  const amount = isYearly ? plan.priceYearly : plan.priceMonthly;
  const mrr = isYearly ? Math.round(amount / 12) : amount;
  return { amount, mrr };
}

@Injectable()
export class SubscriptionsService {
  constructor(private readonly prisma: PrismaService) {}

  async overview() {
    const [allSubs, plans, activeSubs] = await Promise.all([
      this.prisma.subscription.findMany({ include: { plan: true } }),
      this.prisma.plan.findMany({ where: { isActive: true } }),
      this.prisma.subscription.count({ where: { status: { in: ['active', 'trial'] as any } } }),
    ]);

    const mrr = allSubs
      .filter((s) => ['active', 'trial', 'past_due'].includes(s.status))
      .reduce((sum, s) => sum + (s.mrr ?? s.amount), 0);

    const arr = mrr * 12;

    // distribution by plan
    const byPlan: Record<string, number> = {};
    for (const s of allSubs) {
      if (s.status === 'cancelled') continue;
      byPlan[s.planId] = (byPlan[s.planId] ?? 0) + 1;
    }
    const totalActive = Object.values(byPlan).reduce((a, b) => a + b, 0) || 1;
    const distribution = await Promise.all(
      Object.entries(byPlan).map(async ([planId, count]) => {
        const plan = await this.prisma.plan.findUnique({ where: { id: planId } });
        return {
          planId,
          planName: plan?.name ?? 'Unknown',
          badge: plan?.badge ?? 'b-indigo',
          count,
          pct: Math.round((count / totalActive) * 100),
        };
      }),
    );

    // history placeholder — real impl would aggregate by month
    const mrrHistory = [
      { month: 'Apr', mrr: Math.round(mrr * 0.75) },
      { month: 'May', mrr: Math.round(mrr * 0.8) },
      { month: 'Jun', mrr: Math.round(mrr * 0.85) },
      { month: 'Jul', mrr: Math.round(mrr * 0.92) },
      { month: 'Aug', mrr: Math.round(mrr * 0.96) },
      { month: 'Sep', mrr },
    ];

    return {
      mrr,
      arr,
      activePlans: plans.length,
      activeSubscriptions: activeSubs,
      totalSubscriptions: allSubs.length,
      churnRate: 2.1, // placeholder — real would compute from cancelled / active
      distribution,
      mrrHistory,
    };
  }

  async list(query: ListSubscriptionsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.SubscriptionWhereInput = {};

    if (query.status && query.status !== 'all') {
      where.status = query.status as any;
    }
    if (query.billingCycle) {
      where.billingCycle = query.billingCycle as any;
    }
    if (query.planId) where.planId = query.planId;
    if (query.orgId) where.orgId = query.orgId;

    if (query.search) {
      const s = query.search;
      where.OR = [
        { organisation: { name: { contains: s, mode: 'insensitive' } } },
        { organisation: { city: { contains: s, mode: 'insensitive' } } },
        { plan: { name: { contains: s, mode: 'insensitive' } } },
      ];
    }

    const [subs, total] = await Promise.all([
      this.prisma.subscription.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          organisation: { select: { id: true, name: true, city: true, slug: true } },
          plan: true,
        },
      }),
      this.prisma.subscription.count({ where }),
    ]);

    return {
      data: subs.map(toSubscriptionResponse),
      total,
      page,
      limit,
    };
  }

  async getById(id: string) {
    const sub = await this.prisma.subscription.findUnique({
      where: { id },
      include: { organisation: true, plan: true },
    });
    if (!sub) throw new NotFoundException('Subscription not found');
    return toSubscriptionResponse(sub);
  }

  async create(dto: CreateSubscriptionDto) {
    const org = await this.prisma.organisation.findUnique({ where: { id: dto.orgId } });
    if (!org || org.status === 'draft') throw new NotFoundException('Organisation not found');

    const plan = await this.prisma.plan.findUnique({ where: { id: dto.planId } });
    if (!plan || !plan.isActive) throw new NotFoundException('Plan not found or inactive');

    const existing = await this.prisma.subscription.findFirst({
      where: { orgId: dto.orgId, status: { not: 'cancelled' } },
    });
    if (existing) throw new ConflictException('Organisation already has an active subscription — use PATCH to upgrade/downgrade');

    const billingCycle = dto.billingCycle ?? 'monthly';
    const { amount, mrr } = computeAmountAndMrr(plan, billingCycle);

    const renewsAt = dto.renewsAt
      ? new Date(dto.renewsAt)
      : billingCycle === 'yearly'
        ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const created = await this.prisma.subscription.create({
      data: {
        orgId: dto.orgId,
        planId: dto.planId,
        billingCycle: billingCycle as any,
        status: (dto.status as any) ?? 'active',
        amount,
        mrr,
        currency: dto.currency ?? 'INR',
        renewsAt,
      },
      include: { organisation: true, plan: true },
    });

    await this.prisma.auditLog.create({
      data: {
        orgId: dto.orgId,
        action: 'subscription_created',
        entity: 'Subscription',
        entityId: created.id,
        metadata: { planId: dto.planId, billingCycle, amount },
      },
    });

    return toSubscriptionResponse(created);
  }

  async update(id: string, dto: UpdateSubscriptionDto) {
    const sub = await this.prisma.subscription.findUnique({ where: { id }, include: { plan: true } });
    if (!sub) throw new NotFoundException('Subscription not found');

    const data: Prisma.SubscriptionUpdateInput = {};

    let targetPlan = sub.plan;
    if (dto.planId && dto.planId !== sub.planId) {
      const newPlan = await this.prisma.plan.findUnique({ where: { id: dto.planId } });
      if (!newPlan || !newPlan.isActive) throw new NotFoundException('Plan not found or inactive');
      targetPlan = newPlan;
      data.plan = { connect: { id: dto.planId } };
    }

    const billingCycle = dto.billingCycle ?? sub.billingCycle;
    if (dto.billingCycle || dto.planId) {
      const { amount, mrr } = computeAmountAndMrr(targetPlan, billingCycle);
      data.amount = amount;
      data.mrr = mrr;
      data.billingCycle = billingCycle as any;
    } else if (dto.billingCycle) {
      data.billingCycle = dto.billingCycle as any;
    }

    if (dto.status) {
      data.status = dto.status as any;
      if (dto.status === 'cancelled') data.cancelledAt = new Date();
    }
    if (dto.currency) data.currency = dto.currency;
    if (dto.renewsAt) data.renewsAt = new Date(dto.renewsAt);

    const updated = await this.prisma.subscription.update({
      where: { id },
      data,
      include: { organisation: true, plan: true },
    });

    await this.prisma.auditLog.create({
      data: {
        orgId: updated.orgId,
        action: 'subscription_updated',
        entity: 'Subscription',
        entityId: updated.id,
        metadata: dto as any,
      },
    });

    return toSubscriptionResponse(updated);
  }

  async remove(id: string) {
    const sub = await this.prisma.subscription.findUnique({ where: { id } });
    if (!sub) throw new NotFoundException('Subscription not found');
    // soft cancel
    const updated = await this.prisma.subscription.update({
      where: { id },
      data: { status: 'cancelled', cancelledAt: new Date() },
      include: { organisation: true, plan: true },
    });
    return toSubscriptionResponse(updated);
  }
}

function toSubscriptionResponse(sub: any) {
  const plan = sub.plan;
  const org = sub.organisation;
  return {
    id: sub.id,
    orgId: sub.orgId,
    planId: sub.planId,
    billingCycle: sub.billingCycle,
    status: sub.status,
    amount: sub.amount,
    currency: sub.currency,
    mrr: sub.mrr,
    renewsAt: sub.renewsAt,
    startedAt: sub.startedAt,
    cancelledAt: sub.cancelledAt,
    createdAt: sub.createdAt,
    updatedAt: sub.updatedAt,
    organisation: org ? { id: org.id, name: org.name, city: org.city, slug: org.slug } : null,
    plan: plan
      ? {
          id: plan.id,
          name: plan.name,
          slug: plan.slug,
          priceMonthly: plan.priceMonthly,
          priceYearly: plan.priceYearly,
          color: plan.color,
          badge: plan.badge,
          isPopular: plan.isPopular,
        }
      : null,
    // denormalized helpers for legacy UI
    orgName: org?.name ?? null,
    city: org?.city ?? null,
    planName: plan?.name ?? null,
  };
}
