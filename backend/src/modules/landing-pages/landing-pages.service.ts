import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { generateUniquePageSlug } from '../../common/utils/slug.util';
import { CreateLandingPageDto } from './dto/create-landing-page.dto';
import { UpdateLandingPageDto } from './dto/update-landing-page.dto';
import { SaveDocumentDto } from './dto/save-document.dto';
import { ListLandingPagesQueryDto } from './dto/list-landing-pages-query.dto';
import { CreateSectionTemplateDto } from './dto/create-section-template.dto';
import { defaultDocument } from './default-document';
import type { Prisma } from '@prisma/client';

@Injectable()
export class LandingPagesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: ListLandingPagesQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.LandingPageWhereInput = {
      ...(query.status ? { status: query.status } : {}),
    };

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [pages, total] = await Promise.all([
      this.prisma.landingPage.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          category: true,
          thumbnail: true,
          status: true,
          publishedAt: true,
          createdAt: true,
          updatedAt: true,
          _count: { select: { leads: true } },
        },
      }),
      this.prisma.landingPage.count({ where }),
    ]);

    return {
      data: pages.map((p) => ({
        ...p,
        leadCount: p._count.leads,
        _count: undefined,
      })),
      total,
      page,
      limit,
    };
  }

  async getById(id: string) {
    const page = await this.prisma.landingPage.findUnique({
      where: { id },
      include: { leads: { orderBy: { createdAt: 'desc' }, take: 20 } },
    });
    if (!page) {
      throw new NotFoundException('Landing page not found');
    }
    return page;
  }

  async create(dto: CreateLandingPageDto) {
    const slug = await generateUniquePageSlug(this.prisma, dto.name);

    const page = await this.prisma.landingPage.create({
      data: {
        name: dto.name,
        slug,
        description: dto.description,
        category: dto.category ?? 'campaign',
        thumbnail: dto.thumbnail,
        document: defaultDocument() as unknown as Prisma.InputJsonValue,
      },
    });

    return page;
  }

  async update(id: string, dto: UpdateLandingPageDto) {
    await this.getById(id);

    return this.prisma.landingPage.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.description !== undefined
          ? { description: dto.description }
          : {}),
        ...(dto.category !== undefined ? { category: dto.category } : {}),
        ...(dto.thumbnail !== undefined ? { thumbnail: dto.thumbnail } : {}),
      },
    });
  }

  async saveDocument(id: string, dto: SaveDocumentDto) {
    await this.getById(id);

    const page = await this.prisma.landingPage.update({
      where: { id },
      data: {
        document: dto.document as unknown as Prisma.InputJsonValue,
        ...(dto.seo !== undefined
          ? { seo: dto.seo as unknown as Prisma.InputJsonValue }
          : {}),
        ...(dto.tracking !== undefined
          ? { tracking: dto.tracking as unknown as Prisma.InputJsonValue }
          : {}),
        ...(dto.domain !== undefined
          ? { domain: dto.domain as unknown as Prisma.InputJsonValue }
          : {}),
      },
    });

    return { id: page.id, updatedAt: page.updatedAt };
  }

  async publish(id: string) {
    await this.getById(id);

    const page = await this.prisma.landingPage.update({
      where: { id },
      data: { status: 'published', publishedAt: new Date() },
    });

    return { id: page.id, status: page.status, publishedAt: page.publishedAt };
  }

  async unpublish(id: string) {
    await this.getById(id);

    const page = await this.prisma.landingPage.update({
      where: { id },
      data: { status: 'draft', publishedAt: null },
    });

    return { id: page.id, status: page.status, publishedAt: page.publishedAt };
  }

  async archive(id: string) {
    await this.getById(id);

    const page = await this.prisma.landingPage.update({
      where: { id },
      data: { status: 'archived', publishedAt: null },
    });

    return { id: page.id, status: page.status };
  }

  async setStatus(id: string, status: 'draft' | 'published' | 'archived') {
    await this.getById(id);

    const page = await this.prisma.landingPage.update({
      where: { id },
      data: {
        status,
        publishedAt: status === 'published' ? new Date() : null,
      },
    });

    return { id: page.id, status: page.status, publishedAt: page.publishedAt };
  }

  async duplicate(id: string) {
    const source = await this.getById(id);

    const slug = await generateUniquePageSlug(
      this.prisma,
      `${source.name} copy`,
    );

    const copy = await this.prisma.landingPage.create({
      data: {
        name: `${source.name} Copy`,
        slug,
        description: source.description,
        category: source.category,
        thumbnail: source.thumbnail,
        status: 'draft',
        document: source.document as unknown as Prisma.InputJsonValue,
        seo: source.seo ?? undefined,
        tracking: source.tracking ?? undefined,
        domain: source.domain ?? undefined,
      },
    });

    return copy;
  }

  async getBySlugForRender(slug: string) {
    const page = await this.prisma.landingPage.findUnique({
      where: { slug },
    });
    if (!page || page.status !== 'published') {
      throw new NotFoundException('Landing page not found');
    }
    return page;
  }

  // ---------------------------------------------------------------------------
  // Reusable section templates
  // ---------------------------------------------------------------------------

  async listSectionTemplates() {
    return this.prisma.landingSectionTemplate.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async createSectionTemplate(dto: CreateSectionTemplateDto) {
    return this.prisma.landingSectionTemplate.create({
      data: {
        name: dto.name,
        category: dto.category,
        thumbnail: dto.thumbnail,
        document: dto.document as unknown as Prisma.InputJsonValue,
      },
    });
  }

  async deleteSectionTemplate(id: string) {
    await this.prisma.landingSectionTemplate.delete({ where: { id } });
    return { success: true };
  }

  async remove(id: string) {
    await this.getById(id);

    await this.prisma.landingPage.delete({ where: { id } });
    return { success: true };
  }
}
