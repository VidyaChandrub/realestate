import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CreateCatalogOptionDto } from './dto/create-catalog-option.dto';
import { UpdateCatalogOptionDto } from './dto/update-catalog-option.dto';
import { CatalogCategoryValue } from './dto/list-catalog-options-query.dto';

@Injectable()
export class OrgProjectCatalogService {
  constructor(private readonly prisma: PrismaService) {}

  // Every option the org owns, across all four categories, ordered ready for
  // the settings UI (which groups by category itself). An optional `category`
  // narrows it to one list. Never returns another org's rows.
  async list(orgId: string, category?: CatalogCategoryValue) {
    return this.prisma.orgCatalogOption.findMany({
      where: { orgId, ...(category ? { category } : {}) },
      orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }, { label: 'asc' }],
    });
  }

  async create(orgId: string, dto: CreateCatalogOptionDto) {
    try {
      return await this.prisma.orgCatalogOption.create({
        data: {
          orgId,
          category: dto.category,
          label: dto.label.trim(),
          sortOrder: dto.sortOrder ?? 0,
        },
      });
    } catch (err) {
      throw this.mapDuplicate(err);
    }
  }

  async update(orgId: string, id: string, dto: UpdateCatalogOptionDto) {
    const option = await this.getOwned(orgId, id);

    const data: Prisma.OrgCatalogOptionUpdateInput = {};
    if (dto.label !== undefined) data.label = dto.label.trim();
    if (dto.sortOrder !== undefined) data.sortOrder = dto.sortOrder;

    try {
      return await this.prisma.orgCatalogOption.update({
        where: { id: option.id },
        data,
      });
    } catch (err) {
      throw this.mapDuplicate(err);
    }
  }

  async remove(orgId: string, id: string) {
    const option = await this.getOwned(orgId, id);
    // Hard delete, matching the rest of the codebase. Safe by design: a
    // project copies catalog labels onto its own columns at creation time
    // and never references this row, so removing it can't affect any
    // already-created project.
    await this.prisma.orgCatalogOption.delete({ where: { id: option.id } });
    return { success: true };
  }

  // The @@unique([orgId, category, label]) violation (P2002) — surfaced as a
  // 400 with a friendly message, same as OrgTypographySetsService does for
  // its own duplicate-name case. Anything else propagates untouched.
  private mapDuplicate(err: unknown): unknown {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === 'P2002'
    ) {
      return new BadRequestException('That option already exists in this list');
    }
    return err;
  }

  // Never leaks cross-tenant existence: another org's option 404s exactly
  // like an id that doesn't exist. orgId always comes from the JWT.
  private async getOwned(orgId: string, id: string) {
    const option = await this.prisma.orgCatalogOption.findUnique({
      where: { id },
    });
    if (!option || option.orgId !== orgId) {
      throw new NotFoundException('Catalog option not found');
    }
    return option;
  }
}
