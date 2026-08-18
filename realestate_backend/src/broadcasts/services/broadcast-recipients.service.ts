import { Injectable } from '@nestjs/common';
import { Prisma,  UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { BroadcastTargetingRulesDto } from '../dto/broadcast-targeting-rules.dto';

export interface BroadcastTargetingSummaryEntry {
  id: string;
  name: string;
}

export type BroadcastTargetingSummary = Partial<
  Record<
    | 'educationLevels'
    | 'specializations'
    | 'skills'
    | 'experienceLevels'
    | 'countries'
    | 'states'
    | 'cities'
    | 'yearOfPassing',
    BroadcastTargetingSummaryEntry[]
  >
>;

@Injectable()
export class BroadcastRecipientsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Resolves the User IDs of active users whose Profile matches every provided
   * targeting filter. Mirrors the recipient-filtering shape used by
   * AdminService.listApplications so filter semantics stay consistent across admin tooling.
   */
  async resolveRecipientUserIds(rules: BroadcastTargetingRulesDto = {}): Promise<string[]> {
    const profileWhere: Prisma.ProfileWhereInput = { isActive: true };

    if (rules.countryIds?.length) profileWhere.countryId = { in: rules.countryIds };
    if (rules.stateIds?.length) profileWhere.stateId = { in: rules.stateIds };
    if (rules.cityIds?.length) profileWhere.currentCityId = { in: rules.cityIds };
    if (rules.experienceLevelIds?.length) profileWhere.experienceLevelId = { in: rules.experienceLevelIds };
    if (rules.educationLevelIds?.length) profileWhere.highestQualificationId = { in: rules.educationLevelIds };
    if (rules.skillIds?.length) {
      profileWhere.skills = { some: { masterDataId: { in: rules.skillIds } } };
    }

    const educationFilter: Prisma.EducationWhereInput = {};

    if (rules.specializationIds?.length) {
      // Education.specialization is a free-text column, so specialization IDs must first
      // be resolved to their master-data label before filtering profiles.
      const specializationCategories = await this.prisma.category.findMany({
        where: { id: { in: rules.specializationIds }, type: 'SPECIALIZATION' },
        select: { value: true },
      });
      const specializationNames = specializationCategories
        .map((category) => category.value?.trim())
        .filter((value): value is string => !!value);

      if (specializationNames.length === 0) {
        return [];
      }

      educationFilter.specialization = { in: specializationNames };
    }

    if (rules.yearOfPassing?.length) {
      // Education.yearOfPassing is stored as an Int, while targeting rules pass years as strings.
      const years = rules.yearOfPassing.map((year) => parseInt(year, 10)).filter((year) => !Number.isNaN(year));

      if (years.length === 0) {
        return [];
      }

      educationFilter.yearOfPassing = { in: years };
    }

    if (Object.keys(educationFilter).length > 0) {
      profileWhere.education = { some: educationFilter };
    }

    const profiles = await this.prisma.profile.findMany({
      where: profileWhere,
      select: { userId: true },
    });

    const profileUserIds = [...new Set(profiles.map((profile) => profile.userId))];
    if (profileUserIds.length === 0) {
      return [];
    }

    const activeUsers = await this.prisma.user.findMany({
      where: { id: { in: profileUserIds }, isActive: true , role: UserRole.JOB_SEEKER,},
      select: { id: true },
    });

    return activeUsers.map((user) => user.id);
  }

  /**
   * Resolves master-data IDs in the targeting rules to human-readable {id, name} pairs for
   * display in broadcast history. Purely additive/derived data - it never replaces or
   * mutates targetingRules, so existing recipient-resolution filtering is unaffected.
   */
  async resolveTargetingSummary(rules: BroadcastTargetingRulesDto = {}): Promise<BroadcastTargetingSummary> {
    const ruleGroups: Array<{ key: keyof BroadcastTargetingSummary; ids?: string[] }> = [
      { key: 'educationLevels', ids: rules.educationLevelIds },
      { key: 'specializations', ids: rules.specializationIds },
      { key: 'skills', ids: rules.skillIds },
      { key: 'experienceLevels', ids: rules.experienceLevelIds },
      { key: 'countries', ids: rules.countryIds },
      { key: 'states', ids: rules.stateIds },
      { key: 'cities', ids: rules.cityIds },
    ];

    const allIds = [...new Set(ruleGroups.flatMap((group) => group.ids ?? []))];

    const summary: BroadcastTargetingSummary = {};

    if (allIds.length > 0) {
      // Category is the single polymorphic master-data table for all of these filter types, so one
      // query covers every group instead of one lookup per filter.
      const categories = await this.prisma.category.findMany({
        where: { id: { in: allIds } },
        select: { id: true, value: true },
      });
      const nameById = new Map(categories.map((category) => [category.id, category.value]));

      for (const group of ruleGroups) {
        if (!group.ids?.length) continue;
        // Fall back to the raw ID when a category can't be found (e.g. deleted master-data row)
        // so the summary never silently drops a targeted filter.
        summary[group.key] = group.ids.map((id) => ({ id, name: nameById.get(id) ?? id }));
      }
    }

    if (rules.yearOfPassing?.length) {
      // Years are plain values, not master-data IDs, so they pass through as-is.
      summary.yearOfPassing = [...new Set(rules.yearOfPassing)].map((year) => ({ id: year, name: year }));
    }

    return summary;
  }
}
