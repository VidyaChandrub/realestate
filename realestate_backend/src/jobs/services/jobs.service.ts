import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { JobsRepository } from '../repositories/jobs.repository';
import { JobExternalClicksRepository } from '../repositories/job-external-clicks.repository';
import { UpdateJobDto } from '../dto/update-job.dto';
import { JobSearchQueryDto } from '../dto/job-search-query.dto';
import { ListJobExternalClicksDto } from '../dto/list-job-external-clicks.dto';
import { JobNotFoundException } from '../exceptions/job-not-found.exception';
import { UnauthorizedJobException } from '../exceptions/unauthorized-job.exception';
import { InvalidJobStateException } from '../exceptions/invalid-job-state.exception';
import { JobHasApplicationsException } from '../exceptions/job-has-applications.exception';
import { AnalyticsEventType } from '../../analytics/analytics.constants';
import { JobStatus, JobType, JobWorkMode, OrganizationRole, Job, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { UserService } from '../../user/user.service';
import { resolveSourceName } from '../utils/resolve-source-name.util';
import { resolveDescriptionPreview } from '../utils/resolve-description-preview.util';
import { resolveCompanyLogo } from '../utils/resolve-company-logo.util';

type RelevantJobMatchRow = {
    id: string;
    similarityScore: number;
};

type RelevantJobResult = {
    id: string;
    organizationId: string;
    title: string;
    description: string | null;
    descriptionPreview: string | null;
    summary: string | null;
    categoryId: string | null;
    locationId: string | null;
    minExperienceMonths: number | null;
    maxExperienceMonths: number | null;
    experienceLevelId: string | null;
    workMode: JobWorkMode | null;
    salaryMin: number | null;
    salaryMax: number | null;
    employmentTypeId: string | null;
    jobType: JobType;
    externalUrl: string | null;
    status: JobStatus;
    publishedAt: Date | null;
    expiresAt: Date | null;
    rejectionReason: string | null;
    createdAt: Date;
    updatedAt: Date;
    backgroundImage: string | null;
    companyLogo: string | null;
    organizationName: string | null;
    sourceName: string | null;
    locationName: string | null;
    categoryName: string | null;
    employmentTypeName: string | null;
    employmentType: string | null;
    experienceLevelName: string | null;
    educationLevel: string | null;
    educationLevelIds: string[];
    educationLevelParentIds: string[];
    educationLevelValues: string[];
    skillIds: string[];
    skills: string[];
    skillValues: string[];
    similarityScore: number;
};

@Injectable()
export class JobsService {
    private readonly logger = new Logger(JobsService.name);

    constructor(
        private readonly jobsRepository: JobsRepository,
        private readonly jobExternalClicksRepository: JobExternalClicksRepository,
        private readonly prisma: PrismaService,
        private readonly userService: UserService,
        private readonly eventEmitter: EventEmitter2,
    ) { }

    async findAll(query: JobSearchQueryDto) {
        const result = await this.jobsRepository.findAll(query);
        const jobs = result.jobs as Array<
            { id: string; jobType: JobType; _count?: { applications: number } } & Record<string, unknown>
        >;

        const externalJobIds = jobs
            .filter((job) => job.jobType === JobType.EXTERNAL)
            .map((job) => job.id);

        if (externalJobIds.length === 0) {
            return result;
        }

        const clickCounts = await this.jobExternalClicksRepository.countsByJobs(externalJobIds);

        const updatedJobs = jobs.map((job) => {
            if (job.jobType !== JobType.EXTERNAL || !job._count) {
                return job;
            }

            return {
                ...job,
                _count: {
                    ...job._count,
                    applications: clickCounts.get(job.id) ?? 0,
                },
            };
        });

        return { ...result, jobs: updatedJobs };
    }

    async getFeedCandidates(params: {
        limit: number;
        now: Date;
        locationIds: string[];
        userExperienceMonths: number;
    }) {
        return this.jobsRepository.findFeedCandidates(params);
    }

    async getRelevantJobs(
        keycloakUser: any,
        params: {
            limit?: number;
            offset?: number;
            hideSeenFeeds?: boolean;
        } = {},
    ): Promise<{ jobs: RelevantJobResult[]; total: number }> {
        await this.userService.findOrCreateProfile(keycloakUser);

        const userId = keycloakUser.userId;
        const normalizedLimit = Math.min(Math.max(params.limit ?? 20, 1), 500);
        const normalizedOffset = Math.max(params.offset ?? 0, 0);
        const now = new Date();

        // Excludes jobs the user has actually viewed (confirmed via
        // POST /api/v1/feed/impressions), not merely served in a prior response —
        // an item that was served but never looked at stays eligible to reappear.
        const seenClause = params.hideSeenFeeds
            ? Prisma.sql`AND NOT EXISTS (
                SELECT 1 FROM analytics.user_seen_feed usf
                WHERE usf.user_id = ${userId}
                  AND usf.entity_id = j.id::uuid
                  AND usf.entity_type = 'JOB'
                  AND usf.viewed_at IS NOT NULL
              )`
            : Prisma.empty;

        const profileRows = await this.prisma.$queryRaw<
            Array<{
                currentCityId: string | null;
                stateId: string | null;
                countryId: string | null;
                totalExperienceMonths: number | null;
                preferredLocationIds: string[] | null;
            }>
        >`
          SELECT
            p.current_city_id AS "currentCityId",
            p.state_id AS "stateId",
            p.country_id AS "countryId",
            p.total_experience_months AS "totalExperienceMonths",
            (
              SELECT array_agg(upl.location_id)
              FROM "users"."user_preferred_locations" upl
              WHERE upl.profile_id = p.id
            ) AS "preferredLocationIds"
          FROM "users"."profiles" p
          WHERE p.user_id = ${userId}
          LIMIT 1
        `;
        const profileRow = profileRows[0];

        // Location: pass if the job is remote, has no location set, or its location is
        // the user's city/state/country/preferred locations. If the user hasn't set ANY
        // location info at all, don't filter on location (incomplete profile = neutral,
        // not disqualifying) — same philosophy as the rest of this pipeline.
        const locationIds = [
            profileRow?.currentCityId,
            profileRow?.stateId,
            profileRow?.countryId,
            ...(profileRow?.preferredLocationIds ?? []),
        ].filter((id): id is string => Boolean(id));

        const locationClause = locationIds.length > 0
            ? Prisma.sql`AND (
                j.work_mode = 'REMOTE'::"jobs"."JobWorkMode"
                OR j.location_id IS NULL
                OR j.location_id = ANY(${locationIds}::uuid[])
              )`
            : Prisma.empty;

        // Experience: pass if the job's [min, max] range overlaps the user's experience
        // +/- a 12-month tolerance band (same tolerance as the old graduated scoring).
        // A missing min/max on the job means "no requirement" on that side, same as
        // before. If the user's own experience isn't set, don't filter at all.
        const experienceToleranceMonths = 12;
        const experienceClause = profileRow?.totalExperienceMonths != null
            ? Prisma.sql`AND (
                j.min_experience_months IS NULL
                OR j.min_experience_months <= ${profileRow.totalExperienceMonths + experienceToleranceMonths}
              )
              AND (
                j.max_experience_months IS NULL
                OR j.max_experience_months >= ${profileRow.totalExperienceMonths - experienceToleranceMonths}
              )`
            : Prisma.empty;

        const matches = await this.prisma.$queryRaw<RelevantJobMatchRow[]>`
                SELECT j.id, 0::double precision AS "similarityScore"
                FROM "jobs"."jobs" j
                WHERE j.status = ${JobStatus.ACTIVE}::"jobs"."JobStatus"
                  AND (j.expires_at IS NULL OR j.expires_at > ${now})
                  ${locationClause}
                  ${experienceClause}
                  ${seenClause}
                ORDER BY j.published_at DESC NULLS LAST, j.created_at DESC
                LIMIT ${normalizedLimit}
                OFFSET ${normalizedOffset}
              `;

        const total = matches.length;
        if (matches.length === 0) {
            return { jobs: [], total };
        }

        const jobIds = matches.map((match) => match.id);
        const educationLevelsRows = await this.prisma.$queryRaw<
            Array<{ jobId: string; educationLevels: string | null; educationLevelIds: string[] | null; educationLevelParentIds: string[] | null; educationLevelValues: string[] | null }>
        >`
          SELECT je.job_id AS "jobId",
                 string_agg(c.value, ' / ') AS "educationLevels",
                 array_agg(c.id::text) AS "educationLevelIds",
                 array_agg(c.parent_id::text) FILTER (WHERE c.parent_id IS NOT NULL) AS "educationLevelParentIds",
                 array_agg(c.value) AS "educationLevelValues"
          FROM "jobs"."job_educations" je
          JOIN "master_data"."categories" c
            ON c.id = je.education_id
            AND c.type = 'EDUCATION_LEVEL'
          WHERE je.job_id IN (${Prisma.join(jobIds.map((id) => Prisma.sql`${id}`))})
          GROUP BY je.job_id
        `;
        const educationLevelsByJobId = new Map(
            educationLevelsRows.map((row) => [row.jobId, row.educationLevels]),
        );
        const educationLevelIdsByJobId = new Map(
            educationLevelsRows.map((row) => [row.jobId, row.educationLevelIds ?? []]),
        );
        const educationLevelParentIdsByJobId = new Map(
            educationLevelsRows.map((row) => [row.jobId, row.educationLevelParentIds ?? []]),
        );
        const educationLevelValuesByJobId = new Map(
            educationLevelsRows.map((row) => [row.jobId, row.educationLevelValues ?? []]),
        );

        const jobs = await this.prisma.job.findMany({
            where: {
                id: { in: matches.map((match) => match.id) },
            },
            include: {
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
                skills: true,
            },
        });

        // logoUrl isn't denormalized onto Job (unlike organizationName), so it's
        // fetched for every job here rather than just the name-fallback subset.
        const organizationIds = Array.from(
            new Set(jobs.map((job) => job.organizationId)),
        );

        const organizationsById = organizationIds.length > 0
            ? new Map(
                (await this.prisma.organization.findMany({
                    where: {
                        id: { in: organizationIds },
                    },
                    select: {
                        id: true,
                        name: true,
                        logoUrl: true,
                    },
                })).map((organization) => [organization.id, organization]),
            )
            : new Map<string, { id: string; name: string; logoUrl: string | null }>();

        const uniqueSkillIds = Array.from(
            new Set(
                jobs.flatMap((job) =>
                    job.skills
                        .map((skill) => skill.masterDataId)
                        .filter((value): value is string => Boolean(value)),
                ),
            ),
        );

        const skillValues = uniqueSkillIds.length > 0
            ? await this.prisma.category.findMany({
                where: {
                    id: { in: uniqueSkillIds },
                },
                select: {
                    id: true,
                    value: true,
                },
            })
            : [];
        const skillValueById = new Map(skillValues.map((skill) => [skill.id, skill.value]));

        const jobById = new Map<string, RelevantJobResult>(
            jobs.map((job) => {
                const {
                    location,
                    category,
                    employmentType,
                    experienceLevel,
                    educationLevel,
                    skills,
                    educationLevelId,
                    ...jobData
                } = job;

                const resolvedOrganizationName = job.organizationName ?? organizationsById.get(job.organizationId)?.name ?? null;

                return [
                    job.id,
                    {
                        ...jobData,
                        descriptionPreview: resolveDescriptionPreview(jobData),
                        organizationName: resolvedOrganizationName,
                        sourceName: job.sourceName ?? resolveSourceName(job.externalUrl, resolvedOrganizationName),
                        companyLogo: resolveCompanyLogo(job.companyLogo, organizationsById.get(job.organizationId)?.logoUrl),
                        locationName: location?.value ?? null,
                        categoryName: category?.value ?? null,
                        employmentTypeName: employmentType?.value ?? null,
                        employmentType: employmentType?.value ?? null,
                        experienceLevelName: experienceLevel?.value ?? null,
                        educationLevel: educationLevelsByJobId.get(job.id) ?? educationLevel?.value ?? null,
                        educationLevelIds: educationLevelIdsByJobId.get(job.id) ?? [],
                        educationLevelParentIds: educationLevelParentIdsByJobId.get(job.id) ?? [],
                        educationLevelValues: educationLevelValuesByJobId.get(job.id) ?? [],
                        skillIds: skills
                            .map((skill) => skill.masterDataId)
                            .filter((id): id is string => Boolean(id)),
                        skills: skills
                            .map((skill) => skill.masterDataId ? skillValueById.get(skill.masterDataId) : null)
                            .filter((value): value is string => Boolean(value)),
                        skillValues: skills
                            .map((skill) => skill.masterDataId ? skillValueById.get(skill.masterDataId) : null)
                            .filter((value): value is string => Boolean(value)),
                        similarityScore: 0,
                    },
                ];
            }),
        );

        const rankedJobs = matches
            .map((match) => {
                const job = jobById.get(match.id);
                if (!job) {
                    return null;
                }

                return {
                    ...job,
                    similarityScore: Number(match.similarityScore),
                };
            })
            .filter((job): job is RelevantJobResult => job !== null);

        return {
            jobs: rankedJobs,
            total,
        };
    }

    async findOne(id: string): Promise<Job> {
        const job = await this.jobsRepository.findOne(id);
        if (!job) {
            throw new JobNotFoundException(id);
        }
        return job;
    }

    async saveJob(id: string, userId: string) {
        await this.findOne(id);
        return this.jobsRepository.saveJobForUser(id, userId);
    }

    async unsaveJob(id: string, userId: string) {
        await this.findOne(id);
        return this.jobsRepository.removeSavedJobForUser(id, userId);
    }

    async getSavedJobs(userId: string) {
        const saved = await this.jobsRepository.findSavedJobsByUser(userId);

        const jobs = saved.map(({ job }) => job);

        const organizationIdsForFallback = Array.from(
            new Set(
                jobs
                    .filter((job) => !job.organizationName)
                    .map((job) => job.organizationId),
            ),
        );

        const organizationsById = organizationIdsForFallback.length > 0
            ? new Map(
                (await this.prisma.organization.findMany({
                    where: {
                        id: { in: organizationIdsForFallback },
                    },
                    select: {
                        id: true,
                        name: true,
                    },
                })).map((org) => [org.id, org.name]),
            )
            : new Map<string, string>();

        return jobs.map((job) => {
            const resolvedOrganizationName =
                job.organizationName ??
                organizationsById.get(job.organizationId) ??
                null;

            return {
                ...job,
                descriptionPreview: resolveDescriptionPreview(job),
                organizationName: resolvedOrganizationName,
                sourceName: job.sourceName ?? resolveSourceName(job.externalUrl, resolvedOrganizationName),
                companyLogo: resolveCompanyLogo(job.companyLogo, job.organization?.logoUrl),
                locationName: job.location?.value ?? null,
                categoryName: job.category?.value ?? null,
                employmentTypeName: job.employmentType?.value ?? null,
                experienceLevelName: job.experienceLevel?.value ?? null,
                educationLevelName: job.educationLevel?.value ?? null,
                skills: job.skills
                    .map((s) => s.skill?.value)
                    .filter(Boolean),
                specializationIds: (job.specializations ?? [])
                    .map((specialization) => specialization.specialization?.id)
                    .filter((id): id is string => Boolean(id)),
                specializations: (job.specializations ?? [])
                    .map((specialization) => specialization.specialization)
                    .filter(Boolean) as Array<{ id: string; value: string }>,
            };
        });
    }

    async update(id: string, updateJobDto: UpdateJobDto, userId: string): Promise<Job> {
        this.logger.log(`[UPDATE-START] Updating job ${id} for user ${userId}`);

        // Use raw fetch to preserve relations for validation
        const jobRaw = await this.jobsRepository.findOneRaw(id);
        if (!jobRaw) {
            this.logger.warn(`[UPDATE-NOT-FOUND] Job not found: ${id}`);
            throw new JobNotFoundException(id);
        }

        this.logger.log(`[UPDATE-JOB-FETCHED] Job title: ${jobRaw.title}, organizationId: ${jobRaw.organizationId}`);

        const isAdmin = await this.isAdminUser(userId);

        if (!isAdmin) {
            await this.validateOrganizationMembership(userId, jobRaw.organizationId, [OrganizationRole.OWNER, OrganizationRole.HR, OrganizationRole.RECRUITER]);
        }

        const {
            skills,
            educationQualifications,
            specializationIds,
            categoryId,
            locationId,
            experienceLevelId,
            educationLevelId,
            employmentTypeId,
            ...jobData
        } = updateJobDto;

        this.logger.log(`[UPDATE-PREP] Preparing update data - has skills: ${!!skills}, has educationQualifications: ${!!educationQualifications}, has specializationIds: ${specializationIds !== undefined}`);

        const updateData: Prisma.JobUpdateInput = {
            ...jobData,
            ...(categoryId ? { category: { connect: { id: categoryId } } } : {}),
            ...(locationId ? { location: { connect: { id: locationId } } } : {}),
            ...(experienceLevelId ? { experienceLevel: { connect: { id: experienceLevelId } } } : {}),
            ...(educationLevelId ? { educationLevel: { connect: { id: educationLevelId } } } : {}),
            ...(employmentTypeId ? { employmentType: { connect: { id: employmentTypeId } } } : {}),
            skills: skills ? {
                deleteMany: {},
                create: skills.map((skill) => ({
                    masterDataId: skill.masterDataId,
                }))
            } : undefined
        };

        this.logger.log(`[UPDATE-EXECUTE] Executing update for job ${id}`);

        try {
            await this.jobsRepository.update(id, updateData);

            this.logger.log(`[UPDATE-SUCCESS] Job updated: ${id}`);

            // Handle educationQualifications update
            if (educationQualifications !== undefined) {
                this.logger.log(`[UPDATE-EDU-QUALIFICATIONS] Updating education qualifications - count: ${educationQualifications.length}`);
                
                // Delete existing education qualifications
                await this.prisma.jobEducation.deleteMany({
                    where: { jobId: id },
                });

                // Create new education qualifications if provided
                if (educationQualifications.length > 0) {
                    await this.prisma.jobEducation.createMany({
                        data: educationQualifications.map(eq => ({
                            jobId: id,
                            educationId: eq.masterDataId,
                        })),
                    });
                }
            }

            if (specializationIds !== undefined) {
                this.logger.log(`[UPDATE-SPECIALIZATIONS] Updating specializations - count: ${specializationIds.length}`);

                await this.prisma.jobSpecialization.deleteMany({
                    where: { jobId: id },
                });

                if (specializationIds.length > 0) {
                    await this.prisma.jobSpecialization.createMany({
                        data: specializationIds.map((specializationId) => ({
                            jobId: id,
                            specializationId,
                        })),
                    });
                }
            }

            this.logger.log(`[UPDATE-SYNC-START] Syncing job search data for ${id}`);
            await this.syncJobSearchData(id);
            this.logger.log(`[UPDATE-SYNC-SUCCESS] Job search data synced for ${id}`);

            // Return formatted response for API consistency
            return this.findOne(id);
        } catch (error) {
            this.logger.error(
                `[UPDATE-ERROR] Failed to update job ${id}`,
                error instanceof Error ? error.stack : String(error),
            );
            throw error;
        }
    }

    async remove(id: string, userId: string): Promise<void> {
        const job = await this.findOne(id);

        const isAdmin = await this.isAdminUser(userId);

        await this.applyRemove(job.id, job.organizationId, job.title, isAdmin, userId);
    }

    async bulkRemove(jobIds: string[], userId: string): Promise<{ success: true; processed: number }> {
        const isAdmin = await this.isAdminUser(userId);

        const processed = await this.prisma.$transaction(async (tx) => {
            let count = 0;
            for (const id of jobIds) {
                const job = await this.jobsRepository.findOneRaw(id, tx);
                if (!job) {
                    throw new JobNotFoundException(id);
                }

                // Jobs are processed in the given order, so the first job in the
                // batch that has applications is the one reported to the caller.
                await this.applyRemove(id, job.organizationId, job.title, isAdmin, userId, tx);
                count++;
            }
            return count;
        });

        return { success: true, processed };
    }

    /**
     * Shared delete validation + deletion, reused by both the single-job and
     * bulk remove flows (so bulk delete rolls back the whole transaction if
     * any job in the batch fails this check).
     */
    private async applyRemove(
        id: string,
        organizationId: string,
        title: string,
        isAdmin: boolean,
        userId: string,
        client: Prisma.TransactionClient | PrismaService = this.prisma,
    ): Promise<void> {
        if (!isAdmin) {
            await this.validateOrganizationMembership(userId, organizationId, [OrganizationRole.OWNER, OrganizationRole.HR], client);
        }

        // Applications reference jobs via a RESTRICT foreign key (no CASCADE), so
        // deleting a job with applications would fail with a raw Prisma P2003
        // error. Check up front and surface a proper business error instead of
        // letting the delete hit the DB and blow up as a generic 500.
        const applicationsCount = await this.jobsRepository.countApplications(id, client);
        if (applicationsCount > 0) {
            throw new JobHasApplicationsException({ id, title });
        }

        await this.jobsRepository.delete(id, client);
    }

    async publish(id: string, userId: string): Promise<Job> {
        this.logger.log(`[PUBLISH-START] Publishing job ${id} for user ${userId}`);

        try {
            // Fetch raw job data (preserves relations)
            const jobRaw = await this.jobsRepository.findOneRaw(id);
            if (!jobRaw) {
                this.logger.warn(`[PUBLISH-NOT-FOUND] Job not found: ${id}`);
                throw new JobNotFoundException(id);
            }

            this.logger.log(`[PUBLISH-JOB-FETCHED] Job title: ${jobRaw.title}, status: ${jobRaw.status}, organizationId: ${jobRaw.organizationId}`);

            const isAdmin = await this.isAdminUser(userId);

            const changed = await this.applyPublish(jobRaw, isAdmin, userId);

            if (changed) {
                this.logger.log(`[PUBLISH-UPDATE-SUCCESS] Job updated: ${id}`);
                this.logger.log(`[PUBLISH-SYNC-QUEUED] Job search data sync queued in background for ${id}`);
                this.syncJobSearchDataInBackground(id);
                this.logger.log(`[PUBLISH-SUCCESS] Job published successfully: ${id}`);
            } else {
                this.logger.log(`[PUBLISH-ALREADY-ACTIVE] Job already published: ${id}`);
            }

            // Return formatted response for API consistency
            return this.findOne(id);
        } catch (error) {
            this.logger.error(
                `[PUBLISH-ERROR] Failed to publish job ${id}`,
                error instanceof Error ? error.stack : String(error),
            );
            throw error;
        }
    }

    async bulkPublish(jobIds: string[], userId: string): Promise<{ success: true; processed: number }> {
        const isAdmin = await this.isAdminUser(userId);
        const changedIds: string[] = [];

        const processed = await this.prisma.$transaction(async (tx) => {
            let count = 0;
            for (const id of jobIds) {
                const jobRaw = await this.jobsRepository.findOneRaw(id, tx);
                if (!jobRaw) {
                    throw new JobNotFoundException(id);
                }

                const changed = await this.applyPublish(jobRaw, isAdmin, userId, tx);
                if (changed) {
                    changedIds.push(id);
                }
                count++;
            }
            return count;
        });

        for (const id of changedIds) {
            this.syncJobSearchDataInBackground(id);
        }

        return { success: true, processed };
    }

    /**
     * Single-job reject. Admins may reject any job; employers may only reject a
     * job belonging to their own organization (enforced server-side via
     * validateOrganizationMembership, mirroring update()/publish()) — never
     * trust a client-supplied organizationId for this check.
     */
    async rejectJob(id: string, reason: string, userId: string): Promise<Job> {
        const jobRaw = await this.jobsRepository.findOneRaw(id);
        if (!jobRaw) {
            throw new JobNotFoundException(id);
        }

        const isAdmin = await this.isAdminUser(userId);

        await this.applyReject(id, jobRaw.organizationId, reason, isAdmin, userId);

        return this.findOne(id);
    }

    async bulkReject(jobIds: string[], reason: string, userId: string): Promise<{ success: true; processed: number }> {
        const isAdmin = await this.isAdminUser(userId);

        const processed = await this.prisma.$transaction(async (tx) => {
            let count = 0;
            for (const id of jobIds) {
                const job = await this.jobsRepository.findOneRaw(id, tx);
                if (!job) {
                    throw new JobNotFoundException(id);
                }

                await this.applyReject(id, job.organizationId, reason, isAdmin, userId, tx);
                count++;
            }
            return count;
        });

        return { success: true, processed };
    }

    /**
     * Shared reject validation + state transition, reused by both the single-job
     * and bulk reject flows (so bulk reject rolls back the whole transaction if
     * any job in the batch fails the org-membership check).
     */
    private async applyReject(
        id: string,
        organizationId: string,
        reason: string,
        isAdmin: boolean,
        userId: string,
        client: Prisma.TransactionClient | PrismaService = this.prisma,
    ): Promise<void> {
        if (!isAdmin) {
            await this.validateOrganizationMembership(userId, organizationId, [OrganizationRole.OWNER, OrganizationRole.HR, OrganizationRole.RECRUITER], client);
        }

        await this.jobsRepository.update(id, {
            status: JobStatus.CLOSED,
            rejectionReason: reason,
        }, client);
    }

    /**
     * Shared publish validation + state transition, reused by both the single-job
     * and bulk publish flows. Returns whether the job's status actually changed
     * (an already-ACTIVE job is a no-op, matching the existing single-job behavior).
     */
    private async applyPublish(
        jobRaw: { id: string; organizationId: string; status: JobStatus; description: string | null },
        isAdmin: boolean,
        userId: string,
        client: Prisma.TransactionClient | PrismaService = this.prisma,
    ): Promise<boolean> {
        if (!isAdmin) {
            await this.validateOrganizationMembership(
                userId,
                jobRaw.organizationId,
                [OrganizationRole.OWNER, OrganizationRole.HR, OrganizationRole.RECRUITER],
                client,
            );
        }

        if (jobRaw.status === JobStatus.ACTIVE) {
            return false;
        }

        if (!jobRaw.description) {
            throw new BadRequestException('Job description is required to publish');
        }

        await this.jobsRepository.update(jobRaw.id, {
            status: JobStatus.ACTIVE,
            publishedAt: new Date(),
        }, client);

        return true;
    }

    // ──────────────────────────────────────────────────────────────────────────
    // TRACK EXTERNAL CLICK — authenticated user (external jobs only)
    // ──────────────────────────────────────────────────────────────────────────
    async trackExternalClick(jobId: string, userId: string): Promise<void> {
        const job = await this.findOne(jobId);

        this.assertExternalJob(job);

        if (job.status !== JobStatus.ACTIVE) {
            throw new InvalidJobStateException('Cannot track clicks for a job that is not active');
        }

        const click = await this.jobExternalClicksRepository.create(jobId, userId);

        this.eventEmitter.emit(AnalyticsEventType.JOB_EXTERNAL_APPLY_CLICKED, {
            jobId,
            userId,
            organizationId: job.organizationId,
            idempotencyKey: click.id,
        });

        this.logger.log(`User ${userId} clicked external apply for job ${jobId}`);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // LIST EXTERNAL CLICKS — employer only
    // ──────────────────────────────────────────────────────────────────────────
    async getExternalClicks(jobId: string, userId: string, query: ListJobExternalClicksDto) {
        const job = await this.findOne(jobId);

        this.assertExternalJob(job);

        const isAdmin = await this.isAdminUser(userId);

        if (!isAdmin) {
            await this.validateOrganizationMembership(userId, job.organizationId, [
                OrganizationRole.OWNER,
                OrganizationRole.HR,
                OrganizationRole.RECRUITER,
            ]);
        }

        const page = query.page ?? 1;
        const limit = Math.min(query.limit ?? 100, 200);
        const { clicks, total } = await this.jobExternalClicksRepository.findByJob(jobId, page, limit);

        return {
            clicks: clicks.map((c) => ({
                id: c.id,
                clickedAt: c.clickedAt,
                user: c.user ? { fullName: c.user.fullName, email: c.user.email } : null,
            })),
            total,
            page,
            limit,
        };
    }

    // ──────────────────────────────────────────────────────────────────────────
    // EXPORT EXTERNAL CLICKS — employer only (CSV)
    // ──────────────────────────────────────────────────────────────────────────
    async exportExternalClicksCsv(jobId: string, userId: string): Promise<string> {
        const job = await this.findOne(jobId);

        this.assertExternalJob(job);

        const isAdmin = await this.isAdminUser(userId);

        if (!isAdmin) {
            await this.validateOrganizationMembership(userId, job.organizationId, [
                OrganizationRole.OWNER,
                OrganizationRole.HR,
                OrganizationRole.RECRUITER,
            ]);
        }

        const clicks = await this.jobExternalClicksRepository.findAllByJob(jobId);

        const csvHeader = ['Full Name', 'Email', 'Clicked At'];
        const csvRows = clicks.map((click) => [
            `"${click.user?.fullName ?? ''}"`,
            `"${click.user?.email ?? ''}"`,
            `"${click.clickedAt.toISOString()}"`,
        ]);

        return [csvHeader.map((h) => `"${h}"`).join(','), ...csvRows.map((row) => row.join(','))].join('\n');
    }

    private assertExternalJob(job: { jobType: JobType }): void {
        if (job.jobType !== JobType.EXTERNAL) {
            throw new InvalidJobStateException('This job does not use external apply tracking.');
        }
    }

    async countByMasterDataId(masterDataId: string): Promise<number> {
        const [directCount, skillCount] = await Promise.all([
            this.prisma.job.count({
                where: {
                    status: JobStatus.ACTIVE,
                    OR: [
                        { categoryId: masterDataId },
                        { locationId: masterDataId },
                        { experienceLevelId: masterDataId },
                        { employmentTypeId: masterDataId },
                    ],
                },
            }),
            this.prisma.jobSkill.count({
                where: {
                    masterDataId,
                    job: { status: JobStatus.ACTIVE },
                },
            }),
        ]);

        return directCount + skillCount;
    }

    private async isAdminUser(userId: string, client: Prisma.TransactionClient | PrismaService = this.prisma): Promise<boolean> {
        const user = await client.user.findUnique({
            where: { id: userId },
            select: { role: true },
        });

        return user?.role === 'ADMIN';
    }

    /**
     * Fire-and-forget wrapper around syncJobSearchData(), used by publish() and
     * bulkPublish() so the HTTP response doesn't wait for keyword/embedding
     * generation (which can be slow or rate-limited by OpenAI). syncJobSearchData()
     * already catches and logs its own errors internally and never rejects, but the
     * .catch() here is kept as a safety net so a background sync can never produce
     * an unhandled promise rejection.
     */
    private syncJobSearchDataInBackground(jobId: string): void {
        void this.syncJobSearchData(jobId).catch((error) => {
            this.logger.error(
                `[SYNC-BACKGROUND-ERROR] Background job search sync failed for ${jobId}`,
                error instanceof Error ? error.stack : String(error),
            );
        });
    }

    private async syncJobSearchData(jobId: string): Promise<void> {
        try {
            this.logger.log(`[SYNC-START] Starting job search data sync for ${jobId}`);
            
            const keywords = await this.buildJobKeywords(jobId);

            if (!keywords) {
                this.logger.log(`[SYNC-NO-KEYWORDS] No keywords generated for job ${jobId}, clearing embedding`);
                await this.jobsRepository.updateKeywords(jobId, null);
                await this.jobsRepository.updateEmbedding(jobId, null);
                this.logger.log(`[SYNC-CLEARED] Embedding cleared for job ${jobId}`);
                return;
            }

            this.logger.log(`[SYNC-KEYWORDS-GENERATED] Keywords generated (length: ${keywords.length}) for job ${jobId}`);
            await this.jobsRepository.updateKeywords(jobId, keywords);
            
            this.logger.log(`[SYNC-EMBEDDING-START] Generating embedding for job ${jobId}`);
            const embedding = await this.userService.generateEmbedding(keywords);
            
            if (!embedding || embedding.length === 0) {
                this.logger.warn(`[SYNC-EMBEDDING-EMPTY] Empty embedding generated for job ${jobId}`);
                await this.jobsRepository.updateEmbedding(jobId, null);
            } else {
                this.logger.log(`[SYNC-EMBEDDING-GENERATED] Embedding generated (dims: ${embedding.length}) for job ${jobId}`);
                await this.jobsRepository.updateEmbedding(jobId, embedding);
            }
            
            this.logger.log(`[SYNC-SUCCESS] Job search data synced successfully for ${jobId}`);
        } catch (error) {
            this.logger.error(
                `[SYNC-ERROR] Failed to sync job search data for ${jobId}`,
                error instanceof Error ? error.stack : String(error),
            );
            // Don't re-throw - this is a non-blocking operation
        }
    }

    private async buildJobKeywords(jobId: string): Promise<string | null> {
        this.logger.log(`[KEYWORDS-BUILD-START] Building keywords for job ${jobId}`);

        try {
            const job = await this.prisma.job.findUnique({
                where: { id: jobId },
                include: {
                    skills: {
                        include: {
                            skill: {
                                select: { value: true },
                            },
                        },
                    },
                    organization: {
                        select: { name: true },
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
                    educationLevels: {
                        include: {
                            education: {
                                select: { value: true },
                            },
                        },
                    },
                    specializations: {
                        include: {
                            specialization: {
                                select: { value: true },
                            },
                        },
                    },
                },
            });

            if (!job) {
                this.logger.warn(`[KEYWORDS-BUILD-NOT-FOUND] Job not found: ${jobId}`);
                return null;
            }

            this.logger.log(`[KEYWORDS-BUILD-JOB-FETCHED] Job fetched - title: ${job.title}, skills count: ${job.skills.length}`);
            const educationQualifications = job.educationLevels
                ?.map((edu) => edu.education?.value ?? '')
                .filter((value) => value.length > 0) ?? [];
            const specializationValues = job.specializations
                ?.map((item) => item.specialization?.value ?? '')
                .filter((value) => value.length > 0) ?? [];
            const values = [
                job.title,
                job.description,
                job.summary,
                job.organization?.name,
                job.location?.value,
                job.category?.value,
                job.employmentType?.value,
                job.experienceLevel?.value,
                ...job.skills.map((jobSkill) => jobSkill.skill?.value ?? ''),
                ...educationQualifications,
                ...specializationValues,
            ]
                .map((value) => value?.replace(/\s+/g, ' ').trim())
                .filter((value): value is string => typeof value === 'string' && value.length > 0);

            const uniqueValues = Array.from(new Set(values));
            const keywords = uniqueValues.join('\n');

            this.logger.log(`[KEYWORDS-BUILD-SUCCESS] Keywords built - unique values: ${uniqueValues.length}, total length: ${keywords.length}`);

            return keywords.length > 0 ? keywords : null;
        } catch (error) {
            this.logger.error(
                `[KEYWORDS-BUILD-ERROR] Failed to build keywords for job ${jobId}`,
                error instanceof Error ? error.stack : String(error),
            );
            throw error;
        }
    }

    private async validateOrganizationMembership(
        userId: string,
        organizationId: string,
        allowedRoles: OrganizationRole[],
        client: Prisma.TransactionClient | PrismaService = this.prisma,
    ) {
        if (await this.isAdminUser(userId, client)) {
            return;
        }

        const membership = await client.employerUser.findFirst({
            where: {
                organizationId,
                employer: {
                    userId: userId,
                },
                isDeleted: false,
            },
        });

        if (!membership) {
            throw new UnauthorizedJobException('User is not a member of this organization');
        }

        if (!allowedRoles.includes(membership.role)) {
            throw new UnauthorizedJobException(`User role ${membership.role} is not authorized to perform this action`);
        }
    }
}
