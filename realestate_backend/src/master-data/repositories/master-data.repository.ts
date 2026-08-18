import { Injectable } from '@nestjs/common';
import {
  Category,
  MasterDataCategoryType,
  MasterStatus,
  Prisma,
} from '@prisma/client';
import { MasterDataDbService } from '../prisma.service';

@Injectable()
export class MasterDataRepository {
  constructor(private readonly prisma: MasterDataDbService) {}

  async create(data: Prisma.CategoryCreateInput): Promise<Category> {
    return this.prisma.category.create({ data });
  }

  async update(id: string, data: Prisma.CategoryUpdateInput): Promise<Category> {
    return this.prisma.category.update({ where: { id }, data });
  }
    async delete(id: string): Promise<void> {
    await this.prisma.category.delete({ where: { id } });
  }

  async findById(id: string): Promise<Category | null> {
    return this.prisma.category.findUnique({ where: { id } });
  }

  async findBySlug(type: MasterDataCategoryType, slug: string): Promise<Category | null> {
    return this.prisma.category.findUnique({
      where: {
        type_slug: {
          type,
          slug,
        },
      },
    });  
  }

  async findAnyBySlug(slug: string): Promise<Category | null> {
    return this.prisma.category.findFirst({
      where: { slug },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async findByTypeValueAndParentId(
    type: MasterDataCategoryType,
    value: string,
    parentId: string,
    excludeId?: string,
  ): Promise<Category | null> {
    return this.prisma.category.findFirst({
      where: {
        type,
        parentId,
        value: {
          equals: value.trim(),
          mode: 'insensitive',
        },
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
    });
  }

  async findByIdOrThrow(id: string): Promise<Category> {
    return this.prisma.category.findUniqueOrThrow({ where: { id } });
  }

  async list(params: {
    type?: MasterDataCategoryType;
    status?: MasterStatus;
    activeOnly?: boolean;
    page: number;
    limit: number;
    search?: string;
  }): Promise<{ items: Category[]; total: number }> {
    const search = params.search?.trim();
    const upperSearch = search?.toUpperCase();

    const isValidType = Object.values(MasterDataCategoryType).includes(
      upperSearch as MasterDataCategoryType,
    );

    const VALID_STATUSES: MasterStatus[] = [
      'ACTIVE',
      'DRAFT',
      'INACTIVE',
    ];
    const isValidStatus = VALID_STATUSES.includes(
      upperSearch as MasterStatus,
    );

    const where: Prisma.CategoryWhereInput = {
      ...(params.type ? { type: params.type } : {}),
      // NOTE: `isActive` is deprecated for visibility control.
      // Use `status === MasterStatus.ACTIVE` for all filtering logic.
      ...(params.status
        ? { status: params.status }
        : params.activeOnly
          ? { status: MasterStatus.ACTIVE }
          : {}),
      ...(search && search.length > 0
        ? {
            OR: [
              {
                value: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
              {
                slug: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
              ...(isValidType
                ? [
                    {
                      type: upperSearch as MasterDataCategoryType,
                    },
                  ]
                : []),
              ...(isValidStatus
                ? [
                    {
                      status: upperSearch as MasterStatus,
                    },
                  ]
                : []),
            ],
          }
        : {}),
    };

    const skip = (params.page - 1) * params.limit;

    const [items, total] = await Promise.all([
      this.prisma.category.findMany({
        where,
        skip,
        take: params.limit,
        orderBy: [{ sortOrder: 'asc' }, { value: 'asc' }],
      }),
      this.prisma.category.count({ where }),
    ]);

    return { items, total };
  }

  async listByType(type: MasterDataCategoryType, activeOnly = true): Promise<Category[]> {
    return this.prisma.category.findMany({
      where: {
        type,
        ...(activeOnly
          ? {
              status: MasterStatus.ACTIVE,
            }
          : {}),
      },
      orderBy: [{ sortOrder: 'asc' }, { value: 'asc' }],
    });
  }

  async search(params: {
    value: string;
    type?: MasterDataCategoryType;
    parentId?: string;
  }): Promise<Category[]> {
    const baseWhere: Prisma.CategoryWhereInput = {
      ...(params.type ? { type: params.type } : {}),
      ...(params.parentId ? { parentId: params.parentId } : {}),
      status: MasterStatus.ACTIVE,
    };

    const orderBy: Prisma.CategoryOrderByWithRelationInput[] = [
      { sortOrder: 'asc' },
      { value: 'asc' },
    ];

    const [startsWithMatches, containsMatches] = await Promise.all([
      this.prisma.category.findMany({
        where: {
          ...baseWhere,
          value: {
            startsWith: params.value,
            mode: 'insensitive',
          },
        },
        orderBy,
      }),
      this.prisma.category.findMany({
        where: {
          ...baseWhere,
          value: {
            contains: params.value,
            mode: 'insensitive',
          },
          NOT: {
            value: {
              startsWith: params.value,
              mode: 'insensitive',
            },
          },
        },
        orderBy,
      }),
    ]);

    return [...startsWithMatches, ...containsMatches];
  }

  async searchCities(value: string, parentId?: string): Promise<Category[]> {
    return this.search({
      value,
      type: MasterDataCategoryType.LOCATION_CITY,
      parentId,
    });
  }

  async slugExists(type: MasterDataCategoryType, slug: string, excludeId?: string): Promise<boolean> {
    const count = await this.prisma.category.count({
      where: {
        type,
        slug,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
    });

    return count > 0;
  }

  async listChildren(parentId: string): Promise<Category[]> {
    return this.prisma.category.findMany({
      where: {
        parentId,
        status: MasterStatus.ACTIVE,
      },
    });
  }

  async listChildrenByParentAndType(
    parentId: string,
    type: MasterDataCategoryType,
  ): Promise<Category[]> {
    return this.prisma.category.findMany({
      where: {
        parentId,
        type,
        status: MasterStatus.ACTIVE,
      },
      orderBy: [{ sortOrder: 'asc' }, { value: 'asc' }],
    });
  }

  async hasAncestor(descendantId: string, possibleAncestorId: string): Promise<boolean> {
    let cursor = await this.findById(descendantId);

    while (cursor?.parentId) {
      if (cursor.parentId === possibleAncestorId) {
        return true;
      }

      cursor = await this.findById(cursor.parentId);
    }

    return false;
  }
}
