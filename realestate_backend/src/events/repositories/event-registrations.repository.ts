// src/events/repositories/event-registrations.repository.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { EventRegistration, Prisma, RegistrationStatus, MasterDataCategoryType } from '@prisma/client';
import { ListRegistrationsDto } from '../dto/list-registrations.dto';

type EventRegistrationWithUser = EventRegistration & {
    user: {
        id: string;
        fullName?: string | null;
        email?: string | null;
        mobileNumber?: string | null;
        phoneNumber?: string | null;
        currentCityId?: string | null;
        stateId?: string | null;
        countryId?: string | null;
        experienceLevelId?: string | null;
        highestQualificationId?: string | null;
        totalExperienceMonths?: number | null;
        preferredEmploymentTypeId?: string[];
        preferredWorkMode?: string[];
        shiftPreference?: string | null;
        availableJoiningDate?: Date | null;
        preferredLocations?: {
            locationId: string;
        }[];
        education?: {
            id: string;
            highestQualificationId?: string | null;
            yearOfPassing?: number | null;
            degreeName?: string;
            specialization?: string | null;
            universityName?: string | null;
        }[];
        experience?: {
            jobTitle: string;
            companyName: string | null;
            yearsOfExperience: number | null;
            monthsOfExperience: number | null;
            employmentStatus: string | null;
            currentSalary?: number | null;
            expectedSalary?: number | null;
        }[];
        skills?: {
            masterDataId: string | null;
        }[];
    } | null;
};

@Injectable()
export class EventRegistrationsRepository {
    constructor(private readonly prisma: PrismaService) { }

    async create(data: Prisma.EventRegistrationCreateInput): Promise<EventRegistration> {
        return this.prisma.eventRegistration.create({ data });
    }

    async findByEventAndUser(eventId: string, userId: string): Promise<EventRegistration | null> {
        return this.prisma.eventRegistration.findUnique({
            where: { eventId_userId: { eventId, userId } },
        });
    }

    async findAllByEvent(
        eventId: string,
        query: ListRegistrationsDto,
    ): Promise<{ registrations: EventRegistrationWithUser[]; total: number; page: number; limit: number }> {
        const page = query.page ?? 1;
        const rawLimit = query.limit ?? 100;
        const limit = Math.min(Math.max(rawLimit, 1), 200);
        const skip = (page - 1) * limit;
        const take = limit;

        // Build dynamic where clause based on filters
        const where: Prisma.EventRegistrationWhereInput = {
            eventId,
            status: RegistrationStatus.REGISTERED,
        };

        // Build profile-based filters
        const profileFilters: Prisma.ProfileWhereInput[] = [];

        if (query.skillIds?.length) {
            profileFilters.push({
                skills: { some: { masterDataId: { in: query.skillIds } } },
            });
        }

        if (query.experienceIds?.length) {
            profileFilters.push({
                experienceLevelId: { in: query.experienceIds },
            });
        }

        if (query.educationIds?.length) {
            profileFilters.push({
                highestQualificationId: { in: query.educationIds },
            });
        }
        if (query.specializationIds?.length) {
            const specializations = await this.prisma.category.findMany({
                where: {
                    id: { in: query.specializationIds },
                    type: MasterDataCategoryType.SPECIALIZATION,
                },
                select: {
                    value: true,
                },
            });

            const specializationNames = specializations.map(s => s.value?.trim()).filter(Boolean);

            if (specializationNames.length) {
                profileFilters.push({
                    education: {
                        some: {
                            specialization: {
                                in: specializationNames,
                            },
                        },
                    },
                });
            }
        }

        if (query.countryIds?.length) {
            profileFilters.push({
                countryId: { in: query.countryIds },
            });
        } else if (query.countryId) {
            profileFilters.push({
                countryId: query.countryId,
            });
        }

        let validStateIds: string[] = Array.isArray(query.stateIds) ? query.stateIds : [];

        if (validStateIds.length && (query.countryIds?.length || query.countryId)) {
            const validStates = await this.prisma.category.findMany({
                where: {
                    id: { in: validStateIds },
                    type: MasterDataCategoryType.LOCATION_STATE,
                    parentId: query.countryIds?.length
                        ? { in: query.countryIds }
                        : query.countryId
                        ? query.countryId
                        : undefined,
                },
                select: { id: true },
            });
            validStateIds = validStates.map((s) => s.id);
        }

        if (validStateIds.length) {
            profileFilters.push({
                stateId: { in: validStateIds },
            });
        }

        let validCityIds: string[] = Array.isArray(query.cityIds) ? query.cityIds : [];

        if (validCityIds.length) {
            const validCities = await this.prisma.category.findMany({
                where: {
                    id: { in: validCityIds },
                    type: MasterDataCategoryType.LOCATION_CITY,
                    ...(validStateIds.length
                        ? { parentId: { in: validStateIds } }
                        : {}),
                },
                select: { id: true },
            });
            validCityIds = validCities.map((c) => c.id);
        }

        if (validCityIds.length) {
            profileFilters.push({
                currentCityId: { in: validCityIds },
            });
        }

        if (query.yearOfPassing?.length) {
            const years = query.yearOfPassing
                .map((y) => Number(y))
                .filter((y) => !Number.isNaN(y));

            if (years.length) {
                profileFilters.push({
                    education: {
                        some: {
                            yearOfPassing: {
                                in: years,
                            },
                        },
                    },
                });
            }
        }

        // Apply safe grouped logic for search and filters
        const searchCondition: Prisma.ProfileWhereInput | null = query.search
            ? {
                OR: [
                    {
                        fullName: {
                            contains: query.search,
                            mode: Prisma.QueryMode.insensitive,
                        },
                    },
                    {
                        email: {
                            contains: query.search,
                            mode: Prisma.QueryMode.insensitive,
                        },
                    },
                ],
            }
            : null;

        if (query.search && profileFilters.length > 0 && searchCondition) {
            where.user = {
                AND: [searchCondition, ...profileFilters],
            };
        } else if (query.search && searchCondition) {
            where.user = searchCondition;
        } else if (profileFilters.length > 0) {
            where.user = {
                AND: profileFilters,
            };
        }

        const [registrations, total] = await Promise.all([
            this.prisma.eventRegistration.findMany({
                where,
                skip,
                take,
                orderBy: { registeredAt: 'desc' },
                include: {
                    user: {
                        select: {
                            id: true,
                            fullName: true,
                            email: true,
                            mobileNumber: true,
                            phoneNumber: true,
                            currentCityId: true,
                            stateId: true,
                            countryId: true,
                            experienceLevelId: true,
                            highestQualificationId: true,
                            totalExperienceMonths: true,
                            preferredEmploymentTypeId: true,
                            preferredWorkMode: true,
                            shiftPreference: true,
                            availableJoiningDate: true,
                            preferredLocations: {
                                select: {
                                    locationId: true,
                                },
                            },
                            education: {
                                select: {
                                    id: true,
                                    highestQualificationId: true,
                                    yearOfPassing: true,
                                    degreeName: true,
                                    specialization: true,
                                    universityName: true,
                                },
                            },
                            experience: {
                                select: {
                                    jobTitle: true,
                                    companyName: true,
                                    yearsOfExperience: true,
                                    monthsOfExperience: true,
                                    employmentStatus: true,
                                    currentSalary: true,
                                    expectedSalary: true,
                                },
                            },
                            skills: {
                                select: {
                                    masterDataId: true,
                                },
                            },
                        },
                    },
                },
            }),
            this.prisma.eventRegistration.count({ where }),
        ]);

        return { registrations, total, page, limit };
    }

    async findAllByUser(
        userId: string,
        query: ListRegistrationsDto,
        ): Promise<{ registrations: any[]; total: number; page: number; limit: number }> {
        const page = query.page ?? 1;
        const rawLimit = query.limit ?? 100;
        const limit = Math.min(Math.max(rawLimit, 1), 200);
        const skip = (page - 1) * limit;
        const take = limit;

        const where: Prisma.EventRegistrationWhereInput = { userId };

        const [registrations, total] = await Promise.all([
            this.prisma.eventRegistration.findMany({
            where,
            skip,
            take,
            orderBy: { registeredAt: 'desc' },
            include: {
                event: {
                select: {
                    id: true,
                    title: true,
                    description: true,
                    startDate: true,
                    endDate: true,
                    status: true,
                    meetingUrl: true,
                    isMeetingUrlPublished: true,
                    bannerImage: true,
                },
            },
            },
            }),
            this.prisma.eventRegistration.count({ where }),
        ]);

        return { registrations, total, page, limit };
        }

    async update(id: string, data: Prisma.EventRegistrationUpdateInput): Promise<EventRegistration> {
        return this.prisma.eventRegistration.update({ where: { id }, data });
    }

    async findByEventAndTargetUser(
        eventId: string,
        userId: string,
    ): Promise<EventRegistration | null> {
        return this.prisma.eventRegistration.findFirst({
            where: { eventId, userId },
        });
    }

    async countActiveByEvent(eventId: string): Promise<number> {
        return this.prisma.eventRegistration.count({
            where: {
                eventId,
                status: { in: [RegistrationStatus.REGISTERED, RegistrationStatus.ATTENDED] },
            },
        });
    }

    async findRegisteredUserIds(eventId: string): Promise<string[]> {
        const registrations = await this.prisma.eventRegistration.findMany({
            where: {
                eventId,
                status: RegistrationStatus.REGISTERED,
            },
            select: {
                userId: true,
            },
        });

        return registrations.map((registration) => registration.userId);
    }
}
