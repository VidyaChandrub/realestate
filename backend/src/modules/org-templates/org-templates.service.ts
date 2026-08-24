import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { toLandingPageData } from '../admin-templates/template.mapper';
import { ListOrgTemplatesQueryDto } from './dto/list-org-templates-query.dto';

// Free templates are visible to every organisation automatically — no
// per-org assignment record exists or should exist. Eligibility is entirely
// this filter: published, a real landing page (not a thank-you companion),
// and not paid (no billing/plan system exists yet to unlock paid ones).
const ELIGIBLE_WHERE: Prisma.TemplateWhereInput = {
  status: 'published',
  pageType: 'landing',
  isPaid: false,
};

@Injectable()
export class OrgTemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: ListOrgTemplatesQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.TemplateWhereInput = { ...ELIGIBLE_WHERE };
    if (query.category) {
      where.category = query.category;
    }
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { baseDesignName: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [templates, total] = await Promise.all([
      this.prisma.template.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.template.count({ where }),
    ]);

    return {
      data: templates.map((t) => {
        const mapped = toLandingPageData(t);
        return {
          id: mapped.id,
          name: mapped.name,
          slug: mapped.slug,
          thumbnail: mapped.thumbnail,
          category: mapped.category,
          template: mapped.template,
          updatedAt: mapped.updatedAt,
        };
      }),
      total,
      page,
      limit,
    };
  }

  async getById(id: string) {
    // Same eligibility filter as the list — a draft/paid/thank-you id must
    // 404 here, not just be hidden by the UI.
    const template = await this.prisma.template.findFirst({
      where: { id, ...ELIGIBLE_WHERE },
    });
    if (!template) {
      throw new NotFoundException('Template not found');
    }
    return toLandingPageData(template, { includeContent: true });
  }
}
