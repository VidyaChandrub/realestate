import { Injectable } from '@nestjs/common';
import { AdsDbService } from '../prisma.service';

@Injectable()
export class AdvertisementClickRepository {
  constructor(private readonly prisma: AdsDbService) {}

  async create(data: {
    advertisementId: string;
    userId: string;
    userName: string;
    email: string;
    mobileNumber?: string;
    locationId?: string;
    skillIds?: string[];
    experienceLevelId?: string;
    educationLevelId?: string;
    metadata?: any;
  }) {
    return this.prisma.advertisementClick.create({
      data: {
        advertisementId: data.advertisementId,
        userId: data.userId,
        userName: data.userName,
        email: data.email,
        mobileNumber: data.mobileNumber,
        locationId: data.locationId,
        skillIds: data.skillIds ?? [],
        experienceLevelId: data.experienceLevelId,
        educationLevelId: data.educationLevelId,
        metadata: data.metadata ?? {},
      },
      include: {
        advertisement: true,
        user: true,
      },
    });
  }

  async findByAdvertisementId(advertisementId: string, filters?: {
    startDate?: Date;
    endDate?: Date;
    countryIds?: string[];
    stateIds?: string[];
    cityIds?: string[];
    skillIds?: string[];
    experienceLevelIds?: string[];
    educationLevelIds?: string[];
    years?: string[];
    specializationIds?: string[];
  }) {
    const where: any = { advertisementId };

    if (filters?.startDate || filters?.endDate) {
      where.clickedAt = {};
      if (filters.startDate) where.clickedAt.gte = filters.startDate;
      if (filters.endDate) where.clickedAt.lte = filters.endDate;
    }

    if (filters?.skillIds && filters.skillIds.length > 0) {
      where.skillIds = { hasSome: filters.skillIds };
    }

    // Filters that depend on the User Profile
    const userFilters: any = {};
    if (filters?.countryIds && filters.countryIds.length > 0) userFilters.countryId = { in: filters.countryIds };
    if (filters?.stateIds && filters.stateIds.length > 0) userFilters.stateId = { in: filters.stateIds };
    if (filters?.cityIds && filters.cityIds.length > 0) userFilters.currentCityId = { in: filters.cityIds };
    if (filters?.experienceLevelIds && filters.experienceLevelIds.length > 0) userFilters.experienceLevelId = { in: filters.experienceLevelIds };
    if (filters?.educationLevelIds && filters.educationLevelIds.length > 0) userFilters.highestQualificationId = { in: filters.educationLevelIds };
    
    const educationFilter: any = {};

    if (filters?.years && filters.years.length > 0) {
      educationFilter.yearOfPassing = {
        in: filters.years.map((y) => parseInt(y)),
      };
    }

    if (filters?.specializationIds && filters.specializationIds.length > 0) {
      const specializationCategories = await this.prisma.category.findMany({
        where: {
          id: { in: filters.specializationIds },
          type: 'SPECIALIZATION',
        },
        select: { value: true },
      });
      const specializationNames = specializationCategories
        .map((s) => s.value?.trim())
        .filter(Boolean);
      if (specializationNames.length > 0) {
        educationFilter.specialization = {
          in: specializationNames,
        };
      }
    }

    if (Object.keys(educationFilter).length > 0) {
      userFilters.education = {
        some: educationFilter,
      };
    }

    if (Object.keys(userFilters).length > 0) {
      where.user = userFilters;
    }

    return this.prisma.advertisementClick.findMany({
      where,
      include: {
        advertisement: true,
        user: {
          include: {
            education: true
          }
        },
      },
      orderBy: { clickedAt: 'desc' },
    });
  }

  async countByAdvertisementId(advertisementId: string, filters?: {
    startDate?: Date;
    endDate?: Date;
    countryIds?: string[];
    stateIds?: string[];
    cityIds?: string[];
    skillIds?: string[];
    experienceLevelIds?: string[];
    educationLevelIds?: string[];
    years?: string[];
    specializationIds?: string[];
  }) {
    const where: any = { advertisementId };

    if (filters?.startDate || filters?.endDate) {
      where.clickedAt = {};
      if (filters.startDate) where.clickedAt.gte = filters.startDate;
      if (filters.endDate) where.clickedAt.lte = filters.endDate;
    }

    if (filters?.skillIds && filters.skillIds.length > 0) {
      where.skillIds = { hasSome: filters.skillIds };
    }

    const userFilters: any = {};
    if (filters?.countryIds && filters.countryIds.length > 0) userFilters.countryId = { in: filters.countryIds };
    if (filters?.stateIds && filters.stateIds.length > 0) userFilters.stateId = { in: filters.stateIds };
    if (filters?.cityIds && filters.cityIds.length > 0) userFilters.currentCityId = { in: filters.cityIds };
    if (filters?.experienceLevelIds && filters.experienceLevelIds.length > 0) userFilters.experienceLevelId = { in: filters.experienceLevelIds };
    if (filters?.educationLevelIds && filters.educationLevelIds.length > 0) userFilters.highestQualificationId = { in: filters.educationLevelIds };

    const educationFilter: any = {};

    if (filters?.years && filters.years.length > 0) {
      educationFilter.yearOfPassing = {
        in: filters.years.map((y) => parseInt(y)),
      };
    }

    if (filters?.specializationIds && filters.specializationIds.length > 0) {
      const specializationCategories = await this.prisma.category.findMany({
        where: {
          id: { in: filters.specializationIds },
          type: 'SPECIALIZATION',
        },
        select: { value: true },
      });
      const specializationNames = specializationCategories
        .map((s) => s.value?.trim())
        .filter(Boolean);
      if (specializationNames.length > 0) {
        educationFilter.specialization = {
          in: specializationNames,
        };
      }
    }

    if (Object.keys(educationFilter).length > 0) {
      userFilters.education = {
        some: educationFilter,
      };
    }

    if (Object.keys(userFilters).length > 0) {
      where.user = userFilters;
    }

    return this.prisma.advertisementClick.count({ where });
  }

  async findByUserId(userId: string) {
    return this.prisma.advertisementClick.findMany({
      where: { userId },
      include: {
        advertisement: true,
      },
      orderBy: { clickedAt: 'desc' },
    });
  }

  async findByUserAndAdvertisement(userId: string, advertisementId: string) {
    return this.prisma.advertisementClick.findFirst({
      where: {
        userId,
        advertisementId,
      },
    });
  }
}
