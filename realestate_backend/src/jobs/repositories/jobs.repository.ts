import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Job, Prisma, JobStatus, JobType } from '@prisma/client';
import { CreateJobDto } from '../dto/create-job.dto';
import { UpdateJobDto } from '../dto/update-job.dto';
import { JobSearchQueryDto } from '../dto/job-search-query.dto';
import { resolveSourceName } from '../utils/resolve-source-name.util';
import { resolveDescriptionPreview } from '../utils/resolve-description-preview.util';
import { resolveCompanyLogo } from '../utils/resolve-company-logo.util';

@Injectable()
export class JobsRepository {
    constructor(private readonly prisma: PrismaService) { }

    async findFeedCandidates(params: {
        limit: number;
        now: Date;
        locationIds: string[];
        userExperienceMonths: number;
    }) {
        const { limit, now, locationIds, userExperienceMonths } = params;

        const jobs = await this.prisma.job.findMany({
            where: {
                status: JobStatus.ACTIVE,
                OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
                ...(locationIds.length > 0 ? { locationId: { in: locationIds } } : {}),
                AND: [
                    {
                        OR: [
                            { minExperienceMonths: null },
                            { minExperienceMonths: { lte: userExperienceMonths + 24 } },
                        ],
                    },
                    {
                        OR: [
                            { maxExperienceMonths: null },
                            { maxExperienceMonths: { gte: Math.max(0, userExperienceMonths - 24) } },
                        ],
                    },
                ],
            },
            include: {
                skills: true,
                organization: {
                    select: { name: true, logoUrl: true },
                },
                location: {
                    select: { value: true },
                },
                category: {
                    select: { value: true },
                },
                employmentType: {
                    select: { value: true },
                },
                experienceLevel: {
                    select: { value: true },
                },
                educationLevel: {
                    select: { value: true },
                },
                specializations: {
                    include: {
                        specialization: {
                            select: { id: true, value: true },
                        },
                    },
                },
            },
            orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
            take: limit,
        });

        return jobs.map(({ organization, location, category, employmentType, experienceLevel, educationLevel, specializations, ...job }) => {
            const specializationItems = (specializations ?? [])
                .map((item) => item.specialization)
                .filter(Boolean) as Array<{ id: string; value: string }>;

            return {
                ...job,
                descriptionPreview: resolveDescriptionPreview(job),
                organizationName: organization?.name ?? null,
                sourceName: job.sourceName ?? resolveSourceName(job.externalUrl, organization?.name),
                companyLogo: resolveCompanyLogo(job.companyLogo, organization?.logoUrl),
                locationName: location?.value ?? null,
                categoryName: category?.value ?? null,
                employmentTypeName: employmentType?.value ?? null,
                experienceLevelName: experienceLevel?.value ?? null,
                educationLevelName: educationLevel?.value ?? null,
                specializationIds: specializationItems.map((item) => item.id),
                specializations: specializationItems,
            };
        });
    }

    async create(data: Prisma.JobCreateInput): Promise<Job> {
        return this.prisma.job.create({ data });
    }

    async findAll(query: JobSearchQueryDto): Promise<{ jobs: any[]; total: number }> {
        const {
            q,
            locationId,
            categoryId,
            experienceLevelId,
            workMode,
            experienceMonths,
            employmentTypeId,
            status,
            jobType,
            asOf,
            startDate,
            endDate,
            organizationId,
            page,
            limit,
        } = query;
        const pageNumber = page ?? 1;
        const limitNumber = limit ?? 10;
        const asOfDate = asOf ? new Date(asOf) : new Date();
        const searchTerm = q?.trim();
        const parsedSalary = searchTerm ? Number(searchTerm) : NaN;
        const searchConditions: Prisma.JobWhereInput[] = searchTerm
            ? [
                { title: { contains: searchTerm, mode: 'insensitive' } },
                { description: { contains: searchTerm, mode: 'insensitive' } },
                { summary: { contains: searchTerm, mode: 'insensitive' } },
                { organization: { name: { contains: searchTerm, mode: 'insensitive' } } },
                ...(Number.isFinite(parsedSalary) && Number.isInteger(parsedSalary)
                    ? [
                        { salaryMin: { equals: parsedSalary } },
                        { salaryMax: { equals: parsedSalary } },
                    ]
                    : []),
            ]
            : [];

        const skip = (pageNumber - 1) * limitNumber;

        const where: Prisma.JobWhereInput = {
            AND: [
                searchTerm ? { OR: searchConditions } : {},
                locationId ? { locationId } : {},
                categoryId ? { categoryId } : {},
                experienceLevelId ? { experienceLevelId } : {},
                workMode ? { workMode } : {},
                experienceMonths != null
                    ? {
                        AND: [
                            {
                                OR: [
                                    { minExperienceMonths: null },
                                    { minExperienceMonths: { lte: experienceMonths } },
                                ],
                            },
                            {
                                OR: [
                                    { maxExperienceMonths: null },
                                    { maxExperienceMonths: { gte: experienceMonths } },
                                ],
                            },
                        ],
                    }
                    : {},
                employmentTypeId ? { employmentTypeId } : {},
                status ? { status } : {},
                jobType ? { jobType } : {},
                status === JobStatus.ACTIVE
                    ? {
                        OR: [
                            { expiresAt: null },
                            { expiresAt: { gt: asOfDate } },
                        ],
                    }
                    : {},
                organizationId ? { organizationId } : {},
                startDate || endDate
                    ? {
                        createdAt: {
                            ...(startDate ? { gte: new Date(startDate) } : {}),
                            ...(endDate
                                ? {
                                    lte: new Date(
                                        new Date(endDate).setHours(23, 59, 59, 999),
                                    ),
                                }
                                : {}),
                        },
                    }
                    : {},
            ],
        };

        const [jobs, total] = await Promise.all([
            this.prisma.job.findMany({
                where,
                skip,
                take: limitNumber,
                orderBy: { createdAt: 'desc' },
                include: {
                    location: true,
                    category: true,
                    employmentType: true,
                    experienceLevel: true,
                    specializations: {
                        include: {
                            specialization: true,
                        },
                    },
                    organization: {
                        select: { name: true, logoUrl: true },
                    },
                    skills: {
                        include: {
                            skill: true,
                        },
                    },
                    _count: {
                        select: { applications: true },
                    },
                },
            }),
            this.prisma.job.count({ where }),
        ]);

        const formattedJobs = jobs.map(({ organization, location, category, employmentType, experienceLevel, specializations, ...job }) => {
            const specializationItems = (specializations ?? [])
                .map((item) => item.specialization)
                .filter(Boolean) as Array<{ id: string; value: string }>;

            return {
                ...job,
                descriptionPreview: resolveDescriptionPreview(job),
                organizationName: organization?.name ?? null,
                sourceName: job.sourceName ?? resolveSourceName(job.externalUrl, organization?.name),
                companyLogo: resolveCompanyLogo(job.companyLogo, organization?.logoUrl),
                locationName: location?.value ?? null,
                categoryName: category?.value ?? null,
                employmentTypeName: employmentType?.value ?? null,
                experienceLevelName: experienceLevel?.value ?? null,
                skills: job.skills.map(s => s.skill?.value).filter(Boolean),
                specializationIds: specializationItems.map((item) => item.id),
                specializations: specializationItems,
            };
        });

        return { jobs: formattedJobs, total };
    }
    /**
     * Internal method: Returns raw job data with relation objects preserved.
     * Used internally for update/publish/sync operations.
     * Accepts an optional Prisma transaction client so callers can compose
     * this read into a larger atomic transaction (e.g. bulk actions).
     */
    async findOneRaw(id: string, client: Prisma.TransactionClient | PrismaService = this.prisma): Promise<any | null> {
        return client.job.findUnique({
            where: { id },
            include: {
                skills: {
                    include: {
                        skill: true,
                    },
                },
                organization: true,
                location: true,
                category: true,
                employmentType: true,
                experienceLevel: true,
                educationLevel: true,
                educationLevels: {
                    include: {
                        education: true,
                    },
                },
                specializations: {
                    include: {
                        specialization: true,
                    },
                },
            },
        });
    }

    /**
     * API method: Returns job data with transformed fields for serialization.
     * Transforms relations to display-friendly values.
     */
    async findOne(id: string): Promise<any | null> {
        const job = await this.findOneRaw(id);

        if (!job) {
            return null;
        }

        const {
            location,
            category,
            employmentType,
            experienceLevel,
            educationLevel,
            educationLevels,
            specializations,
            skills,
            ...jobData
        } = job;

        const specializationItems = (specializations ?? [])
            .map((item) => item.specialization)
            .filter(Boolean) as Array<{ id: string; value: string }>;

        return {
            ...jobData,
            descriptionPreview: resolveDescriptionPreview(jobData),
            sourceName: jobData.sourceName ?? resolveSourceName(jobData.externalUrl, jobData.organizationName ?? jobData.organization?.name),
            companyLogo: resolveCompanyLogo(jobData.companyLogo, jobData.organization?.logoUrl),
            locationName: location?.value ?? null,
            categoryName: category?.value ?? null,
            employmentTypeName: employmentType?.value ?? null,
            employmentType: employmentType?.value ?? null,
            experienceLevelName: experienceLevel?.value ?? null,
            educationLevelName: educationLevel?.value ?? null,
            skills: skills
                .map((skill) => skill.skill?.value)
                .filter(Boolean),
            educationQualifications: educationLevels
                ?.map((education) => education.education?.value)
                .filter(Boolean) ?? [],
            specializationIds: specializationItems.map((item) => item.id),
            specializations: specializationItems,
        };
    }

    async update(id: string, data: Prisma.JobUpdateInput, client: Prisma.TransactionClient | PrismaService = this.prisma): Promise<Job> {
        return client.job.update({
            where: { id },
            data,
            include: { skills: true },
        });
    }

    async updateKeywords(id: string, keywords: string | null): Promise<void> {
        if (!keywords) {
            await this.prisma.$executeRaw`
                UPDATE "jobs"."jobs"
                SET "keywords" = NULL
                WHERE "id" = ${id}
            `;
            return;
        }

        await this.prisma.$executeRaw`
            UPDATE "jobs"."jobs"
            SET "keywords" = to_tsvector('simple', ${keywords})
            WHERE "id" = ${id}
        `;
    }

    async updateEmbedding(id: string, embedding: number[] | null): Promise<void> {
        if (!embedding) {
            await this.prisma.$executeRaw`
                UPDATE "jobs"."jobs"
                SET "embedding" = NULL
                WHERE "id" = ${id}
            `;
            return;
        }

        const vectorString = `[${embedding.join(',')}]`;
        await this.prisma.$executeRaw`
            UPDATE "jobs"."jobs"
            SET "embedding" = ${vectorString}::vector
            WHERE "id" = ${id}
        `;
    }

    async delete(id: string, client: Prisma.TransactionClient | PrismaService = this.prisma): Promise<Job> {
        return client.job.delete({
            where: { id },
        });
    }

    /**
     * Applications reference jobs via a RESTRICT foreign key (no ON DELETE CASCADE),
     * so a job with applications must never reach `delete`. Callers use this to
     * validate up front instead of catching the resulting P2003 constraint error.
     */
    async countApplications(jobId: string, client: Prisma.TransactionClient | PrismaService = this.prisma): Promise<number> {
        return client.application.count({
            where: { jobId },
        });
    }

    async count(where: Prisma.JobWhereInput): Promise<number> {
        return this.prisma.job.count({ where });
    }

    async saveJobForUser(jobId: string, userId: string) {
        return this.prisma.savedJob.upsert({
            where: { jobId_userId: { jobId, userId: userId } },
            update: {},
            create: {
                job: { connect: { id: jobId } },
                user: { connect: { userId: userId } },
            },
        });
    }

    async removeSavedJobForUser(jobId: string, userId: string) {
        return this.prisma.savedJob.deleteMany({
            where: { jobId, userId: userId },
        });
    }

    async findSavedJobsByUser(userId: string) {
        return this.prisma.savedJob.findMany({
            where: { userId: userId },
            include: {
                job: {
                    include: {
                        organization: { select: { name: true, logoUrl: true } },
                        location: { select: { value: true } },
                        category: { select: { value: true } },
                        employmentType: { select: { value: true } },
                        experienceLevel: { select: { value: true } },
                        educationLevel: { select: { value: true } },
                        skills: { include: { skill: true } },
                        specializations: {
                            include: {
                                specialization: true,
                            },
                        },
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
    }
}
