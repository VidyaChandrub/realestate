import { Test, TestingModule } from '@nestjs/testing';
import { ApplicationsService } from '../services/applications.service';
import { ApplicationsRepository } from '../repositories/applications.repository';
import { JobsService } from '../../jobs/services/jobs.service';
import { PrismaService } from '../prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ApplicationStatus, JobStatus, UserRole } from '@prisma/client';
import { InvalidApplicationException } from '../exceptions/invalid-application.exception';
import { UnauthorizedApplicationException } from '../exceptions/unauthorized-application.exception';
import { ApplicationNotFoundException } from '../exceptions/application-not-found.exception';

describe('ApplicationsService', () => {
    let service: ApplicationsService;
    let repository: ApplicationsRepository;
    let jobsService: JobsService;
    let prisma: PrismaService;

    const mockApplication = {
        id: 'app-123',
        jobId: 'job-123',
        userId: 'user-123',
        coverNote: 'I am interested',
        status: ApplicationStatus.SUBMITTED,
        appliedAt: new Date(),
        updatedAt: new Date(),
    };

    const mockJob = {
        id: 'job-123',
        organizationId: 'org-123',
        title: 'Software Engineer',
        status: JobStatus.ACTIVE,
        description: 'Test job',
        summary: null,
        location: null,
        state: null,
        experienceRequired: null,
        salaryMin: null,
        salaryMax: null,
        employmentType: null,
        publishedAt: null,
        expiresAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        backgroundImage: null,
    };

    const mockProfile = {
        id: 'profile-123',
        userId: 'user-123',
        fullName: 'John Doe',
        profileCompletionPercentage: 80,
        gender: null,
        state: null,
        city: null,
        education: null,
        experienceLevel: null,
        createdAt: new Date(),
        updatedAt: new Date(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ApplicationsService,
                {
                    provide: ApplicationsRepository,
                    useValue: {
                        create: jest.fn(),
                        findAll: jest.fn(),
                        findOne: jest.fn(),
                        findByUserAndJob: jest.fn(),
                        update: jest.fn(),
                        delete: jest.fn(),
                    },
                },
                {
                    provide: JobsService,
                    useValue: {
                        findOne: jest.fn(),
                    },
                },
                {
                    provide: PrismaService,
                    useValue: {
                        profile: {
                            findUnique: jest.fn(),
                        },
                        employerUser: {
                            findUnique: jest.fn(),
                        },
                    },
                },
                {
                    provide: EventEmitter2,
                    useValue: {
                        emit: jest.fn(),
                    },
                },
            ],
        }).compile();

        service = module.get<ApplicationsService>(ApplicationsService);
        repository = module.get<ApplicationsRepository>(ApplicationsRepository);
        jobsService = module.get<JobsService>(JobsService);
        prisma = module.get<PrismaService>(PrismaService);
    });

    describe('create', () => {
        it('should create an application successfully', async () => {
            jest.spyOn(prisma.profile, 'findUnique').mockResolvedValue(mockProfile);
            jest.spyOn(jobsService, 'findOne').mockResolvedValue(mockJob);
            jest.spyOn(repository, 'findByUserAndJob').mockResolvedValue(null);
            jest.spyOn(repository, 'create').mockResolvedValue(mockApplication);

            const result = await service.create(
                { jobId: 'job-123', coverNote: 'I am interested' },
                'user-123',
                UserRole.USER
            );

            expect(result).toEqual(mockApplication);
            expect(repository.create).toHaveBeenCalled();
        });

        it('should throw error if user is not USER role', async () => {
            await expect(
                service.create(
                    { jobId: 'job-123' },
                    'employer-123',
                    UserRole.EMPLOYER
                )
            ).rejects.toThrow(UnauthorizedApplicationException);
        });

        it('should throw error if job is not ACTIVE', async () => {
            jest.spyOn(prisma.profile, 'findUnique').mockResolvedValue(mockProfile);
            jest.spyOn(jobsService, 'findOne').mockResolvedValue({
                ...mockJob,
                status: JobStatus.DRAFT,
            });

            await expect(
                service.create(
                    { jobId: 'job-123' },
                    'user-123',
                    UserRole.USER
                )
            ).rejects.toThrow(InvalidApplicationException);
        });

        it('should throw error if user already applied', async () => {
            jest.spyOn(prisma.userProfile, 'findUnique').mockResolvedValue(mockProfile);
            jest.spyOn(jobsService, 'findOne').mockResolvedValue(mockJob);
            jest.spyOn(repository, 'findByUserAndJob').mockResolvedValue(mockApplication);

            await expect(
                service.create(
                    { jobId: 'job-123' },
                    'user-123',
                    UserRole.USER
                )
            ).rejects.toThrow(InvalidApplicationException);
        });

        it('should throw error if profile is incomplete', async () => {
            jest.spyOn(prisma.profile, 'findUnique').mockResolvedValue({
                ...mockProfile,
                profileCompletionPercentage: 30,
            });

            await expect(
                service.create(
                    { jobId: 'job-123' },
                    'user-123',
                    UserRole.USER
                )
            ).rejects.toThrow(InvalidApplicationException);
        });
    });

    describe('update', () => {
        it('should update application status successfully', async () => {
            jest.spyOn(repository, 'findOne').mockResolvedValue(mockApplication);
            jest.spyOn(jobsService, 'findOne').mockResolvedValue(mockJob);
            jest.spyOn(prisma.employerUser, 'findUnique').mockResolvedValue({
                id: 'emp-user-123',
                userId: 'employer-123',
                organizationId: 'org-123',
                role: 'OWNER' as any,
                createdAt: new Date(),
            });
            jest.spyOn(repository, 'update').mockResolvedValue({
                ...mockApplication,
                status: ApplicationStatus.VIEWED,
            });

            const result = await service.update(
                'app-123',
                { status: ApplicationStatus.VIEWED },
                'employer-123',
                UserRole.EMPLOYER
            );

            expect(result.status).toBe(ApplicationStatus.VIEWED);
        });

        it('should throw error for invalid status transition', async () => {
            jest.spyOn(repository, 'findOne').mockResolvedValue({
                ...mockApplication,
                status: ApplicationStatus.HIRED,
            });
            jest.spyOn(jobsService, 'findOne').mockResolvedValue(mockJob);
            jest.spyOn(prisma.employerUser, 'findUnique').mockResolvedValue({
                id: 'emp-user-123',
                userId: 'employer-123',
                organizationId: 'org-123',
                role: 'OWNER' as any,
                createdAt: new Date(),
            });

            await expect(
                service.update(
                    'app-123',
                    { status: ApplicationStatus.SUBMITTED },
                    'employer-123',
                    UserRole.EMPLOYER
                )
            ).rejects.toThrow(InvalidApplicationException);
        });

        it('should throw error if user is not employer', async () => {
            await expect(
                service.update(
                    'app-123',
                    { status: ApplicationStatus.VIEWED },
                    'user-123',
                    UserRole.USER
                )
            ).rejects.toThrow(UnauthorizedApplicationException);
        });
    });

    describe('findOne', () => {
        it('should return application for owner', async () => {
            jest.spyOn(repository, 'findOne').mockResolvedValue(mockApplication);

            const result = await service.findOne('app-123', 'user-123', UserRole.USER);

            expect(result).toEqual(mockApplication);
        });

        it('should throw error if application not found', async () => {
            jest.spyOn(repository, 'findOne').mockResolvedValue(null);

            await expect(
                service.findOne('app-123', 'user-123', UserRole.USER)
            ).rejects.toThrow(ApplicationNotFoundException);
        });

        it('should throw error if user tries to view others application', async () => {
            jest.spyOn(repository, 'findOne').mockResolvedValue(mockApplication);

            await expect(
                service.findOne('app-123', 'other-user', UserRole.USER)
            ).rejects.toThrow(UnauthorizedApplicationException);
        });
    });
});
