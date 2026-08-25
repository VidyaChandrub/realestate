import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import type { JwtPayload } from '../../common/types/jwt-payload.interface';
import { ListAdminLandingPagesQueryDto } from './dto/list-admin-landing-pages-query.dto';

const ORG_SELECT = { select: { id: true, name: true, slug: true } } as const;

@Injectable()
export class AdminLandingPagesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: ListAdminLandingPagesQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.LandingPageWhereInput = {};
    if (query.status) {
      where.status = query.status;
    } else {
      // Drafts are never submitted — same rule as draft organisations being
      // excluded from every status filter including "all": nothing to
      // review means it doesn't belong in an approvals queue.
      where.status = { not: 'draft' };
    }
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
        orderBy: [{ submittedAt: 'desc' }, { updatedAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          name: true,
          slug: true,
          status: true,
          thumbnail: true,
          pageType: true,
          submittedAt: true,
          reviewedAt: true,
          rejectionReason: true,
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

  async approve(id: string, actor: JwtPayload) {
    const row = await this.getRow(id);
    if (row.status !== 'pending_approval') {
      throw new BadRequestException('Only pages pending approval can be approved');
    }
    const updated = await this.prisma.landingPage.update({
      where: { id },
      data: { status: 'approved', reviewedAt: new Date(), reviewedById: actor.sub },
    });
    await this.prisma.auditLog.create({
      data: {
        orgId: updated.orgId,
        actorId: actor.sub,
        action: 'landing_page_approved',
        entity: 'LandingPage',
        entityId: id,
        metadata: {},
      },
    });
    return updated;
  }

  async reject(id: string, actor: JwtPayload, reason: string) {
    const row = await this.getRow(id);
    if (row.status !== 'pending_approval') {
      throw new BadRequestException('Only pages pending approval can be rejected');
    }
    const updated = await this.prisma.landingPage.update({
      where: { id },
      data: {
        status: 'rejected',
        reviewedAt: new Date(),
        reviewedById: actor.sub,
        rejectionReason: reason,
      },
    });
    await this.prisma.auditLog.create({
      data: {
        orgId: updated.orgId,
        actorId: actor.sub,
        action: 'landing_page_rejected',
        entity: 'LandingPage',
        entityId: id,
        metadata: { reason },
      },
    });
    return updated;
  }

  async publish(id: string, actor: JwtPayload) {
    const row = await this.getRow(id);
    if (row.status !== 'approved') {
      throw new BadRequestException('Only approved pages can be published');
    }
    const updated = await this.prisma.landingPage.update({
      where: { id },
      data: { status: 'published', publishedAt: new Date() },
    });
    await this.prisma.auditLog.create({
      data: {
        orgId: updated.orgId,
        actorId: actor.sub,
        action: 'landing_page_published',
        entity: 'LandingPage',
        entityId: id,
        metadata: {},
      },
    });
    return updated;
  }

  private async getRow(id: string) {
    const row = await this.prisma.landingPage.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Landing page not found');
    return row;
  }
}
