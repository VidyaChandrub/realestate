import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { CreateAdvertisementDto } from '../dto/create-advertisement.dto';
import { UpdateAdvertisementDto } from '../dto/update-advertisement.dto';
import { AdvertisementClickDto } from '../dto/advertisement-click.dto';
import { AdvertisementsRepository } from '../repositories/advertisements.repository';
import { AdvertisementTargetingRepository } from '../repositories/advertisement-targeting.repository';
import { AdvertisementClickRepository } from '../repositories/advertisement-click.repository';
import { AdsDbService } from '../prisma.service';
import { AdDisplayType, AdPlacement, AdStatus, AdCtaButtonStyle, AdCtaButtonSize, AdCtaButtonPlacement } from '../entities/advertisement.entity';
import { toArray } from '../helper/toArray';

@Injectable()
export class AdvertisementsService {
  constructor(
    private readonly advertisementsRepository: AdvertisementsRepository,
    private readonly advertisementTargetingRepository: AdvertisementTargetingRepository,
    private readonly advertisementClickRepository: AdvertisementClickRepository,
    private readonly prisma: AdsDbService,
  ) {}

  async create(dto: CreateAdvertisementDto, user: any, targetingData?: {
    countryIds?: string[];
    stateIds?: string[];
    cityIds?: string[];
    skillIds?: string[];
    experienceLevelIds?: string[];
    educationLevelIds?: string[];
    specializationIds?: string[];
    yearOfPassing?: string[];
  }) {
    if (!user || user.role !== 'ADMIN') {
      throw new ForbiddenException('Only admin users can create advertisements');
    }
    const org = await this.prisma.organization.findFirst({
      where: { users: { some: { employer: { userId: user.userId } } } },
    });
    if (!org) throw new NotFoundException('Admin is not part of any organization');
    return this.advertisementsRepository.create(dto, org.id, user.userId, targetingData);
  }

  async findAll(query: any, user: any) {
    return this.advertisementsRepository.findAll(query, user?.userId);
  }

  async findVisible(user: any) {
  const ads = await this.advertisementsRepository.findVisibleAds(user?.userId);

  // Collect all unique specialization UUIDs from advertisements targeting rules
  const specializationIds = [
    ...new Set(
      ads.flatMap((ad) =>
        (ad.targeting ?? []).flatMap((t) => t.specializationIds ?? []),
      ),
    ),
  ].filter(Boolean) as string[];

  const specializationMap = new Map<string, string>();
  if (specializationIds.length > 0) {
    const categories = await this.prisma.category.findMany({
      where: { id: { in: specializationIds } },
      select: { id: true, value: true },
    });
    categories.forEach((c) => {
      specializationMap.set(c.id, c.value);
    });
  }

  // ----------------------------------------------------------------
  // Helper: check if an ad has NO targeting at all (generic ad)
  // Generic ads are shown to everyone regardless of profile.
  // ----------------------------------------------------------------
  const isGenericAd = (ad: any): boolean => {
    if (!ad.targeting || ad.targeting.length === 0) return true;
    return ad.targeting.every((t: any) => {
      const hasAnyTargeting =
        t.cityIds?.length > 0 ||
        t.stateIds?.length > 0 ||
        t.countryIds?.length > 0 ||
        t.skillIds?.length > 0 ||
        t.experienceLevelIds?.length > 0 ||
        t.educationLevelIds?.length > 0 ||
        t.specializationIds?.length > 0 ||
        t.yearOfPassing?.length > 0;
      return !hasAnyTargeting;
    });
  };

  // Fetch user profile with education entries (needed for yearOfPassing)
  const userProfile = await this.prisma.profile.findUnique({
    where: { userId: user.userId },
    include: { skills: true, education: true },
  });

  // If no profile, only show generic ads
  if (!userProfile) {
    return ads.filter(isGenericAd);
  }

  // ----------------------------------------------------------------
  // Extract user attributes
  // ----------------------------------------------------------------
  const userCityId    = userProfile.currentCityId;   // current city (from profile)
  const userStateId   = userProfile.stateId;          // current state (from profile)
  const userCountryId = userProfile.countryId;        // current country (from profile)

  // Preferred locations — these are CITY-level only (per schema/requirements)
  const userPreferredLocations = await this.advertisementsRepository.getUserPrefferedLocations(userProfile.id);
  const preferredCityIds = new Set(userPreferredLocations.map((loc) => loc.locationId));

  const userSkillIds = new Set(
    (userProfile.skills ?? []).map((s) => s.masterDataId).filter(Boolean) as string[],
  );

  // Collect all yearOfPassing values across all education entries
  const userEducationYears = new Set(
    (userProfile.education ?? []).map((e) => String(e.yearOfPassing)),
  );

  const userSpecializations = new Set<string>(
    (userProfile.education ?? [])
      .map((e) => e.specialization)
      .filter(Boolean) as string[],
  );

  // ----------------------------------------------------------------
  // LOCATION matching (PRIMARY gate)
  //
  // Rules:
  //   1. If targeting has cityIds  → match user's current city OR any preferred city.
  //      (Preferred locations are city-only; they never match state/country targeting.)
  //   2. Else if targeting has stateIds  → match user's profile stateId only.
  //      (Preferred locations are cities, not states — no cross-level match.)
  //   3. Else if targeting has countryIds → match user's profile countryId only.
  //   4. If none of the above are set → no location restriction, match all.
  // ----------------------------------------------------------------
  const matchLocation = (t: any): boolean => {
    const hasCities    = t.cityIds?.length    > 0;
    const hasStates    = t.stateIds?.length   > 0;
    const hasCountries = t.countryIds?.length > 0;

    // No location targeting set — passes for everyone
    if (!hasCities && !hasStates && !hasCountries) return true;

    if (hasCities) {
      // Match current city OR any preferred city
      const currentCityMatch = !!userCityId && t.cityIds.includes(userCityId);
      const preferredCityMatch = t.cityIds.some((id: string) => preferredCityIds.has(id));
      return currentCityMatch || preferredCityMatch;
    }

    if (hasStates) {
      // Only profile stateId — preferred locations are city-level, not state-level
      return !!userStateId && t.stateIds.includes(userStateId);
    }

    // Only countryIds remain
    return !!userCountryId && t.countryIds.includes(userCountryId);
  };

  // ----------------------------------------------------------------
  // SECONDARY criteria (education, experience, yearOfPassing)
  //
  // IMPORTANT — "match only on what is set" rule:
  //   Each helper returns true immediately when its targeting array
  //   is empty or absent, meaning that criterion is simply ignored.
  //
  //   Examples:
  //     • Ad has cityIds only  → only location is checked; everyone
  //       in that city sees the ad regardless of education/experience.
  //     • Ad has cityIds + experienceLevelIds, no educationLevelIds →
  //       location AND experience must match; education is ignored.
  //     • Ad has all four → all four must match.
  //
  // In other words: only the criteria that are actually present in
  // the targeting rule participate in the match decision.
  // ----------------------------------------------------------------
  const matchExperience = (ids: string[]): boolean => {
    if (!ids || ids.length === 0) return true; // not set → ignored
    return !!(userProfile.experienceLevelId && ids.includes(userProfile.experienceLevelId));
  };

  const matchEducationLevel = (ids: string[]): boolean => {
    if (!ids || ids.length === 0) return true; // not set → ignored
    return !!(userProfile.highestQualificationId && ids.includes(userProfile.highestQualificationId));
  };

  const matchYearOfPassing = (years: string[]): boolean => {
    if (!years || years.length === 0) return true; // not set → ignored
    return years.some((year) => userEducationYears.has(year));
  };

  const matchSpecialization = (ids: string[]): boolean => {
    if (!ids || ids.length === 0) return true; // not set → ignored
    return ids.some((id) => {
      const specName = specializationMap.get(id);
      return !!specName && userSpecializations.has(specName);
    });
  };

  // Skills — OR match: user must have AT LEAST ONE of the targeted
  // skill tags (e.g. targeting [Python, HTML/CSS] matches a user who
  // only has HTML/CSS, or only Python, or both).
  const matchSkills = (ids: string[]): boolean => {
    if (!ids || ids.length === 0) return true; // not set → ignored
    return ids.some((id) => userSkillIds.has(id));
  };

  // ----------------------------------------------------------------
  // Main filter
  //
  // An ad is shown when:
  //   • It is generic (no targeting at all), OR
  //   • At least one targeting rule satisfies ALL of its own criteria:
  //       1. location      (primary gate — always checked)
  //       2. experience level  (only if set on the targeting rule)
  //       3. education level   (only if set on the targeting rule)
  //       4. year of passing   (only if set on the targeting rule)
  //       5. specialization    (only if set on the targeting rule)
  //       6. skills (OR match) (only if set on the targeting rule)
  //
  //   Criteria that are absent from the rule are treated as "no
  //   restriction" and always pass, so an ad with only location
  //   targeting is matched purely on location.
  // ----------------------------------------------------------------
  return ads.filter((ad) => {
    if (isGenericAd(ad)) return true;

    // OR-logic across multiple targeting rules on the same ad
    return ad.targeting.some((t: any) => {
      const locationMatch = matchLocation(t);
      if (!locationMatch) return false; // location is the primary gate

      return (
        matchExperience(t.experienceLevelIds) &&
        matchEducationLevel(t.educationLevelIds) &&
        matchYearOfPassing(t.yearOfPassing) &&
        matchSpecialization(t.specializationIds) &&
        matchSkills(t.skillIds)
      );
    });
  });
}

  async findOne(id: string) {
    const ad = await this.advertisementsRepository.findById(id);
    if (!ad) throw new NotFoundException('Advertisement not found');
    return ad;
  }

  async update(id: string, dto: UpdateAdvertisementDto, user: any) {
    const ad = await this.advertisementsRepository.findById(id);
    if (!ad) throw new NotFoundException('Advertisement not found');
    if (user.role !== 'ADMIN' || ad.userId !== user.userId) {
      throw new ForbiddenException('Not allowed to update this advertisement');
    }
    return this.advertisementsRepository.update(id, dto, user.userId);
  }

  async remove(id: string, user: any) {
    const ad = await this.advertisementsRepository.findById(id);
    if (!ad) throw new NotFoundException('Advertisement not found');
    if (user.role !== 'ADMIN' || ad.userId !== user.userId) {
      throw new ForbiddenException('Not allowed to delete this advertisement');
    }
    return this.advertisementsRepository.delete(id);
  }

  async updateStatus(id: string, status: AdStatus, user: any) {
    const ad = await this.advertisementsRepository.findById(id);
    if (!ad) throw new NotFoundException('Advertisement not found');
    if (user.role !== 'ADMIN' || ad.userId !== user.userId) {
      throw new ForbiddenException('Not allowed to update status');
    }
    return this.advertisementsRepository.updateStatus(id, status);
  }

  async deactivateCompletedAds(): Promise<number> {
    return this.advertisementsRepository.deactivateCompletedAds();
  }

  async trackClick(id: string, dto: AdvertisementClickDto, user: any) {
    const ad = await this.advertisementsRepository.findById(id);
    if (!ad) throw new NotFoundException('Advertisement not found');

    const userProfile = await this.prisma.profile.findUnique({
      where: { userId: user.userId },
      include: { skills: true },
    });

    if (!userProfile) {
      throw new NotFoundException('User profile not found');
    }

    let metadata = {};
    if (dto.metadata) {
      try {
        metadata = JSON.parse(dto.metadata);
      } catch (e) {
        metadata = { raw: dto.metadata };
      }
    }

    return this.advertisementClickRepository.create({
      advertisementId: id,
      userId: userProfile.id,
      userName: userProfile.fullName || userProfile.email || '',
      email: userProfile.email || '',
      mobileNumber: userProfile.mobileNumber ?? undefined,
      locationId: userProfile.currentCityId ?? undefined,
      skillIds: userProfile.skills.map(s => s.masterDataId).filter(Boolean) as string[],
      experienceLevelId: userProfile.experienceLevelId ?? undefined,
      educationLevelId: userProfile.highestQualificationId ?? undefined,
      metadata,
    });
  }

  async getClicks(id: string, query: any) {
    const ad = await this.advertisementsRepository.findById(id);
    if (!ad) throw new NotFoundException('Advertisement not found');

    const filters: any = {};
    if (query?.startDate) filters.startDate = new Date(query.startDate);
    if (query?.endDate) filters.endDate = new Date(query.endDate);

    const getParam = (key: string) => query?.[key] ?? query?.[`${key}[]`];

    filters.countryIds = toArray(getParam('countryIds'));
    filters.stateIds = toArray(getParam('stateIds'));
    filters.cityIds = toArray(getParam('cityIds'));
    filters.skillIds = toArray(getParam('skillIds'));
    filters.experienceLevelIds = toArray(getParam('experienceLevelIds'));
    filters.educationLevelIds = toArray(getParam('educationLevelIds'));
    filters.years = toArray(getParam('years'));
    filters.specializationIds = toArray(getParam('specializationIds'));

    return this.advertisementClickRepository.findByAdvertisementId(id, filters);
  }

  async getClicksCount(id: string, query: any) {
    const ad = await this.advertisementsRepository.findById(id);
    if (!ad) throw new NotFoundException('Advertisement not found');

    const filters: any = {};
    if (query?.startDate) filters.startDate = new Date(query.startDate);
    if (query?.endDate) filters.endDate = new Date(query.endDate);
    
    const getParam = (key: string) => query?.[key] ?? query?.[`${key}[]`];

    filters.countryIds = toArray(getParam('countryIds'));
    filters.stateIds = toArray(getParam('stateIds'));
    filters.cityIds = toArray(getParam('cityIds'));
    filters.skillIds = toArray(getParam('skillIds'));
    filters.experienceLevelIds = toArray(getParam('experienceLevelIds'));
    filters.educationLevelIds = toArray(getParam('educationLevelIds'));
    filters.years = toArray(getParam('years'));
    filters.specializationIds = toArray(getParam('specializationIds'));

    return this.advertisementClickRepository.countByAdvertisementId(id, filters);
  }

  async exportClicks(id: string, query: any) {
    const clicks = await this.getClicks(id, query);
    
    const categoryIds = new Set<string>();
    clicks.forEach(click => {
      if (click.locationId) categoryIds.add(click.locationId);
      if (click.experienceLevelId) categoryIds.add(click.experienceLevelId);
      if (click.educationLevelId) categoryIds.add(click.educationLevelId);
      if (click.skillIds && click.skillIds.length > 0) {
        click.skillIds.forEach(skillId => categoryIds.add(skillId));
      }
      // Add country and state from user profile
      const user: any = click.user;
      if (user?.countryId) categoryIds.add(user.countryId);
      if (user?.stateId) categoryIds.add(user.stateId);
      // Add all highestQualificationIds from education records
      if (user?.education) {
        user.education.forEach((e: any) => {
          if (e.highestQualificationId) categoryIds.add(e.highestQualificationId);
        });
      }
    });

    const categories = await this.prisma.category.findMany({
      where: { id: { in: Array.from(categoryIds) } },
      select: { id: true, value: true },
    });

    const categoryMap = new Map(categories.map(c => [c.id, c.value]));

    const csvHeader = ['User ID', 'User Name', 'Email', 'Mobile Number', 'Country', 'State', 'City', 'Skills', 'Experience Level', 'Education Level', 'Specialization', 'Year of Passing', 'Clicked At'];
    const csvRows = clicks.map(click => {
      const user: any = click.user;
      const countryName = user?.countryId ? categoryMap.get(user.countryId) || user.countryId : '';
      const stateName = user?.stateId ? categoryMap.get(user.stateId) || user.stateId : '';
      const cityName = click.locationId ? categoryMap.get(click.locationId) || click.locationId : '';
      const experienceName = click.experienceLevelId ? categoryMap.get(click.experienceLevelId) || click.experienceLevelId : '';
      const educationNames: string[] = [];
      const seenEdu = new Set<string>();
      for (const e of (user?.education ?? [])) {
        if (!e.highestQualificationId) continue;
        const name = categoryMap.get(e.highestQualificationId);
        if (!name || seenEdu.has(name)) continue;
        seenEdu.add(name);
        educationNames.push(name);
      }
      const educationName = educationNames.length > 0
        ? educationNames.join(', ')
        : (click.educationLevelId ? categoryMap.get(click.educationLevelId) || '' : '');
      const skillsNames = (click.skillIds || []).map(skillId => categoryMap.get(skillId) || skillId).join('; ');
      const specialization = (user?.education ?? [])
        .map((e: any) => e.specialization)
        .filter(Boolean)
        .join(', ');
      const yearOfPassing = [...new Set(
        (user?.education ?? [])
          .map((e: any) => e.yearOfPassing)
          .filter((y: any) => y != null),
      )].join(', ');

      return [
        `"${click.userId}"`,
        `"${click.userName}"`,
        `"${click.email}"`,
        `"${click.mobileNumber || ''}"`,
        `"${countryName}"`,
        `"${stateName}"`,
        `"${cityName}"`,
        `"${skillsNames}"`,
        `"${experienceName}"`,
        `"${educationName}"`,
        `"${specialization}"`,
        `"${yearOfPassing}"`,
        `"${click.clickedAt.toISOString()}"`,
      ];
    });

    const csvContent = [csvHeader.map(h => `"${h}"`).join(','), ...csvRows.map(row => row.join(','))].join('\n');
    return csvContent;
  }

  async clone(id: string, user: any) {
    const ad = await this.advertisementsRepository.findById(id);
    if (!ad) throw new NotFoundException('Advertisement not found');
    if (ad.userId !== user.userId) throw new ForbiddenException('You can only clone your own advertisements');

    const targetingData = ad.targeting?.[0] ? {
      countryIds: ad.targeting[0].countryIds || undefined,
      stateIds: ad.targeting[0].stateIds || undefined,
      cityIds: ad.targeting[0].cityIds || undefined,
      skillIds: ad.targeting[0].skillIds || undefined,
      experienceLevelIds: ad.targeting[0].experienceLevelIds || undefined,
      educationLevelIds: ad.targeting[0].educationLevelIds || undefined,
      specializationIds: ad.targeting[0].specializationIds || undefined,
      yearOfPassing: ad.targeting[0].yearOfPassing || undefined,
    } : undefined;

    const dto: CreateAdvertisementDto = {
      title: ad.title + " - Clone",
      description: ad.description ?? undefined,
      redirectUrl: ad.redirectUrl ?? undefined,
      ctaText: ad.ctaText ?? undefined,
      ctaTextColor: ad.ctaTextColor ?? undefined,
      ctaBackgroundColor: ad.ctaBackgroundColor ?? undefined,
      ctaButtonStyle: ad.ctaButtonStyle as AdCtaButtonStyle | undefined,
      ctaButtonSize: ad.ctaButtonSize as AdCtaButtonSize | undefined,
      ctaButtonPlacement: ad.ctaButtonPlacement as AdCtaButtonPlacement | undefined,
      startDateTime: ad.startDateTime.toISOString(),
      endDateTime: ad.endDateTime.toISOString(),
      placement: AdPlacement[ad.placement],
      priority: ad.priority,
      status: AdStatus.DRAFT,
      displayType: AdDisplayType[ad.displayType],
      media: ad.media?.map(m => ({
        mediaUrl: m.mediaUrl,
        mediaType: m.mediaType as any,
        order: m.order ?? undefined,
        thumbnailUrl: m.thumbnailUrl ?? undefined,
        altText: m.altText ?? undefined,
      })),
      countryIds: targetingData?.countryIds,
      stateIds: targetingData?.stateIds,
      cityIds: targetingData?.cityIds,
      skillIds: targetingData?.skillIds,
      experienceLevelIds: targetingData?.experienceLevelIds,
      educationLevelIds: targetingData?.educationLevelIds,
      specializationIds: targetingData?.specializationIds,
      yearOfPassing: targetingData?.yearOfPassing,
    };

    return this.advertisementsRepository.create(dto, ad.organizationId, user.userId, targetingData);
  }
}
