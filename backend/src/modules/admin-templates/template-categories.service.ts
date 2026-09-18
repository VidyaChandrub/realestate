import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { generateUniqueCategorySlug } from '../../common/utils/slug.util';
import { CreateTemplateCategoryDto } from './dto/create-category.dto';
import { UpdateTemplateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class TemplateCategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    const categories = await this.prisma.templateCategory.findMany({
      include: {
        _count: {
          select: { templates: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    return categories.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      tier: c.tier,
      templateCount: c._count.templates,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    }));
  }

  async getById(id: string) {
    const category = await this.prisma.templateCategory.findUnique({
      where: { id },
      include: {
        templates: {
          select: {
            id: true,
            name: true,
            slug: true,
            tier: true,
            status: true,
            thumbnail: true,
          },
        },
      },
    });

    if (!category) {
      throw new NotFoundException('Template category not found');
    }

    return {
      id: category.id,
      name: category.name,
      slug: category.slug,
      tier: category.tier,
      templates: category.templates,
      createdAt: category.createdAt.toISOString(),
      updatedAt: category.updatedAt.toISOString(),
    };
  }

  async create(dto: CreateTemplateCategoryDto) {
    const existing = await this.prisma.templateCategory.findUnique({
      where: { name: dto.name },
    });
    if (existing) {
      throw new ConflictException('A category with this name already exists');
    }

    const slug = dto.slug
      ? dto.slug
      : await generateUniqueCategorySlug(this.prisma, dto.name);

    const created = await this.prisma.templateCategory.create({
      data: {
        name: dto.name,
        slug,
        tier: dto.tier ?? 'free',
      },
    });

    return {
      id: created.id,
      name: created.name,
      slug: created.slug,
      tier: created.tier,
      templateCount: 0,
      createdAt: created.createdAt.toISOString(),
      updatedAt: created.updatedAt.toISOString(),
    };
  }

  async update(id: string, dto: UpdateTemplateCategoryDto) {
    const category = await this.prisma.templateCategory.findUnique({
      where: { id },
    });
    if (!category) {
      throw new NotFoundException('Template category not found');
    }

    if (dto.name && dto.name !== category.name) {
      const existing = await this.prisma.templateCategory.findUnique({
        where: { name: dto.name },
      });
      if (existing && existing.id !== id) {
        throw new ConflictException('A category with this name already exists');
      }
    }

    const updated = await this.prisma.templateCategory.update({
      where: { id },
      data: {
        name: dto.name,
        slug: dto.slug,
        tier: dto.tier,
      },
    });

    return {
      id: updated.id,
      name: updated.name,
      slug: updated.slug,
      tier: updated.tier,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  async remove(id: string) {
    const category = await this.prisma.templateCategory.findUnique({
      where: { id },
    });
    if (!category) {
      throw new NotFoundException('Template category not found');
    }

    await this.prisma.templateCategory.delete({ where: { id } });
    return { success: true };
  }
}
