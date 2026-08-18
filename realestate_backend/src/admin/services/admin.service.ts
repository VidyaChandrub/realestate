import { BadRequestException, ConflictException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CampaignStatus, EventMode, EventStatus, JobStatus, JobType, OrganizationRole, Prisma, RegistrationStatus, RegistrationType, UserRole, VerificationStatus } from '@prisma/client';
import { PrismaService } from '../../user/prisma.service';
import { AdsService } from '../../ads/services/ads.service';
import { EventsService } from '../../events/services/events.service';
import { EventExternalClicksRepository } from '../../events/repositories/event-external-clicks.repository';
import { JobExternalClicksRepository } from '../../jobs/repositories/job-external-clicks.repository';
import { resolveCompanyLogo } from '../../jobs/utils/resolve-company-logo.util';
import { EmployerUsersService } from '../../employers/services/employer-users.service';
import { AnalyticsService } from '../../analytics/services/analytics.service';
import { MailService } from '../../auth/services/mail.service';
import { AdminListQueryDto } from '../dto/admin-list-query.dto';

type StatusMailUser = {
  id: string;
  role: string | null;
  email: string | null;
  firstName?: string | null;
  lastName?: string | null;
};

/**
 * Profile.userType is a legacy string mirror of User.role ('consumer' | 'employer' | 'admin'),
 * set at profile creation (see UserService.extractUserType) and unchanged afterwards. There is
 * no Prisma relation between User and Profile, so admin user queries filter on this field
 * instead of joining to users.role.
 */
const USER_TYPE_BY_ROLE: Record<UserRole, string> = {
  [UserRole.JOB_SEEKER]: 'consumer',
  [UserRole.EMPLOYER]: 'employer',
  [UserRole.ADMIN]: 'admin',
};

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly adsService: AdsService,
    private readonly eventsService: EventsService,
    private readonly externalClicksRepository: EventExternalClicksRepository,
    private readonly jobExternalClicksRepository: JobExternalClicksRepository,
    private readonly employerUsersService: EmployerUsersService,
    private readonly analyticsService: AnalyticsService,
    private readonly mailService: MailService,
  ) {}

  async listUsers(query: AdminListQueryDto): Promise<{ data: any[]; total: number; page: number; limit: number }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;
    const parsedIsActive = query.isActive === 'true' ? true : query.isActive === 'false' ? false : undefined;

    const where: any = {
      // The Users module is dedicated to job seekers only. Agency/admin accounts must never
      // be returned here, so this is always applied and does not depend on the `role` query
      // param — a caller passing role=EMPLOYER (or omitting role) still only sees job seekers.
      userType: { equals: USER_TYPE_BY_ROLE[UserRole.JOB_SEEKER], mode: 'insensitive' },
      ...(query.search
        ? {
            OR: [
              { fullName: { contains: query.search, mode: 'insensitive' } },
              { email: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(parsedIsActive !== undefined ? { isActive: parsedIsActive } : {}),
      ...(query.cityId ? { currentCityId: query.cityId } : {}),
      ...(query.stateId ? { stateId: query.stateId } : {}),
      ...(query.educationId ? { highestQualificationId: query.educationId } : {}),
    };

    if (query.startDate || query.endDate) {
      where.createdAt = {
        ...(query.startDate ? { gte: new Date(query.startDate) } : {}),
        ...(query.endDate ? { lte: new Date(new Date(query.endDate).setHours(23, 59, 59, 999)) } : {}),
      };
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.profile.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.profile.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async getUserById(userId: string): Promise<any> {
    const profile = await this.prisma.profile.findUnique({ where: { userId: userId } });
    if (!profile) {
      throw new NotFoundException(`User not found: ${userId}`);
    }
    return profile;
  }

  async updateUserStatus(userId: string, isActive: boolean): Promise<any> {
    return this.applyUserStatusChange(userId, isActive);
  }

  async bulkUpdateUserStatus(userIds: string[], isActive: boolean): Promise<{ success: true; processed: number }> {
    const uniqueUserIds = Array.from(new Set(userIds));

    this.logger.log(
      `Admin bulk ${isActive ? 'activate' : 'deactivate'} users: userIds=${uniqueUserIds.join(',')}`,
    );

    const processed = await this.prisma.$transaction(async (tx) => {
      let count = 0;
      for (const userId of uniqueUserIds) {
        await this.applyBulkUserStatusChange(userId, isActive, tx);
        count++;
      }
      return count;
    });

    return { success: true, processed };
  }

  /**
   * Bulk-specific status-change validation + update. Unlike applyUserStatusChange,
   * this skips the DB write and status email entirely when the user's status
   * already matches the requested value, so selecting an already-active user in a
   * bulk "activate" (or already-inactive user in a bulk "deactivate") is a no-op.
   *
   * Non-JOB_SEEKER ids (agency/admin) are silently skipped rather than failing the
   * whole batch — the bulk endpoints are scoped to job seekers only.
   */
  private async applyBulkUserStatusChange(
    userId: string,
    isActive: boolean,
    tx: Prisma.TransactionClient,
  ): Promise<void> {
    const existingUser = await tx.user.findUnique({ where: { id: userId } });
    if (!existingUser) {
      throw new NotFoundException(`User not found: ${userId}`);
    }

    const existingProfile = await tx.profile.findUnique({ where: { userId: userId } });
    if (!existingProfile) {
      throw new NotFoundException(`User not found: ${userId}`);
    }

    if (existingUser.role !== UserRole.JOB_SEEKER) {
      this.logger.warn(
        `Skipping bulk status update for user ${userId}: role=${existingUser.role} is not JOB_SEEKER`,
      );
      return;
    }

    if (existingUser.isActive === isActive) {
      this.logger.debug(`Skipping status update for user ${userId}: already isActive=${isActive}`);
      return;
    }

    await tx.user.update({ where: { id: userId }, data: { isActive } });
    await tx.profile.update({ where: { userId: userId }, data: { isActive } });

    this.logger.log(`Admin action: updateUserStatus target=${userId} isActive=${isActive}`);

    // Send status update emails asynchronously (fire-and-forget)
    this.sendUserStatusEmail(existingUser, isActive).catch((err) => {
      this.logger.warn(`Failed to send user status email for user ${userId}`, err);
    });
  }

  /**
   * Shared status-change validation + update, used by the single-user update flow.
   */
  private async applyUserStatusChange(userId: string, isActive: boolean): Promise<any> {
    const existingUser = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!existingUser) {
      throw new NotFoundException(`User not found: ${userId}`);
    }

    const existingProfile = await this.prisma.profile.findUnique({ where: { userId: userId } });
    if (!existingProfile) {
      throw new NotFoundException(`User not found: ${userId}`);
    }

    if (existingUser.role !== UserRole.JOB_SEEKER) {
      throw new ConflictException(
        `Cannot update status for user ${userId}: this endpoint only supports JOB_SEEKER accounts`,
      );
    }

    // Wrap the two writes together so they commit/rollback atomically.
    const [, updated] = await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: userId }, data: { isActive } }),
      this.prisma.profile.update({ where: { userId: userId }, data: { isActive } }),
    ]);

    this.logger.log(`Admin action: updateUserStatus target=${userId} isActive=${isActive}`);

    // Send status update emails asynchronously (fire-and-forget)
    this.sendUserStatusEmail(existingUser, isActive).catch((err) => {
      this.logger.warn(`Failed to send user status email for user ${userId}`, err);
    });

    return updated;
  }

  async listOrganizations(query: AdminListQueryDto): Promise<{ data: any[]; total: number; page: number; limit: number }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;
    const status = query.status?.toUpperCase();

    const statusFilter =
      status === 'APPROVED'
        ? { isApproved: true, isSuspended: false }
        : status === 'SUSPENDED'
          ? { isSuspended: true }
          : status === 'PENDING'
            ? { isApproved: false, isSuspended: false }
            : {};

    const where: any = {
      isDeleted: false,
      ...(query.search ? { name: { contains: query.search, mode: 'insensitive' } } : {}),
      ...statusFilter,
    };

    const [organizations, total] = await this.prisma.$transaction([
      this.prisma.organization.findMany({
        where,
        include: {
          _count: {
            select: {
              users: true,
              jobs: true,
            },
          },
          // Creator = the OWNER membership created alongside the organization.
          users: {
            where: { role: OrganizationRole.OWNER },
            take: 1,
            orderBy: { createdAt: 'asc' },
            include: {
              employer: {
                include: {
                  user: { select: { mobileNumber: true } },
                },
              },
            },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.organization.count({ where }),
    ]);

    const data = organizations.map((org) => {
      const { users, ...rest } = org as any;
      const owner = users?.[0]?.employer;
      return {
        ...rest,
        creatorEmail: owner?.email ?? null,
        creatorMobileNumber: owner?.user?.mobileNumber ?? null,
        creatorName: owner ? [owner.firstName, owner.lastName].filter(Boolean).join(' ') || null : null,
      };
    });

    return { data, total, page, limit };
  }

  async approveOrganization(id: string): Promise<any> {
    const existing = await this.prisma.organization.findFirst({
      where: { id, isDeleted: false },
    });
    if (!existing) {
      throw new NotFoundException(`Organization not found: ${id}`);
    }

    const updated = await this.prisma.organization.update({
      where: { id },
      data: {
        verificationStatus: VerificationStatus.APPROVED,
        isApproved: true,
        isSuspended: false,
      },
    });

    this.logger.log(`Admin action: approveOrganization target=${id}`);

    // Send approval emails asynchronously (fire-and-forget)
    this.sendApprovalEmails(id, existing.name).catch((err) => {
      this.logger.warn(`Failed to send approval emails for organization ${id}`, err);
    });

    return updated;
  }

  private async sendApprovalEmails(organizationId: string, organizationName: string): Promise<void> {
    try {
      const organization = await this.prisma.organization.findUnique({
        where: { id: organizationId },
        include: {
          users: {
            include: {
              employer: true,
            },
          },
        },
      });

      if (!organization || !organization.users || organization.users.length === 0) {
        this.logger.debug(`No agency users found for organization ${organizationId}`);
        return;
      }

      const emails = organization.users
        .map((eu) => eu.employer?.email)
        .filter((email) => !!email) as string[];

      if (emails.length === 0) {
        this.logger.debug(`No valid emails found for organization ${organizationId}`);
        return;
      }

      await this.mailService.sendEmployerApprovedEmail(emails, organizationName);
    } catch (err) {
      this.logger.warn(`Error sending approval emails for organization ${organizationId}`, err);
    }
  }

  async suspendOrganization(id: string): Promise<any> {
    const existing = await this.prisma.organization.findFirst({
      where: { id, isDeleted: false },
    });
    if (!existing) {
      throw new NotFoundException(`Organization not found: ${id}`);
    }

    const updated = await this.prisma.organization.update({
      where: { id },
      data: {
        verificationStatus: VerificationStatus.SUSPENDED,
        isApproved: false,
        isSuspended: true,
      },
    });

    this.logger.log(`Admin action: suspendOrganization target=${id}`);

    // Send suspension emails asynchronously (fire-and-forget)
    this.sendSuspensionEmails(id, existing.name).catch((err) => {
      this.logger.warn(`Failed to send suspension emails for organization ${id}`, err);
    });

    return updated;
  }

  private async sendSuspensionEmails(organizationId: string, organizationName: string): Promise<void> {
    try {
      const organization = await this.prisma.organization.findUnique({
        where: { id: organizationId },
        include: {
          users: {
            include: {
              employer: true,
            },
          },
        },
      });

      if (!organization || !organization.users || organization.users.length === 0) {
        this.logger.debug(`No agency users found for organization ${organizationId}`);
        return;
      }

      const emails = organization.users
        .map((eu) => eu.employer?.email)
        .filter((email) => !!email) as string[];

      if (emails.length === 0) {
        this.logger.debug(`No valid emails found for organization ${organizationId}`);
        return;
      }

      await this.mailService.sendEmployerSuspendedEmail(emails, organizationName);
    } catch (err) {
      this.logger.warn(`Error sending suspension emails for organization ${organizationId}`, err);
    }
  }

  private async sendUserStatusEmail(user: StatusMailUser, isActive: boolean): Promise<void> {
    // Skip email sending for ADMIN users
    if (user.role?.toUpperCase() === 'ADMIN') {
      this.logger.debug(`Skipping email notification for ADMIN user ${user.id}`);
      return;
    }

    const email = user.email;
    if (!email) {
      this.logger.warn(`User ${user.id} has no email address, skipping status notification`);
      return;
    }

    const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ') || undefined;
    const roleUpper = user.role?.toUpperCase();

    switch (roleUpper) {
      case 'JOB_SEEKER':
        if (isActive) {
          await this.mailService.sendConsumerActivatedEmail(email, fullName);
          this.logger.log(`Consumer activation email sent to ${email}`);
        } else {
          await this.mailService.sendConsumerDeactivatedEmail(email, fullName);
          this.logger.log(`Consumer deactivation email sent to ${email}`);
        }
        break;

      case 'EMPLOYER':
        if (isActive) {
          await this.mailService.sendEmployerUserActivatedEmail(email, fullName);
          this.logger.log(`Agency activation email sent to ${email}`);
        } else {
          await this.mailService.sendEmployerUserDeactivatedEmail(email, fullName);
          this.logger.log(`Agency deactivation email sent to ${email}`);
        }
        break;

      default:
        this.logger.debug(`No status email handler for unsupported role: ${user.role}`);
    }
  }

  async listJobs(query: AdminListQueryDto): Promise<{ data: any[]; total: number; page: number; limit: number }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;
    const searchValue = query.q ?? query.search;
    const searchTerm = searchValue?.trim();
    const parsedSalary = searchTerm ? Number(searchTerm) : NaN;
    const statusRaw = query.status?.toUpperCase();
    const status = statusRaw && Object.values(JobStatus).includes(statusRaw as JobStatus)
      ? (statusRaw as JobStatus)
      : undefined;
    const jobTypeRaw = query.jobType?.toUpperCase();
    const jobType = jobTypeRaw && Object.values(JobType).includes(jobTypeRaw as JobType)
      ? (jobTypeRaw as JobType)
      : undefined;

    const where: any = {
      ...(searchTerm
        ? {
            OR: [
              { title: { contains: searchTerm, mode: 'insensitive' } },
              { organization: { name: { contains: searchTerm, mode: 'insensitive' } } },
              ...(Number.isFinite(parsedSalary) && Number.isInteger(parsedSalary)
                ? [
                    { salaryMin: { equals: parsedSalary } },
                    { salaryMax: { equals: parsedSalary } },
                  ]
                : []),
            ],
          }
        : {}),
      ...(status ? { status } : {}),
      ...(jobType ? { jobType } : {}),
      ...(query.organizationId ? { organizationId: query.organizationId } : {}),
      ...(query.startDate || query.endDate
        ? {
            createdAt: {
              ...(query.startDate ? { gte: new Date(query.startDate) } : {}),
              ...(query.endDate
                ? {
                    lte: new Date(
                      new Date(query.endDate).setHours(23, 59, 59, 999),
                    ),
                  }
                : {}),
            },
          }
        : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.job.findMany({
        where,
        include: {
          organization: {
            select: {
              id: true,
              name: true,
              logoUrl: true,
            },
          },
          _count: {
            select: { applications: true },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.job.count({ where }),
    ]);

    const externalJobIds = data
      .filter((job) => job.jobType === JobType.EXTERNAL)
      .map((job) => job.id);
    const externalClickCounts = await this.jobExternalClicksRepository.countsByJobs(externalJobIds);

    const dataWithExternalClicks = data.map((job) => ({
      ...job,
      companyLogo: resolveCompanyLogo(job.companyLogo, job.organization?.logoUrl),
      ...(job.jobType === JobType.EXTERNAL && {
        _count: {
          ...job._count,
          applications: externalClickCounts.get(job.id) ?? 0,
        },
      }),
    }));

    return { data: dataWithExternalClicks, total, page, limit };
  }

  async approveJob(id: string): Promise<any> {
    const existing = await this.prisma.job.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Job not found: ${id}`);
    }

    const updated = await this.prisma.job.update({
      where: { id },
      data: { status: JobStatus.ACTIVE },
    });

    this.logger.log(`Admin action: approveJob target=${id}`);
    return updated;
  }

  async listApplications(query: any, userId: string): Promise<{ data: any[]; total: number; page: number; limit: number }> {
    const jobId = query.jobId;

    const isAdmin = await this.isAdminUser(userId);
    if (!isAdmin) {
      if (!jobId) {
        throw new BadRequestException('jobId is required to view applications');
      }

      const job = await this.prisma.job.findUnique({
        where: { id: jobId },
        select: { id: true, organizationId: true },
      });
      if (!job) {
        throw new NotFoundException('Job not found');
      }

      const role = await this.employerUsersService.getUserRole(userId, job.organizationId);
      if (!role) {
        throw new ForbiddenException('You are not a member of the organization that owns this job');
      }
    }

    const page = query.page ? parseInt(query.page) : 1;
    const limit = query.limit ? parseInt(query.limit) : 20;
    const skip = (page - 1) * limit;

    const toArray = (v: any): string[] => {
      if (!v) return [];
      return Array.isArray(v) ? v : [v];
    };

    const search = query.search;
    const startDate = query.startDate ? new Date(query.startDate) : undefined;
    const endDate = query.endDate ? new Date(query.endDate) : undefined;
    const countryIds = toArray(query.countryIds);
    const stateIds = toArray(query.stateIds);
    const cityIds = toArray(query.cityIds);
    const skillIds = toArray(query.skillIds);
    const experienceLevelIds = toArray(query.experienceLevelIds);
    const educationLevelIds = toArray(query.educationLevelIds);
    const years = toArray(query.years);
    const specializationIds = toArray(query.specializationIds);
    const where: any = {};
    if (jobId) where.jobId = jobId;

    if (startDate || endDate) {
      where.appliedAt = {};
      if (startDate) where.appliedAt.gte = startDate;
      if (endDate) where.appliedAt.lte = endDate;
    }

    const userFilters: any = {};
    if (search) {
      userFilters.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { mobileNumber: { contains: search } },
      ];
    }
    if (cityIds.length > 0) userFilters.currentCityId = { in: cityIds };
    if (stateIds.length > 0) userFilters.stateId = { in: stateIds };
    if (countryIds.length > 0) userFilters.countryId = { in: countryIds };
    if (experienceLevelIds.length > 0) userFilters.experienceLevelId = { in: experienceLevelIds };
    if (educationLevelIds.length > 0) userFilters.highestQualificationId = { in: educationLevelIds };
    if (skillIds.length > 0) {
      userFilters.skills = { some: { masterDataId: { in: skillIds } } };
    }
    if (years.length > 0) {
      userFilters.education = {
        some: { yearOfPassing: { in: years.map((y: string) => parseInt(y)) } },
      };
    }
    if (specializationIds.length > 0) {
      const specializationCategories = await this.prisma.category.findMany({
        where: {
          id: { in: specializationIds },
          type: 'SPECIALIZATION',
        },
        select: { value: true },
      });
      const specializationNames = specializationCategories
        .map((s) => s.value?.trim())
        .filter(Boolean);
      if (specializationNames.length > 0) {
        userFilters.education = {
          some: {
            specialization: { in: specializationNames },
          },
        };
      }
    }
    if (Object.keys(userFilters).length > 0) where.user = userFilters;


    const [data, total] = await this.prisma.$transaction([
      this.prisma.application.findMany({
        where,
        include: {
          user: {
            select: {
              userId: true,
              fullName: true,
              firstName: true,
              lastName: true,
              email: true,
              mobileNumber: true,
              currentCityId: true,
              stateId: true,
              countryId: true,
              experienceLevelId: true,
              highestQualificationId: true,
              skills: { select: { masterDataId: true } },
              education: {
                select: {
                  highestQualificationId: true,
                  yearOfPassing: true,
                  degreeName: true,
                  specialization: true,
                },
                orderBy: { yearOfPassing: 'desc' },
              },
            },
          },
        },
        skip,
        take: limit,
        orderBy: { appliedAt: 'desc' },
      }),
      this.prisma.application.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async listCampaigns(query: AdminListQueryDto): Promise<any> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;
    const statusRaw = query.status?.toUpperCase();
    const status = statusRaw && Object.values(CampaignStatus).includes(statusRaw as CampaignStatus)
      ? (statusRaw as CampaignStatus)
      : undefined;

    const where: any = {
      ...(status ? { status } : {}),
      ...(query.search ? { name: { contains: query.search, mode: 'insensitive' } } : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.campaign.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.campaign.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async approveCampaign(id: string): Promise<any> {
    this.logger.log(`Admin action: approveCampaign target=${id}`);
    return this.adsService.approveCampaign(id, true);
  }

  async rejectCampaign(id: string, reason: string): Promise<any> {
    this.logger.log(`Admin action: rejectCampaign target=${id} reason=${reason}`);
    return this.adsService.rejectCampaign(id, reason, true);
  }

  async listEvents(query: AdminListQueryDto): Promise<any> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;
    const statusRaw = query.status?.toUpperCase();
    const status = statusRaw && Object.values(EventStatus).includes(statusRaw as EventStatus)
      ? (statusRaw as EventStatus)
      : undefined;

    const registrationTypeRaw = query.registrationType?.toUpperCase();
    const registrationType = registrationTypeRaw && Object.values(RegistrationType).includes(registrationTypeRaw as RegistrationType)
      ? (registrationTypeRaw as RegistrationType)
      : undefined;

    const modeRaw = query.mode?.toUpperCase();
    const mode = modeRaw && Object.values(EventMode).includes(modeRaw as EventMode)
      ? (modeRaw as EventMode)
      : undefined;

    const where: any = {
      ...(status ? { status } : {}),
      ...(registrationType ? { registrationType } : {}),
      ...(mode ? { mode } : {}),
      ...(query.search ? {
        OR: [
          { title: { contains: query.search, mode: 'insensitive' } },
          { organization: { name: { contains: query.search, mode: 'insensitive' } } },
        ],
      } : {}),
      ...(query.organizationId ? { organizationId: query.organizationId } : {}),
    // Support both AdminListQueryDto `startDate`/`endDate` and events DTO `startDateFrom`/`startDateTo`
    };

    const startDateValue = (query as any).startDate ?? (query as any).startDateFrom;
    const endDateValue = (query as any).endDate ?? (query as any).startDateTo;

    if (startDateValue || endDateValue) {
      where.createdAt = {
        ...(startDateValue ? { gte: new Date(startDateValue) } : {}),
        ...(endDateValue ? { lte: new Date(new Date(endDateValue).setHours(23, 59, 59, 999)) } : {}),
      };
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.event.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          organization: {
            select: {
              name: true,
            },
          },
        },
      }),
      this.prisma.event.count({ where }),
    ]);

    const eventIds = data.map((event) => event.id);
    const counts = eventIds.length
      ? await this.prisma.eventRegistration.groupBy({
          by: ['eventId'],
          where: {
            eventId: { in: eventIds },
            status: RegistrationStatus.REGISTERED,
          },
          _count: {
            eventId: true,
          },
        })
      : [];
    const countMap = new Map(counts.map((count) => [count.eventId, count._count.eventId]));

    const externalEventIds = data
      .filter((e) => e.registrationType === RegistrationType.EXTERNAL)
      .map((e) => e.id);
    const externalClickCounts = await this.externalClicksRepository.countsByEvents(externalEventIds);

    const dataWithCount = data.map(({ organization, ...event }) => ({
      ...event,
      organizationName: organization?.name ?? null,
      registeredCount: countMap.get(event.id) || 0,
      ...(event.registrationType === RegistrationType.EXTERNAL && {
        externalClickCount: externalClickCounts.get(event.id) ?? 0,
      }),
    }));

    const hydratedData = await this.attachEventTags(dataWithCount);

    return { data: hydratedData, total, page, limit };
  }

  private async attachEventTags(events: Array<{ tagIds?: string[] | null } & Record<string, any>>) {
    const allTagIds = Array.from(
      new Set(events.flatMap((event) => event.tagIds ?? [])),
    );

    const validUUIDTags = allTagIds.filter(
      (id): id is string =>
        typeof id === 'string' &&
        /^[0-9a-fA-F-]{36}$/.test(id),
    );

    if (validUUIDTags.length === 0) {
      return events.map(({ tagIds: _tagIds, ...event }) => ({
        ...event,
        tags: (event.tagIds ?? []).map((id) => ({
          id,
          value: null,
        })),
      }));
    }

    const categories = await this.prisma.category.findMany({
      where: {
        id: {
          in: validUUIDTags,
        },
      },
      select: {
        id: true,
        value: true,
      },
    });

    const tagValueById = new Map(categories.map((category) => [category.id, category.value]));

    return events.map(({ tagIds: eventTagIds, ...event }) => ({
      ...event,
      tags: (eventTagIds ?? []).map((id) => ({
        id,
        value: tagValueById.get(id) ?? null,
      })),
    }));
  }

  async approveEvent(id: string): Promise<any> {
    const existing = await this.prisma.event.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Event not found: ${id}`);
    }

    const updated = await this.prisma.event.update({
      where: { id },
      data: { status: EventStatus.ACTIVE },
    });

    this.logger.log(`Admin action: approveEvent target=${id}`);
    return updated;
  }

  async cancelEvent(id: string): Promise<any> {
    const existing = await this.prisma.event.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Event not found: ${id}`);
    }

    const updated = await this.prisma.event.update({
      where: { id },
      data: { status: EventStatus.CANCELLED },
    });

    this.logger.log(`Admin action: cancelEvent target=${id}`);
    return updated;
  }

  async getDashboardOverview(): Promise<any> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalUsers,
      activeUsers,
      newUsersThisMonth,
      totalOrganizations,
      approvedOrganizations,
      suspendedOrganizations,
      pendingOrganizations,
      totalJobs,
      activeJobs,
      draftJobs,
      closedJobs,
      totalApplications,
      applicationsThisMonth,
      totalCampaigns,
      activeCampaigns,
      pendingCampaigns,
      totalEvents,
      activeEvents,
      cancelledEvents,
    ] = await this.prisma.$transaction([
      this.prisma.profile.count(),
      this.prisma.profile.count({ where: { isActive: true } }),
      this.prisma.profile.count({ where: { createdAt: { gte: startOfMonth } } }),
      this.prisma.organization.count({ where: { isDeleted: false } }),
      this.prisma.organization.count({ where: { isDeleted: false, isApproved: true } }),
      this.prisma.organization.count({ where: { isDeleted: false, isSuspended: true } }),
      this.prisma.organization.count({ where: { isDeleted: false, isApproved: false, isSuspended: false } }),
      this.prisma.job.count(),
      this.prisma.job.count({ where: { status: JobStatus.ACTIVE } }),
      this.prisma.job.count({ where: { status: JobStatus.DRAFT } }),
      this.prisma.job.count({
        where: {
          status: {
            in: [JobStatus.CLOSED, JobStatus.EXPIRED, JobStatus.ARCHIVED],
          },
        },
      }),
      this.prisma.application.count(),
      this.prisma.application.count({ where: { appliedAt: { gte: startOfMonth } } }),
      this.prisma.campaign.count(),
      this.prisma.campaign.count({ where: { status: CampaignStatus.ACTIVE } }),
      this.prisma.campaign.count({ where: { status: CampaignStatus.PENDING_APPROVAL } }),
      this.prisma.event.count(),
      this.prisma.event.count({ where: { status: EventStatus.ACTIVE } }),
      this.prisma.event.count({ where: { status: EventStatus.CANCELLED } }),
    ]);

    return {
      users: {
        total: totalUsers,
        active: activeUsers,
        newThisMonth: newUsersThisMonth,
      },
      organizations: {
        total: totalOrganizations,
        approved: approvedOrganizations,
        suspended: suspendedOrganizations,
        pendingApproval: pendingOrganizations,
      },
      jobs: {
        total: totalJobs,
        active: activeJobs,
        draft: draftJobs,
        closed: closedJobs,
      },
      applications: {
        total: totalApplications,
        thisMonth: applicationsThisMonth,
      },
      campaigns: {
        total: totalCampaigns,
        active: activeCampaigns,
        pendingApproval: pendingCampaigns,
      },
      events: {
        total: totalEvents,
        active: activeEvents,
        cancelled: cancelledEvents,
      },
    };
  }

  async getFeedHealth(): Promise<any> {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      feedServiceReachable: true,
    };
  }

  private async isAdminUser(userId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    return user?.role === 'ADMIN';
  }
}
