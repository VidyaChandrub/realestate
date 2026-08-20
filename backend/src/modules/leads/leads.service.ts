import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import type { Prisma } from '@prisma/client';

@Injectable()
export class LeadsService {
  constructor(private readonly prisma: PrismaService) {}

  async captureBySlug(
    slug: string,
    dto: CreateLeadDto,
    attribution: { utm?: URLSearchParams; ip?: string; userAgent?: string },
  ) {
    const page = await this.prisma.landingPage.findUnique({
      where: { slug },
      select: { id: true, status: true },
    });
    if (!page || page.status !== 'published') {
      throw new NotFoundException('Landing page not found');
    }

    const utm = attribution.utm;
    const lead = await this.prisma.landingLead.create({
      data: {
        landingPageId: page.id,
        name: dto.name,
        phone: dto.phone,
        email: dto.email,
        city: dto.city,
        budget: dto.budget,
        propertyType: dto.propertyType,
        message: dto.message,
        intent: dto.intent ?? 'enquiry',
        utmSource: utm?.get('utm_source') ?? undefined,
        utmMedium: utm?.get('utm_medium') ?? undefined,
        utmCampaign: utm?.get('utm_campaign') ?? undefined,
        utmTerm: utm?.get('utm_term') ?? undefined,
        utmContent: utm?.get('utm_content') ?? undefined,
        ipAddress: attribution.ip,
        userAgent: attribution.userAgent,
      },
    });

    return { id: lead.id, createdAt: lead.createdAt, intent: lead.intent };
  }

  async listForPage(pageId: string, query: { page?: number; limit?: number }) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;

    const where: Prisma.LandingLeadWhereInput = { landingPageId: pageId };

    const [leads, total] = await Promise.all([
      this.prisma.landingLead.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.landingLead.count({ where }),
    ]);

    return { data: leads, total, page, limit };
  }
}
