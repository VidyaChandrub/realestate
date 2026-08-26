import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { ListAdminLandingPagesQueryDto } from './dto/list-admin-landing-pages-query.dto';

const ORG_SELECT = { select: { id: true, name: true, slug: true } } as const;

@Injectable()
export class AdminLandingPagesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: ListAdminLandingPagesQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.LandingPageWhereInput = {};
    if (query.status) where.status = query.status;
    if (query.orgId) where.orgId = query.orgId;
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { organisation: { name: { contains: query.search, mode: 'insensitive' } } },
      ];
    }

    const [rows, total] = await Promise.all([
      this.prisma.landingPage.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          name: true,
          slug: true,
          status: true,
          thumbnail: true,
          pageType: true,
          publishedAt: true,
          createdAt: true,
          updatedAt: true,
          organisation: ORG_SELECT,
          sourceTemplate: { select: { id: true, name: true } },
        },
      }),
      this.prisma.landingPage.count({ where }),
    ]);

    return { data: rows, total, page, limit };
  }

  async getById(id: string) {
    const row = await this.prisma.landingPage.findUnique({
      where: { id },
      include: { organisation: ORG_SELECT },
    });
    if (!row) throw new NotFoundException('Landing page not found');
    return row;
  }
}
