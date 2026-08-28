import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import type { CreateLeadDto } from './dto/create-lead.dto';

@Injectable()
export class LeadsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Public capture path: an anonymous visitor submits a form. We resolve the
   * owning org from the landing page id rather than trusting a client-supplied
   * orgId. A missing/invalid landing page is rejected.
   */
  async createFromPublic(dto: CreateLeadDto) {
    if (!dto.landingPageId) {
      throw new NotFoundException('landingPageId is required to attribute the lead');
    }
    const page = await this.prisma.landingPage.findUnique({
      where: { id: dto.landingPageId },
      select: { orgId: true },
    });
    if (!page) {
      throw new NotFoundException('Landing page not found');
    }
    return this.prisma.lead.create({
      data: {
        orgId: page.orgId,
        landingPageId: dto.landingPageId,
        formName: dto.formName ?? null,
        source: dto.source ?? 'website',
        data: dto.data as object,
      },
    });
  }

  /** Org-scoped list for the CRM/lead inbox. */
  async list(orgId: string) {
    return this.prisma.lead.findMany({
      where: { orgId },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }
}
