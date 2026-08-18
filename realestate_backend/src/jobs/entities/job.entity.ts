import { Job, JobStatus, JobSkill, JobType, JobWorkMode } from '@prisma/client';

export class JobEntity implements Job {
    id: string;
    organizationId: string;
    organizationName: string | null;
    sourceName: string | null;
    title: string;
    description: string | null;
    /** Job Card preview text; populated by the scraper import pipeline for external jobs, or falls back to `description`. */
    descriptionPreview: string | null;
    summary: string | null;
    categoryId: string | null;
    locationId: string | null;
    minExperienceMonths: number | null;
    maxExperienceMonths: number | null;
    experienceLevelId: string | null;
    educationLevelId: string | null;
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

    skills?: JobSkill[];

    constructor(partial: Partial<JobEntity>) {
        Object.assign(this, partial);
    }
}
