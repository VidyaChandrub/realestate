import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import axios from 'axios';
import { MasterDataCategoryType, MasterStatus, Prisma } from '@prisma/client';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { PrismaService } from './prisma.service';
import {
  getEmbeddingModel,
  getEmbeddingUrl,
  getOpenAiApiKey,
} from './user-embedding.util';


const FRESHER_EXPERIENCE_LEVEL_SLUG = 'fresher';

const PROFILE_INCLUDE = {
  education: {
    orderBy: [{ displayOrder: 'asc' as const }, { id: 'asc' as const }],
  },
  experience: true as const,
  preferredLocations: true as const,
  skills: true as const,
  documents: true as const,
};

type ProfileWithRelations = Prisma.ProfileGetPayload<{
  include: typeof PROFILE_INCLUDE;
}>;

type ExperienceMonthsInput = {
  yearsOfExperience: number | null;
  monthsOfExperience: number | null;
  relevantYears: number | null;
  relevantMonths: number | null;
};

type ProfileLocationFields = {
  currentCityId?: string | null;
  stateId?: string | null;
  countryId?: string | null;
  preferredLocations?: Array<{
    locationId: string;
  }>;
  preferredEmploymentTypeId?: string[] | null;
  preferredWorkMode?: string[] | null;
  preferences?: unknown;
  notificationSettings?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
  lastLoginAt?: unknown;
};

type HiddenProfileResponseFields =
  | 'preferences'
  | 'notificationSettings'
  | 'createdAt'
  | 'updatedAt'
  | 'lastLoginAt';

type ProfileUniqueField = 'email' | 'mobileNumber';

type UserLookupResult = {
  type: 'consumer' | 'employer' | 'admin';
  data: unknown;
};

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);
  private readonly profileInclude = PROFILE_INCLUDE;

  constructor(private prisma: PrismaService) {}

  async getQualificationValue(qualificationId: string): Promise<string | null> {
    const category = await this.prisma.category.findUnique({
      where: { id: qualificationId },
      select: { value: true },
    });
    return category?.value ?? null;
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async requestEmbeddingFromOpenAI(text: string): Promise<number[]> {
    const model = getEmbeddingModel();
    const apiKey = getOpenAiApiKey();
    const input = text.trim();

    if (!input) {
      throw new Error('Cannot generate embedding for empty profile text');
    }

    const maxAttempts = 3;
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        const response = await axios.post<{
          data: Array<{ embedding: number[] }>;
        }>(
          getEmbeddingUrl(),
          { model, input },
          {
            headers: {
              Authorization: `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
            timeout: 30000,
          },
        );

        const embedding = response.data.data?.[0]?.embedding;
        if (!embedding || embedding.length !== 1536) {
          throw new Error(
            `Unexpected embedding length returned by OpenAI: ${embedding?.length ?? 0}`,
          );
        }

        return embedding;
      } catch (error) {
        const status = axios.isAxiosError(error)
          ? error.response?.status
          : undefined;
        if (status !== 429 || attempt === maxAttempts) {
          // Keep the technical detail (timeout, DNS failure, OpenAI response
          // body, etc.) in the logs for debugging, but never let it leak into
          // the Error we throw — callers only log/surface a generic message.
          this.logger.error(
            `OpenAI embedding request failed for model ${model}: ${this.describeEmbeddingError(error)}`,
          );
          throw new Error('Unable to generate profile embedding at this time');
        }

        const delayMs = attempt * 2000;
        this.logger.warn(
          `Embedding request hit rate limit for model ${model}; retrying in ${delayMs}ms (attempt ${attempt + 1}/${maxAttempts})`,
        );
        await this.sleep(delayMs);
      }
    }

    throw new Error('Unable to generate profile embedding at this time');
  }

  private describeEmbeddingError(error: unknown): string {
    if (axios.isAxiosError(error)) {
      if (error.response) {
        return `HTTP ${error.response.status} ${JSON.stringify(error.response.data)}`;
      }
      return error.code ? `${error.code}: ${error.message}` : error.message;
    }
    return error instanceof Error ? error.message : String(error);
  }

  async generateEmbedding(text: string): Promise<number[]> {
    return this.requestEmbeddingFromOpenAI(text);
  }

  /**
   * Find or create user profile. Called automatically on first API request after login.
   */
  async findOrCreateProfile(user: any) {
    const userId = user.userId ?? user.userId;
    const firstName = user.firstName ?? null;
    const lastName = user.lastName ?? null;
    const email = user.email ?? null;
    const role = user.role ?? null;

    // Fetch user record to get mobileNumber
    const userRecord = await this.getUserRecord(userId);

    let profile = await this.prisma.profile.findUnique({
      where: { userId },
      include: this.profileInclude,
    });

    if (!profile && email) {
      const profileByEmail = await this.prisma.profile.findUnique({
        where: { email },
        include: this.profileInclude,
      });

      if (profileByEmail && profileByEmail.userId !== userId) {
        try {
          profile = await this.prisma.profile.update({
            where: { id: profileByEmail.id },
            data: { userId },
            include: this.profileInclude,
          });
        } catch (error: any) {
          if (error?.code === 'P2002') {
            this.logger.warn(
              `Profile for user ${userId} already exists; skipping email-based reassignment for profile ${profileByEmail.id}.`,
            );
            profile = await this.prisma.profile.findUnique({
              where: { userId },
              include: this.profileInclude,
            });
          } else {
            throw error;
          }
        }
      } else {
        profile = profileByEmail;
      }
    }

    if (!profile) {
      try {
        profile = await this.prisma.profile.create({
          data: {
            userId: userId,
            firstName,
            lastName,
            fullName: `${firstName || ''} ${lastName || ''}`.trim() || email,
            email,
            mobileNumber: userRecord?.mobileNumber ?? null,
            userType: this.extractUserType(role ? [role] : []),
            preferences: {},
            notificationSettings: {
              email: true,
              push: true,
            },
            lastLoginAt: new Date(),
            isActive: true,
          },
          include: {
            ...this.profileInclude,
          },
        });
      } catch (error: any) {
        this.logger.error(`Error creating profile: ${error.message}`);
        throw error;
      }
    } else {
      // Auto-sync mobileNumber if profile has null but user has value
      const updateData: any = { lastLoginAt: new Date() };
      if (!profile.mobileNumber && userRecord?.mobileNumber) {
        updateData.mobileNumber = userRecord.mobileNumber;
      }
      profile = await this.prisma.profile.update({
        where: { id: profile.id },
        data: updateData,
        include: this.profileInclude,
      });
    }

    return profile;
  }

  async getUserRecord(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        mobileNumber: true,
        employer: {
          select: {
            memberships: {
              where: {
                isActive: true,
                isDeleted: false,
              },
              take: 1,
              select: {
                organization: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  async updateCurrentUserProfile(
    userId: string,
    data: {
      firstName: string;
      lastName: string;
      phoneNumber?: string | null;
    },
  ) {
    const updateData: { firstName?: string; lastName?: string; mobileNumber?: string | null } = {
      firstName: data.firstName,
      lastName: data.lastName,
    };
  if (data.phoneNumber !== undefined) {
    const existingMobile = await this.prisma.user.findFirst({
      where: {
        mobileNumber: data.phoneNumber,
        NOT: {
          id: userId,
        },
      },
    });

    if (existingMobile) {
      throw new ConflictException('This mobile number is already taken');
    }

    updateData.mobileNumber = data.phoneNumber;
  }

  await this.prisma.user.update({
    where: { id: userId },
    data: updateData,
  });
}

  async getProfileByUserId(userId: string) {
    return this.prisma.profile.findUnique({
      where: { userId },
      include: this.profileInclude,
    });
  }

  async getUserByIdDetails(userId: string): Promise<UserLookupResult> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        mobileNumber: true,
        role: true,
        isActive: true,
        employer: {
          select: {
            memberships: {
              where: {
                isActive: true,
                isDeleted: false,
              },
              take: 1,
              select: {
                organization: {
                  select: {
                    id: true,
                    name: true,
                    contactEmail: true,
                    contactPhone: true,
                    website: true,
                    industry: true,
                    companySize: true,
                    country: true,
                    state: true,
                    city: true,
                    verificationStatus: true,
                    isApproved: true,
                    isSuspended: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException(`User not found: ${userId}`);
    }

    const normalizedRole = user.role?.toString().toUpperCase();
    if (normalizedRole === 'EMPLOYER' || normalizedRole === 'ADMIN') {
      const organization = user.employer?.memberships?.[0]?.organization ?? null;
      const locationParts = [organization?.city, organization?.state, organization?.country].filter(
        (value): value is string => Boolean(value?.trim()),
      );
      const location = locationParts.length > 0 ? locationParts.join(', ') : null;

      return {
        type: normalizedRole === 'ADMIN' ? 'admin' : 'employer',
        data: {
          userId: user.id,
          role: user.role,
          email: user.email,
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName,
          mobileNumber: user.mobileNumber,
          isActive: user.isActive,
          organizationId: organization?.id ?? null,
          organizationName: organization?.name ?? null,
          organizationEmail: organization?.contactEmail ?? null,
          organizationPhone: organization?.contactPhone ?? null,
          website: organization?.website ?? null,
          industry: organization?.industry ?? null,
          companySize: organization?.companySize ?? null,
          location,
          status: organization?.verificationStatus ?? null,
        },
      };
    }

    const profile = await this.getProfileByUserId(userId);

    if (!profile) {
      throw new NotFoundException(`User not found: ${userId}`);
    }

    const formattedProfile = await this.formatProfileForResponse(profile);

    return {
      type: 'consumer',
      data: formattedProfile,
    };
  }

  async formatProfileForResponse<T extends ProfileLocationFields>(
    profile: T | null,
  ): Promise<
    | (Omit<T, HiddenProfileResponseFields> & {
        currentCity: string | null;
        state: string | null;
        country: string | null;
        preferredLocations: Array<{
          locationId: string;
          location: string;
        }>;
      })
    | null
  > {
    if (!profile) {
      return null;
    }

    const preferredLocationIds = this.uniqueUuidList(
      (profile.preferredLocations ?? []).map((location) => location.locationId),
    );

    const locationIds = this.uniqueUuidList(
      [
        profile.currentCityId,
        profile.stateId,
        profile.countryId,
        ...preferredLocationIds,
      ].filter((value): value is string => Boolean(value)),
    );

    const categories = locationIds.length
      ? await this.prisma.category.findMany({
          where: {
            id: { in: locationIds },
            status: MasterStatus.ACTIVE,
          },
          select: {
            id: true,
            value: true,
          },
        })
      : [];

    const locationValueById = new Map(
      categories.map((category) => [category.id, category.value]),
    );

    const {
      preferences,
      notificationSettings,
      createdAt,
      updatedAt,
      lastLoginAt,
      ...responseProfile
    } = profile;

    return {
      ...responseProfile,
      // Always return arrays for these multiselect fields, even if the
      // underlying value is null/undefined (e.g. a stale row or raw query).
      preferredEmploymentTypeId: profile.preferredEmploymentTypeId ?? [],
      preferredWorkMode: profile.preferredWorkMode ?? [],
      currentCity: profile.currentCityId
        ? (locationValueById.get(profile.currentCityId) ?? null)
        : null,
      state: profile.stateId
        ? (locationValueById.get(profile.stateId) ?? null)
        : null,
      country: profile.countryId
        ? (locationValueById.get(profile.countryId) ?? null)
        : null,
      preferredLocations: (profile.preferredLocations ?? [])
        .map((preferredLocation) => {
          const location = locationValueById.get(preferredLocation.locationId);
          if (!location) {
            return null;
          }

          return {
            locationId: preferredLocation.locationId,
            location,
          };
        })
        .filter(
          (
            preferredLocation,
          ): preferredLocation is { locationId: string; location: string } =>
            Boolean(preferredLocation),
        ),
    };
  }

  /**
   * Update profile using userId
   */
  async updateProfile(userId: string, data: UpdateProfileDto) {
    const {
      education,
      experience,
      preferredLocationIds,
      skills,
      mobileNumber,
      profileCompletionPercentage: _ignoredProfileCompletionPercentage,
      ...profileData
    } = data;

    await this.validateUniqueProfileFields(userId, {
      email: profileData.email,
      mobileNumber,
    });

    const { profileId, profileCompletionPercentage } = await this.prisma.$transaction(async (tx) => {
      // email needs to be synced between User and Profile tables
      if (profileData.email !== undefined) {
        await tx.user.update({
          where: { id: userId },
          data: { email: profileData.email },
        });
      }

      // mobileNumber needs to be synced between User and Profile tables
      if (mobileNumber !== undefined) {
        await tx.user.update({
          where: { id: userId },
          data: { mobileNumber },
        });
      }

      // Update basic profile
      const coreProfile = await tx.profile.update({
        where: { userId: userId },
        data: {
          ...profileData,
          ...(profileData.preferredEmploymentTypeId !== undefined
            ? { preferredEmploymentTypeId: this.uniqueUuidList(profileData.preferredEmploymentTypeId) }
            : {}),
          ...(profileData.preferredWorkMode !== undefined
            ? { preferredWorkMode: this.uniqueUuidList(profileData.preferredWorkMode) }
            : {}),
          ...(mobileNumber !== undefined ? { mobileNumber } : {}),
          updatedAt: new Date(),
        },
      });

      // Sync Education if provided
      if (education && Array.isArray(education)) {
        await tx.education.deleteMany({
          where: { profileId: coreProfile.id },
        });

        if (education.length > 0) {
          const invalidItem = education.find(
            (edu) => !edu.highestQualificationId,
          );
          if (invalidItem) {
            throw new BadRequestException(
              'Each education item must include highestQualificationId',
            );
          }

          // OTHERS specialization validation and storage
          const educationData = education.map((edu, index) => {
            const spec = edu.specialization;

            if (spec === 'OTHERS') {
              const trimmed = edu.customSpecialization?.trim();
              if (!trimmed) {
                throw new BadRequestException(
                  'customSpecialization is required when specialization is OTHERS',
                );
              }
              if (trimmed.length > 255) {
                throw new BadRequestException(
                  'customSpecialization must not exceed 255 characters',
                );
              }
              return {
                displayOrder: index,
                highestQualificationId: edu.highestQualificationId,
                specializationParentId: edu.highestQualificationId,
                degreeName: edu.degreeName,
                specialization: 'OTHERS',
                customSpecialization: trimmed,
                universityName: edu.universityName,
                yearOfPassing: edu.yearOfPassing,
                percentage: edu.percentage,
                profileId: coreProfile.id,
              };
            }

            // normal specialization — clear any stale customSpecialization
            return {
              displayOrder: index,
              highestQualificationId: edu.highestQualificationId,
              specializationParentId: edu.highestQualificationId,
              degreeName: edu.degreeName,
              specialization: spec,
              customSpecialization: null,
              universityName: edu.universityName,
              yearOfPassing: edu.yearOfPassing,
              percentage: edu.percentage,
              profileId: coreProfile.id,
            };
          });

          await tx.education.createMany({ data: educationData });
        }
      }

      // Sync Experience if provided
      if (experience && Array.isArray(experience)) {
        const isFresher = await this.isFresherExperienceLevel(
          coreProfile.experienceLevelId,
        );

        // Fresher users have no professional experience by definition, so
        // switching to Fresher permanently clears any previously recorded
        // experience rather than preserving them.
        await tx.professionalExperience.deleteMany({
          where: { profileId: coreProfile.id },
        });
        if (!isFresher && experience.length > 0) {
          await tx.professionalExperience.createMany({
            data: experience.map((exp) => ({
              ...exp,
              profileId: coreProfile.id,
            })),
          });
        }

        await this.recalculateExperienceMonths(tx, coreProfile.id);
      }

      // Sync Preferred Locations if provided
      if (preferredLocationIds && Array.isArray(preferredLocationIds)) {
        const dedupedLocationIds = this.uniqueUuidList(preferredLocationIds);
        await tx.userPreferredLocation.deleteMany({
          where: { profileId: coreProfile.id },
        });
        if (dedupedLocationIds.length > 0) {
          await tx.userPreferredLocation.createMany({
            data: dedupedLocationIds.map((locationId) => ({
              profileId: coreProfile.id,
              locationId,
            })),
          });
        }
      }

      // Sync Skills if provided
      if (skills && Array.isArray(skills)) {
        await tx.userSkill.deleteMany({ where: { profileId: coreProfile.id } });
        if (skills.length > 0) {
          await tx.userSkill.createMany({
            data: skills.map((skill) => ({
              ...skill,
              profileId: coreProfile.id,
            })),
          });
        }
      }

      const fullProfile = await tx.profile.findUnique({
        where: { id: coreProfile.id },
        include: this.profileInclude,
      });

      if (!fullProfile) {
        throw new NotFoundException('Profile not found');
      }

      const isFresher = await this.isFresherExperienceLevel(
        fullProfile.experienceLevelId,
      );
      const profileCompletionPercentage = this.calculateProfileCompletion(
        fullProfile,
        isFresher,
      );

      await tx.profile.update({
        where: { id: fullProfile.id },
        data: { profileCompletionPercentage },
      });

      return { profileId: coreProfile.id, profileCompletionPercentage };
    });

    const profile = await this.prisma.profile.findUnique({
      where: { id: profileId },
      include: this.profileInclude,
    });

    if (!profile) {
      return null;
    }

    const updatedProfile: ProfileWithRelations = {
      ...profile,
      profileCompletionPercentage,
    };

    return updatedProfile;
  }

  private async validateUniqueProfileFields(
    userId: string,
    fields: Pick<UpdateProfileDto, ProfileUniqueField>,
  ): Promise<void> {
    const checks: Array<Promise<ProfileUniqueField | null>> = [];

    // username updates are no longer supported via profile API

    if (fields.email !== undefined) {
      checks.push(
        this.prisma.user
          .findFirst({
            where: {
              email: fields.email,
              NOT: { id: userId },
            },
            select: { id: true },
          })
          .then((user) => (user ? 'email' : null)),
      );
    }

    if (fields.mobileNumber !== undefined) {
      checks.push(
        this.prisma.user
          .findFirst({
            where: {
              mobileNumber: fields.mobileNumber,
              NOT: { id: userId },
            },
            select: { id: true },
          })
          .then((user) => (user ? 'mobileNumber' : null)),
      );
    }

    const duplicateField = (await Promise.all(checks)).find(Boolean);

    // username duplicate check removed

    if (duplicateField === 'mobileNumber') {
      throw new BadRequestException('This mobile number is already taken');
    }

    if (duplicateField === 'email') {
      throw new BadRequestException('An account with this email already exists');
    }
  }

  async updateUserRole(userId: string, role: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { role: role as any },
    });
  }

  async countByMasterDataId(masterDataId: string): Promise<number> {
    const [profileCount, skillsCount, preferredLocationCount] =
      await Promise.all([
        this.prisma.profile.count({
          where: {
            isActive: true,
            OR: [
              { countryId: masterDataId },
              { stateId: masterDataId },
              { currentCityId: masterDataId },
              { highestQualificationId: masterDataId },
              { experienceLevelId: masterDataId },
              { preferredEmploymentTypeId: { has: masterDataId } },
              { preferredCategoryIds: { has: masterDataId } },
              { preferredInterestIds: { has: masterDataId } },
            ],
          },
        }),
        this.prisma.userSkill.count({
          where: {
            masterDataId,
            profile: { isActive: true },
          },
        }),
        this.prisma.userPreferredLocation.count({
          where: {
            locationId: masterDataId,
            profile: { isActive: true },
          },
        }),
      ]);

    return profileCount + skillsCount + preferredLocationCount;
  }

  /**
   * Extract primary user type from roles
   */
  private extractUserType(roles: string[]): string {
    if (roles.includes('ADMIN')) return 'admin';
    if (roles.includes('EMPLOYER')) return 'employer';
    return 'consumer';
  }

  private calculateProfileCompletion(
    profile: ProfileWithRelations,
    isFresherExperienceLevel = false,
  ): number {
    const calculatePartialScore = (
      fields: Array<string | number | Date | boolean | null | undefined>,
      weight: number,
    ): number => {
      const total = fields.length;
      if (total === 0) {
        return 0;
      }

      const filled = fields.filter((field) => {
        if (typeof field === 'string') return Boolean(field.trim());
        if (typeof field === 'boolean') return field === true;
        return field !== null && field !== undefined;
      }).length;

      if (filled === 0) {
        return 0;
      }

      return Math.round((filled / total) * weight);
    };

    const basicInfoScore =
      profile.fullName?.trim() || profile.email?.trim() ? 20 : 0;

    const locationScore =
      profile.currentCityId || profile.stateId ? 10 : 0;

    // Only the qualification and specialization count towards completion —
    // university name and year of passing are optional details.
    const educationFields = profile.education.length > 0
      ? [
          profile.education[0].highestQualificationId,
          profile.education[0].specialization,
        ]
      : [];

    const educationScore =
      educationFields.length > 0
        ? calculatePartialScore(educationFields, 20)
        : 0;

    // Overall Experience is represented by Profile.experienceLevelId, and
    // completion also requires at least one Professional Experience entry
    // with a valid job title — years/months/company/status don't count.
    const hasExperienceLevel = Boolean(profile.experienceLevelId);
    const hasValidJobTitle = profile.experience.some((entry) =>
      Boolean(entry.jobTitle?.trim()),
    );

    const experienceFields = [hasExperienceLevel, hasValidJobTitle];

    // Freshers have no professional experience by definition, so the
    // Experience section is treated as complete rather than penalized.
    const experienceScore = isFresherExperienceLevel
      ? 20
      : calculatePartialScore(experienceFields, 20);

    // Only employment type and work mode count towards completion — shift,
    // joining date, and preferred locations are optional preferences.
    const jobPrefFields = [
      profile.preferredEmploymentTypeId.length > 0,
      profile.preferredWorkMode.length > 0,
    ];

    const jobPreferencesScore = calculatePartialScore(jobPrefFields, 15);

    const skillsScore =
      profile.skills.length > 0 ? 15 : 0;

    return (
      basicInfoScore +
      locationScore +
      educationScore +
      experienceScore +
      jobPreferencesScore +
      skillsScore
    );
  }

  private async isFresherExperienceLevel(
    experienceLevelId: string | null | undefined,
  ): Promise<boolean> {
    if (!experienceLevelId) {
      return false;
    }

    const category = await this.prisma.category.findUnique({
      where: { id: experienceLevelId },
      select: { type: true, slug: true, status: true },
    });

    return (
      !!category &&
      category.type === MasterDataCategoryType.EXPERIENCE_LEVEL &&
      category.slug === FRESHER_EXPERIENCE_LEVEL_SLUG &&
      category.status === MasterStatus.ACTIVE
    );
  }

  /**
   * Normalizes a list of scalar values before persisting: trims strings,
   * drops null/undefined/empty entries, and removes duplicates while
   * preserving the original ordering of first occurrence.
   */
  private uniqueUuidList<T extends string>(values: readonly T[]): T[] {
    const seen = new Set<T>();
    const result: T[] = [];

    for (const value of values) {
      const trimmed = (typeof value === 'string' ? value.trim() : value) as T;
      if (!trimmed || seen.has(trimmed)) {
        continue;
      }
      seen.add(trimmed);
      result.push(trimmed);
    }

    return result;
  }

  private calculateExperienceMonths(
    experience: readonly ExperienceMonthsInput[],
  ): {
    totalExperienceMonths: number;
    relevantExperienceMonths: number | null;
  } {
    const totalExperienceMonths = experience.reduce((total, item) => {
      return (
        total +
        this.toTotalMonths(item.yearsOfExperience, item.monthsOfExperience)
      );
    }, 0);

    let hasRelevantData = false;
    const relevantExperienceMonths = experience.reduce((total, item) => {
      if (item.relevantYears == null && item.relevantMonths == null) {
        return total;
      }
      hasRelevantData = true;
      return (
        total +
        this.toTotalMonths(item.relevantYears ?? 0, item.relevantMonths ?? 0)
      );
    }, 0);

    return {
      totalExperienceMonths,
      relevantExperienceMonths: hasRelevantData
        ? relevantExperienceMonths
        : null,
    };
  }

  private toTotalMonths(years: number | null, months: number | null): number {
    return Math.max(0, years ?? 0) * 12 + Math.max(0, months ?? 0);
  }

  private async recalculateExperienceMonths(
    tx: Prisma.TransactionClient,
    profileId: string,
  ): Promise<void> {
    const experience = await tx.professionalExperience.findMany({
      where: { profileId },
      select: {
        yearsOfExperience: true,
        monthsOfExperience: true,
        relevantYears: true,
        relevantMonths: true,
      },
    });

    const { totalExperienceMonths, relevantExperienceMonths } =
      this.calculateExperienceMonths(experience);

    await tx.profile.update({
      where: { id: profileId },
      data: {
        totalExperienceMonths,
        relevantExperienceMonths,
      },
    });
  }
}
