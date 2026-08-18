import { Injectable } from '@nestjs/common';
import { AdsDbService } from '../prisma.service';
import { CreateAdvertisementDto } from '../dto/create-advertisement.dto';
import { UpdateAdvertisementDto } from '../dto/update-advertisement.dto';
import { AdStatus } from '../entities/advertisement.entity';

@Injectable()
export class AdvertisementsRepository {
  constructor(private readonly prisma: AdsDbService) { }

  async create(
    dto: CreateAdvertisementDto,
    organizationId: string,
    userId: string,
    targetingData?: {
      countryIds?: string[];
      stateIds?: string[];
      cityIds?: string[];
      skillIds?: string[];
      experienceLevelIds?: string[];
      educationLevelIds?: string[];
      specializationIds?: string[];
      yearOfPassing?: string[];
    },
  ) {
    return this.prisma.advertisement.create({
      data: {
        title: dto.title,
        description: dto.description,
        redirectUrl: dto.redirectUrl,
        ctaText: dto.ctaText,
        ctaTextColor: dto.ctaTextColor,
        ctaBackgroundColor: dto.ctaBackgroundColor,
        ctaButtonStyle: dto.ctaButtonStyle,
        ctaButtonSize: dto.ctaButtonSize,
        ctaButtonPlacement: dto.ctaButtonPlacement,
        startDateTime: new Date(dto.startDateTime),
        endDateTime: new Date(dto.endDateTime),
        placement: dto.placement,
        priority: dto.priority,
        status: dto.status as any,
        displayType: dto.displayType,
        organizationId,
        userId,
        media: dto.media?.length
          ? {
            create: dto.media.map((m, index) => ({
              mediaUrl: m.mediaUrl,
              mediaType: m.mediaType,
              order: m.order ?? index,
              thumbnailUrl: m.thumbnailUrl,
              altText: m.altText,
              createdBy: userId,
              modifiedBy: userId,
            })),
          }
          : undefined,
        targeting: targetingData
          ? {
            create: {
              countryIds: targetingData.countryIds ?? [],
              stateIds: targetingData.stateIds ?? [],
              cityIds: targetingData.cityIds ?? [],
              skillIds: targetingData.skillIds ?? [],
              experienceLevelIds: targetingData.experienceLevelIds ?? [],
              educationLevelIds: targetingData.educationLevelIds ?? [],
              specializationIds: targetingData.specializationIds ?? [],
              yearOfPassing: targetingData.yearOfPassing,
            },
          }
          : undefined,
      },
      include: {
        media: { orderBy: { order: 'asc' } },
        targeting: true,
        organization: true,
      },
    });
  }

  async findAll(filters?: any, userId?: string) {
    const where: any = {};

    if (filters?.organizationId) {
      where.organizationId = filters.organizationId;
    }
    if (filters?.status) {
      if (filters?.status == 'COMPLETED') {
        where.endDateTime = { lte: new Date() };
      }
      else if (filters?.status == "DRAFT") {
        where.status = "DRAFT";
        where.endDateTime = { gte: new Date() };
      }
      else if (filters?.status == "ACTIVE") {
        where.status = "ACTIVE";
        where.endDateTime = { gte: new Date() };
      }
      else if (filters?.status == "INACTIVE") {
        where.status = "INACTIVE";
        where.endDateTime = { gte: new Date() };
      }
      else {
        where.status = filters.status;
      }
    }
    if (filters?.createdAt) {
      const createdAtDate = new Date(filters.createdAt);
      if (!isNaN(createdAtDate.getTime())) {
        const startOfDay = new Date(createdAtDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(createdAtDate);
        endOfDay.setHours(23, 59, 59, 999);
        where.createdAt = { gte: startOfDay, lte: endOfDay };
      }
    }
    if (filters?.placement) {
      where.placement = filters.placement;
    }
    if (filters?.displayType) {
      where.displayType = filters.displayType;
    }
    if (filters?.startDate || filters?.endDate) {
      where.AND = [
        ...(filters.startDate
          ? [{ startDateTime: { gte: new Date(filters.startDate) } }]
          : []),
        ...(filters.endDate
          ? [{ endDateTime: { lte: new Date(new Date(filters.endDate).setHours(23, 59, 59, 999)) } }]
          : []),
      ];
    }

    if (filters?.search?.trim()) {
      where.title = { contains: filters.search.trim(), mode: 'insensitive' };
    }

    // only show ads that are created by user
    if (userId) {
      where.userId = userId;
    }

    const skip =
      filters?.page && filters?.limit
        ? (parseInt(filters.page) - 1) * parseInt(filters.limit)
        : undefined;
    const take = filters?.limit ? parseInt(filters.limit) : undefined;



    const [data, total] = await Promise.all([
      this.prisma.advertisement.findMany({
        where,
        include: {
          media: { orderBy: { order: 'asc' } },
          targeting: true,
          organization: true,
          _count: {
            select: { clicks: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.advertisement.count({ where }),
    ]);

    return { data, total };
  }

  async findById(id: string) {
    return this.prisma.advertisement.findUnique({
      where: { id },
      include: {
        media: { orderBy: { order: 'asc' } },
        targeting: true,
        organization: true,
        clicks: {
          take: 10,
          orderBy: { clickedAt: 'desc' },
        },
      },
    });
  }

  async update(id: string, dto: UpdateAdvertisementDto, userId: string) {
    // If media data is provided, delete existing and re-create
    if (dto.media) {
      await this.prisma.advertisementMedia.deleteMany({
        where: { advertisementId: id },
      });
    }

    return this.prisma.advertisement.update({
      where: { id },
      data: {
        title: dto.title,
        description: dto.description,
        redirectUrl: dto.redirectUrl,
        ctaText: dto.ctaText,
        ctaTextColor: dto.ctaTextColor,
        ctaBackgroundColor: dto.ctaBackgroundColor,
        ctaButtonStyle: dto.ctaButtonStyle,
        ctaButtonSize: dto.ctaButtonSize,
        ctaButtonPlacement: dto.ctaButtonPlacement,
        startDateTime: dto.startDateTime
          ? new Date(dto.startDateTime)
          : undefined,
        endDateTime: dto.endDateTime ? new Date(dto.endDateTime) : undefined,
        placement: dto.placement,
        priority: dto.priority,
        status: dto.status,
        displayType: dto.displayType,
        media: dto.media
          ? {
            create: dto.media.map((m, index) => ({
              mediaUrl: m.mediaUrl,
              mediaType: m.mediaType,
              order: m.order ?? index,
              thumbnailUrl: m.thumbnailUrl,
              altText: m.altText,
              createdBy: userId,
              modifiedBy: userId,
            })),
          }
          : undefined,
        targeting: {
          updateMany: {
            where: { advertisementId: id },
            data: {
              ...(dto.countryIds !== undefined && {
                countryIds: dto.countryIds,
              }),
              ...(dto.stateIds !== undefined && { stateIds: dto.stateIds }),
              ...(dto.cityIds !== undefined && { cityIds: dto.cityIds }),
              ...(dto.skillIds !== undefined && { skillIds: dto.skillIds }),
              ...(dto.experienceLevelIds !== undefined && {
                experienceLevelIds: dto.experienceLevelIds,
              }),
              ...(dto.educationLevelIds !== undefined && {
                educationLevelIds: dto.educationLevelIds,
              }),
              ...(dto.specializationIds !== undefined && {
                specializationIds: dto.specializationIds,
              }),
              ...(dto.yearOfPassing !== undefined && {
                yearOfPassing: dto.yearOfPassing,
              }),
            },
          },
        },
      },
      include: {
        media: { orderBy: { order: 'asc' } },
        targeting: true,
        organization: true,
      },
    });
  }

  async delete(id: string) {
    return this.prisma.advertisement.delete({
      where: { id },
    });
  }

  async updateStatus(id: string, status: AdStatus) {
    return this.prisma.advertisement.update({
      where: { id },
      data: { status: status as any },
      include: {
        media: { orderBy: { order: 'asc' } },
        targeting: true,
        organization: true,
      },
    });
  }

  async deactivateCompletedAds(now = new Date()): Promise<number> {
    const result = await this.prisma.advertisement.updateMany({
      where: {
        endDateTime: { lt: now },
        status: AdStatus.ACTIVE,
      },
      data: { status: AdStatus.INACTIVE },
    });

    return result.count;
  }

  async findVisibleAds(userId: string) {
    const now = new Date();
    const ads = await this.prisma.advertisement.findMany({
      where: {
        status: 'ACTIVE',
        startDateTime: { lte: now },
        endDateTime: { gte: now },
      },
      include: {
        media: { orderBy: { order: 'asc' } },
        targeting: true,
        organization: true,
      },
    });

    return ads;
  }

  async getUserPrefferedLocations(userProfileId: string) {
    const locations = await this.prisma.userPreferredLocation.findMany({
      where: {
        profileId: userProfileId,
      },
    });
    return locations;
  }
}
