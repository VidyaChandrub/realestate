import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { generateUniqueTemplateSlug } from '../../common/utils/slug.util';
import { toLandingPageData } from './template.mapper';
import { CreateTemplateDto } from './dto/create-template.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';
import { ListTemplatesQueryDto } from './dto/list-templates-query.dto';
import { ResetTemplateDto } from './dto/reset-template.dto';
import { TemplateContentDto } from './dto/template-content.dto';

const PAGE_TYPE_TO_DB = {
  landing: 'landing',
  'thank-you': 'thank_you',
} as const;

function toContentJson(content: TemplateContentDto): Prisma.InputJsonValue {
  return {
    sections: content.sections,
    config: content.config,
  } as Prisma.InputJsonValue;
}

@Injectable()
export class AdminTemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: ListTemplatesQueryDto) {
    // Thank-you pages are companions reachable through their parent landing
    // page, not standalone browsable templates — default to landing-only and
    // require an explicit ?pageType=thank-you for the few callers (e.g. the
    // studio loading a workspace's thank-you pages) that genuinely need them.
    const where: Prisma.TemplateWhereInput = {
      pageType: PAGE_TYPE_TO_DB[query.pageType ?? 'landing'],
    };
    if (query.kind) where.kind = query.kind;
    if (query.status) where.status = query.status;
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { baseDesignName: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const templates = await this.prisma.template.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
    });

    return templates.map((t) =>
      toLandingPageData(t, { includeContent: query.includeContent }),
    );
  }

  async getById(id: string) {
    const template = await this.findOrThrow(id);
    return toLandingPageData(template, { includeContent: true });
  }

  // Unauthenticated callers (registration) must never fetch a draft or
  // thank-you page by id — same eligibility filter as the public list.
  async getPublicById(id: string) {
    const template = await this.prisma.template.findFirst({
      where: { id, status: 'published', pageType: 'landing' },
    });
    if (!template) {
      throw new NotFoundException('Template not found');
    }
    return toLandingPageData(template, { includeContent: true });
  }

  async create(dto: CreateTemplateDto) {
    const slug = dto.slug
      ? dto.slug
      : await generateUniqueTemplateSlug(this.prisma, dto.name);

    const created = await this.prisma.template.create({
      data: {
        name: dto.name,
        slug,
        status: dto.status ?? 'draft',
        designId: dto.designId,
        baseDesignName: dto.template,
        kind: dto.kind ?? 'custom',
        pageType: PAGE_TYPE_TO_DB[dto.pageType ?? 'landing'],
        parentId: dto.parentPageId,
        thumbnail: dto.thumbnail,
        isPaid: dto.isPaid ?? false,
        category: dto.category,
        content: toContentJson(dto.content),
      },
    });

    return toLandingPageData(created, { includeContent: true });
  }

  async update(id: string, dto: UpdateTemplateDto) {
    await this.findOrThrow(id);

    const data: Prisma.TemplateUpdateInput = {
      name: dto.name,
      slug: dto.slug,
      status: dto.status,
      domain: dto.domain,
      thumbnail: dto.thumbnail,
      isPaid: dto.isPaid,
      category: dto.category,
    };
    if (dto.content) {
      data.content = toContentJson(dto.content);
    }

    const updated = await this.prisma.template.update({ where: { id }, data });
    return toLandingPageData(updated, { includeContent: true });
  }

  async remove(id: string) {
    const template = await this.findOrThrow(id);
    if (template.kind === 'preset') {
      throw new ConflictException(
        'Predefined templates cannot be deleted — use the reset endpoint instead',
      );
    }
    await this.prisma.template.delete({ where: { id } });
  }

  async reset(id: string, dto: ResetTemplateDto) {
    const template = await this.findOrThrow(id);
    if (template.kind !== 'preset') {
      throw new BadRequestException('Only predefined templates can be reset');
    }

    const updated = await this.prisma.template.update({
      where: { id },
      data: {
        status: 'draft',
        content: toContentJson(dto.content),
      },
    });

    return toLandingPageData(updated, { includeContent: true });
  }

  async duplicate(id: string) {
    const source = await this.findOrThrow(id);
    const slug = await generateUniqueTemplateSlug(
      this.prisma,
      `${source.name} copy`,
    );

    const copy = await this.prisma.template.create({
      data: {
        name: `${source.name} (copy)`,
        slug,
        status: 'draft',
        domain: '',
        designId: source.designId,
        baseDesignName: source.baseDesignName,
        kind: 'custom',
        pageType: source.pageType,
        parentId: source.parentId,
        thumbnail: source.thumbnail,
        isPaid: source.isPaid,
        category: source.category,
        content: source.content as Prisma.InputJsonValue,
      },
    });

    return toLandingPageData(copy, { includeContent: true });
  }

  private async findOrThrow(id: string) {
    const template = await this.prisma.template.findUnique({ where: { id } });
    if (!template) {
      throw new NotFoundException('Template not found');
    }
    return template;
  }
}
