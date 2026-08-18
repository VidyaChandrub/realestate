import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ApplicationsRepository } from '../repositories/applications.repository';
import { CreateApplicationDto } from '../dto/create-application.dto';
import { UpdateApplicationDto } from '../dto/update-application.dto';
import { ListApplicationsDto } from '../dto/list-applications.dto';
import { ApplicationNotFoundException } from '../exceptions/application-not-found.exception';
import { UnauthorizedApplicationException } from '../exceptions/unauthorized-application.exception';
import { InvalidApplicationException } from '../exceptions/invalid-application.exception';
import { Application, ApplicationStatus, Job, JobStatus, JobType, NotificationType, EntityType } from '@prisma/client';
import { JobsService } from '../../jobs/services/jobs.service';
import { PrismaService } from '../prisma.service';
import { UserService } from '../../user/user.service';
import { NotificationsService } from '../../notifications/services/notifications.service';
import { EmployersService } from '../../employers/services/employers.service';

@Injectable()
export class ApplicationsService {
    private readonly logger = new Logger(ApplicationsService.name);

    constructor(
        private readonly applicationsRepository: ApplicationsRepository,
        private readonly jobsService: JobsService,
        private readonly prisma: PrismaService,
        private readonly userService: UserService,
        private readonly notificationsService: NotificationsService,
        private readonly employersService: EmployersService,
        private readonly eventEmitter: EventEmitter2,
    ) { }

    /**
     * Helper: Check if user has a specific role
     */
    private hasRole(roles: string[], role: string): boolean {
        return Array.isArray(roles) && roles.includes(role);
    }

    /**
     * Helper: Check if user is employer
     */
    private isEmployer(roles: string[]): boolean {
        return this.hasRole(roles, 'EMPLOYER');
    }

    /**
     * Helper: Check if user is regular user
     */
    private isUser(roles: string[]): boolean {
        return this.hasRole(roles, 'JOB_SEEKER');
    }

    /**
     * Helper: Check if user is admin
     */
    private isAdmin(roles: string[]): boolean {
        return this.hasRole(roles, 'ADMIN');
    }

    /**
     * Create a new application
     * Business Rules:
     * - Only USER role can apply
     * - Job must be ACTIVE
     * - Cannot apply twice to same job
     * - User must have completed profile
     */
    async create(createApplicationDto: CreateApplicationDto, userId: string, userRoles: string[]): Promise<Application> {
        // 1. Validate user role - only regular users can apply
        if (!this.isUser(userRoles)) {
            throw new UnauthorizedApplicationException('Only users with JOB_SEEKER role can apply for jobs');
        }

        // 2. Validate profile completion
        await this.validateProfileCompletion(userId);

        // 3. Validate job exists and is ACTIVE
        const job = await this.jobsService.findOne(createApplicationDto.jobId);
        if (job.status !== JobStatus.ACTIVE) {
            throw new InvalidApplicationException('Cannot apply to a job that is not active');
        }

        // 4. Check for duplicate application
        const existingApplication = await this.applicationsRepository.findByUserAndJob(
            userId,
            createApplicationDto.jobId
        );
        if (existingApplication) {
            throw new InvalidApplicationException('You have already applied to this job');
        }

        // 5. Create application
        const application = await this.applicationsRepository.create({
            user: { connect: { userId: userId } },
            job: { connect: { id: createApplicationDto.jobId } },
            coverNote: createApplicationDto.coverNote,
            status: ApplicationStatus.SUBMITTED,
        });

        this.eventEmitter.emit('application.submitted', {
            applicationId: application.id,
            jobId: job.id,
            organizationId: job.organizationId,
            userId: userId,
        });

        // 6. Notify employer (Organization Owner)
        try {
            const employerMembership = await this.prisma.employerUser.findFirst({
                where: {
                    organizationId: job.organizationId,
                    role: 'OWNER',
                    isDeleted: false,
                },
                include: {
                    employer: true,
                },
            });

            if (employerMembership && employerMembership.employer.userId) {
                await this.notificationsService.createNotification({
                    userId: employerMembership.employer.userId,
                    type: NotificationType.APPLICATION_RECEIVED,
                    title: 'New Application Received',
                    message: `You have received a new application for "${job.title}".`,
                    entityType: EntityType.APPLICATION,
                    entityId: application.id,
                    metadata: { jobId: job.id },
                });
            }
        } catch (error) {
            this.logger.error(`Failed to send notification for application ${application.id}: ${error.message}`);
            // Don't fail the application creation if notification fails
        }

        try {
            await this.notifyEmployerOfJobApplication(job, application, userId);
        } catch (error) {
            this.logger.error(
                `Failed to notify organization of application for job ${job.id}`,
                (error as Error).stack,
            );
        }

        return application;
    }

    /**
     * List applications with filters
     * - Users can list their own applications
     * - Employers can list applications for jobs they own
     */
    async findAll(query: ListApplicationsDto, userId: string, userRoles: string[]): Promise<{ applications: Application[]; total: number }> {
        // If USER role (not employer), only show their own applications
        if (this.isUser(userRoles)) {
            query.userId = userId;
        }

        const result = await this.applicationsRepository.findAll(query);

        const mappedApplications = result.applications.map((app: any) => ({
            ...app,
            job_id: app.job?.id,
            job_name: app.job?.title,
            job_description: app.job?.description,
            user_id: app.user?.userId,
            user_first_name: app.user?.firstName,
            user_last_name: app.user?.lastName,
        }));

        return { applications: mappedApplications, total: result.total };
    }

    /**
     * Get applications for a specific job (Employer only)
     */
    async findByJob(jobId: string, userId: string, userRoles: string[]): Promise<Application[]> {
        // Validate employer owns the job
        if (!this.isEmployer(userRoles)) {
            throw new UnauthorizedApplicationException('Only employers can view job applications');
        }

        const job = await this.jobsService.findOne(jobId);
        await this.validateJobOwnership(userId, job.organizationId);

        const result = await this.applicationsRepository.findAll({ jobId, page: 1, limit: 1000 });
        return result.applications;
    }

    /**
     * Find a single application
     */
    async findOne(id: string, userId: string, userRoles: string[]): Promise<Application> {
        const application = await this.applicationsRepository.findOne(id);
        if (!application) {
            throw new ApplicationNotFoundException(id);
        }

        // Validate access
        if (this.isUser(userRoles) && application.userId !== userId) {
            throw new UnauthorizedApplicationException('You can only view your own applications');
        }

        if (this.isEmployer(userRoles)) {
            const job = await this.jobsService.findOne(application.jobId);
            await this.validateJobOwnership(userId, job.organizationId);
        }

        const app = application as any;
        return {
            ...application,
            job_id: app.job?.id,
            job_name: app.job?.title,
            job_description: app.job?.description,
            user_id: app.user?.userId,
            user_first_name: app.user?.firstName,
            user_last_name: app.user?.lastName,
        } as any;
    }

    /**
     * Update application status (Employer only)
     * Enforces status transitions
     */
    async update(id: string, updateApplicationDto: UpdateApplicationDto, userId: string, userRoles: string[]): Promise<Application> {
        if (!this.isEmployer(userRoles)) {
            throw new UnauthorizedApplicationException('Only employers can update application status');
        }

        const application = await this.applicationsRepository.findOne(id);
        if (!application) {
            throw new ApplicationNotFoundException(id);
        }

        // Validate employer owns the job
        const job = await this.jobsService.findOne(application.jobId);
        await this.validateJobOwnership(userId, job.organizationId);

        // Validate status transition
        if (updateApplicationDto.status) {
            this.validateStatusTransition(application.status, updateApplicationDto.status);
        }

        const updatedApplication = await this.applicationsRepository.update(id, {
            status: updateApplicationDto.status,
        });

        const app = updatedApplication as any;
        return {
            ...updatedApplication,
            job_id: app.job?.id,
            job_name: app.job?.title,
            job_description: app.job?.description,
            user_id: app.user?.userId,
            user_first_name: app.user?.firstName,
            user_last_name: app.user?.lastName,
        } as any;
    }

    /**
     * Delete an application (User only, own applications)
     */
    async remove(id: string, userId: string, userRoles: string[]): Promise<void> {
        const application = await this.applicationsRepository.findOne(id);
        if (!application) {
            throw new ApplicationNotFoundException(id);
        }

        if (!this.isUser(userRoles) || application.userId !== userId) {
            throw new UnauthorizedApplicationException('You can only delete your own applications');
        }

        await this.applicationsRepository.delete(id);
    }

    /**
     * Validate profile completion using Prisma Profile
     */
    private async validateProfileCompletion(userId: string): Promise<void> {
        // userId here is Keycloak ID
        const profile = await this.userService.getProfileByUserId(userId);

        if (!profile) {
            throw new InvalidApplicationException('Please create your profile before applying for jobs');
        }

        // Check if basic profile fields are filled
        const hasBasicInfo = profile.firstName && profile.lastName;

        if (!hasBasicInfo) {
            throw new InvalidApplicationException('Please complete your profile (name required) before applying for jobs');
        }
    }

    /**
     * Validate job ownership for employer
     */
    private async validateJobOwnership(userId: string, organizationId: string): Promise<void> {
        const membership = await this.prisma.employerUser.findFirst({
            where: {
                organizationId,
                employer: {
                    userId: userId,
                },
                isDeleted: false,
            },
        });

        if (!membership) {
            throw new UnauthorizedApplicationException('You do not have access to this job');
        }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // NOTIFY EMPLOYER OF JOB APPLICATION — INTERNAL jobs only; never blocks application
    // ──────────────────────────────────────────────────────────────────────────
    private async notifyEmployerOfJobApplication(
        job: Job,
        application: Application,
        applicantUserId: string,
    ): Promise<void> {
        if (job.jobType !== JobType.INTERNAL) {
            return;
        }

        const { data: organizationUsers } = await this.employersService.getOrganizationUsers(
            job.organizationId,
        );

        const recipientUserIds = [
            ...new Set(
                (organizationUsers ?? [])
                    .filter(
                        (member) =>
                            member.isActive &&
                            member.employer?.userId &&
                            member.employer.userId !== applicantUserId,
                    )
                    .map((member) => member.employer.userId as string),
            ),
        ];

        if (recipientUserIds.length === 0) {
            return;
        }

        const applicant = await this.prisma.profile.findUnique({
            where: { userId: applicantUserId },
            select: { fullName: true, email: true },
        });
        const applicantName = applicant?.fullName?.trim() || applicant?.email || 'A consumer';

        const title = 'New Job Application';
        const message = `${applicantName} has applied for "${job.title}".`;

        await Promise.all(
            recipientUserIds.map(async (employerUserId) => {
                try {
                    await this.notificationsService.createNotification({
                        userId: employerUserId,
                        type: NotificationType.INFO,
                        title,
                        message,
                        entityType: EntityType.JOB,
                        entityId: job.id,
                        metadata: {
                            type: 'JOB_APPLICATION',
                            jobId: job.id,
                            applicationId: application.id,
                            consumerUserId: applicantUserId,
                        },
                    });
                } catch (error) {
                    this.logger.error(
                        `Failed to create application notification for employer user ${employerUserId} for job ${job.id}`,
                        (error as Error).stack,
                    );
                }
            }),
        );
    }

    /**
     * Validate status transitions
     * Allowed transitions:
     * - SUBMITTED → VIEWED
     * - VIEWED → SHORTLISTED
     * - SUBMITTED/VIEWED → REJECTED
     * - SHORTLISTED → HIRED
     */
    private validateStatusTransition(currentStatus: ApplicationStatus, newStatus: ApplicationStatus): void {
        const allowedTransitions: Record<ApplicationStatus, ApplicationStatus[]> = {
            [ApplicationStatus.SUBMITTED]: [ApplicationStatus.VIEWED, ApplicationStatus.REJECTED],
            [ApplicationStatus.VIEWED]: [ApplicationStatus.SHORTLISTED, ApplicationStatus.REJECTED],
            [ApplicationStatus.SHORTLISTED]: [ApplicationStatus.HIRED, ApplicationStatus.REJECTED],
            [ApplicationStatus.REJECTED]: [],
            [ApplicationStatus.HIRED]: [],
        };

        if (!allowedTransitions[currentStatus].includes(newStatus)) {
            throw new InvalidApplicationException(
                `Invalid status transition from ${currentStatus} to ${newStatus}`
            );
        }
    }
}
