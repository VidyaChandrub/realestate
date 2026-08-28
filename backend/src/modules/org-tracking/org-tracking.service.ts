import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class OrgTrackingService {
  constructor(private readonly prisma: PrismaService) {}

  async record(orgId: string, dto: { landingPageId: string; eventType: string; metadata?: any }) {
    const page = await this.prisma.landingPage.findFirst({ where: { id: dto.landingPageId, orgId } });
    if (!page) throw new NotFoundException('Page not found');
    return this.prisma.trackingEvent.create({
      data: { orgId, landingPageId: dto.landingPageId, eventType: dto.eventType, metadata: dto.metadata ?? {} as any },
    });
  }

  async list(orgId: string, landingPageId: string, query: { eventType?: string; page?: number; limit?: number }) {
    const page = await this.prisma.landingPage.findFirst({ where: { id: landingPageId, orgId } });
    if (!page) throw new NotFoundException('Page not found');
    const p = query.page ?? 1;
    const l = query.limit ?? 20;
    const where: any = { orgId, landingPageId };
    if (query.eventType) where.eventType = query.eventType;
    const [data, total] = await Promise.all([
      this.prisma.trackingEvent.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (p - 1) * l, take: l }),
      this.prisma.trackingEvent.count({ where }),
    ]);
    return { data, total, page: p, limit: l };
  }

  async stats(orgId: string, landingPageId: string) {
    const page = await this.prisma.landingPage.findFirst({ where: { id: landingPageId, orgId } });
    if (!page) throw new NotFoundException('Page not found');
    const groups = await this.prisma.trackingEvent.groupBy({ by: ['eventType'], where: { orgId, landingPageId }, _count: { _all: true } });
    const total = await this.prisma.trackingEvent.count({ where: { orgId, landingPageId } });
    return { total, byType: groups.map((g) => ({ eventType: g.eventType, count: g._count._all })) };
  }
}
