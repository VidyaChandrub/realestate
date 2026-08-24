import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { ListPlansQueryDto } from './dto/list-plans-query.dto';

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

@Injectable()
export class PlansService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: ListPlansQueryDto) {
    const where: Prisma.PlanWhereInput = {};
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { slug: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    if (query.isActive !== undefined) where.isActive = query.isActive;
    if (query.isPopular !== undefined) where.isPopular = query.isPopular;

    const plans = await this.prisma.plan.findMany({
      where,
      orderBy: [{ isPopular: 'desc' }, { priceMonthly: 'asc' }, { createdAt: 'asc' }],
    });
    return plans.map(toPlanResponse);
  }

  async getById(id: string) {
    const plan = await this.prisma.plan.findUnique({ where: { id } });
    if (!plan) throw new NotFoundException('Plan not found');
    return toPlanResponse(plan);
  }

  async create(dto: CreatePlanDto) {
    const slug = dto.slug ? slugify(dto.slug) : slugify(dto.name);
    const existing = await this.prisma.plan.findUnique({ where: { slug } });
    if (existing) throw new ConflictException(`Plan slug "${slug}" already exists`);

    const created = await this.prisma.plan.create({
      data: {
        name: dto.name,
        slug,
        description: dto.description ?? '',
        priceMonthly: dto.priceMonthly,
        priceYearly: dto.priceYearly,
        features: (dto.features ?? []) as Prisma.InputJsonValue,
        limits: (dto.limits ?? { projects: '—', users: '—', templates: '—' }) as Prisma.InputJsonValue,
        color: dto.color ?? '#eef0fe',
        badge: dto.badge ?? 'b-indigo',
        isPopular: dto.isPopular ?? false,
        isActive: dto.isActive ?? true,
      },
    });
    return toPlanResponse(created);
  }

  async update(id: string, dto: UpdatePlanDto) {
    const plan = await this.prisma.plan.findUnique({ where: { id } });
    if (!plan) throw new NotFoundException('Plan not found');

    let slug = dto.slug ? slugify(dto.slug) : undefined;
    if (dto.name && !dto.slug) slug = slugify(dto.name);
    if (slug && slug !== plan.slug) {
      const clash = await this.prisma.plan.findUnique({ where: { slug } });
      if (clash) throw new ConflictException(`Plan slug "${slug}" already exists`);
    }

    const data: Prisma.PlanUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (slug) data.slug = slug;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.priceMonthly !== undefined) data.priceMonthly = dto.priceMonthly;
    if (dto.priceYearly !== undefined) data.priceYearly = dto.priceYearly;
    if (dto.features !== undefined) data.features = dto.features as Prisma.InputJsonValue;
    if (dto.limits !== undefined) data.limits = dto.limits as Prisma.InputJsonValue;
    if (dto.color !== undefined) data.color = dto.color;
    if (dto.badge !== undefined) data.badge = dto.badge;
    if (dto.isPopular !== undefined) data.isPopular = dto.isPopular;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;

    const updated = await this.prisma.plan.update({ where: { id }, data });
    return toPlanResponse(updated);
  }

  async remove(id: string) {
    const plan = await this.prisma.plan.findUnique({ where: { id } });
    if (!plan) throw new NotFoundException('Plan not found');
    const subs = await this.prisma.subscription.count({ where: { planId: id, status: { not: 'cancelled' } } });
    if (subs > 0) throw new ConflictException('Cannot delete plan with active subscriptions — archive it instead');
    await this.prisma.plan.delete({ where: { id } });
    return { success: true };
  }
}

function toPlanResponse(plan: any) {
  return {
    id: plan.id,
    name: plan.name,
    slug: plan.slug,
    description: plan.description,
    priceMonthly: plan.priceMonthly,
    priceYearly: plan.priceYearly,
    features: plan.features as string[],
    limits: plan.limits as { projects: string; users: string; templates: string } | null,
    color: plan.color,
    badge: plan.badge,
    isPopular: plan.isPopular,
    isActive: plan.isActive,
    createdAt: plan.createdAt,
    updatedAt: plan.updatedAt,
  };
}
