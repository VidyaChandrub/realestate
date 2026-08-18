import { Injectable } from '@nestjs/common';
import { AdsDbService } from '../prisma.service';

@Injectable()
export class AdvertisementTargetingRepository {
  constructor(private readonly prisma: AdsDbService) {}

  async create(data: {
    advertisementId: string;
    countryIds?: string[];
    stateIds?: string[];
    cityIds?: string[];
    skillIds?: string[];
    experienceLevelIds?: string[];
    educationLevelIds?: string[];
    specializationIds?: string[];
    yearOfPassing?: string[];
  }) {
    return this.prisma.advertisementTargeting.create({
      data: {
        advertisementId: data.advertisementId,
        countryIds: data.countryIds ?? [],
        stateIds: data.stateIds ?? [],
        cityIds: data.cityIds ?? [],
        skillIds: data.skillIds ?? [],
        experienceLevelIds: data.experienceLevelIds ?? [],
        educationLevelIds: data.educationLevelIds ?? [],
        specializationIds: data.specializationIds ?? [],
        yearOfPassing: data.yearOfPassing,
      },
    });
  }

  async findByAdvertisementId(advertisementId: string) {
    return this.prisma.advertisementTargeting.findFirst({
      where: { advertisementId },
    });
  }

  async update(
    advertisementId: string,
    data: {
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
    const targeting = await this.findByAdvertisementId(advertisementId);
    if (!targeting) {
      return null;
    }
    return this.prisma.advertisementTargeting.update({
      where: { id: targeting.id },
      data: {
        ...(data.countryIds !== undefined && { countryIds: data.countryIds }),
        ...(data.stateIds !== undefined && { stateIds: data.stateIds }),
        ...(data.cityIds !== undefined && { cityIds: data.cityIds }),
        ...(data.skillIds !== undefined && { skillIds: data.skillIds }),
        ...(data.experienceLevelIds !== undefined && { experienceLevelIds: data.experienceLevelIds }),
        ...(data.educationLevelIds !== undefined && { educationLevelIds: data.educationLevelIds }),
        ...(data.specializationIds !== undefined && { specializationIds: data.specializationIds }),
        ...(data.yearOfPassing !== undefined && { yearOfPassing: data.yearOfPassing }),
      },
    });
  }

  async delete(advertisementId: string) {
    const targeting = await this.findByAdvertisementId(advertisementId);
    if (!targeting) {
      return null;
    }
    return this.prisma.advertisementTargeting.delete({
      where: { id: targeting.id },
    });
  }
}
