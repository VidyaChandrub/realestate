import { Test, TestingModule } from '@nestjs/testing';
import { ApplicationsController } from '../../api/applications.controller';
import { ApplicationsService } from '../services/applications.service';
import { ApplicationStatus, UserRole } from '@prisma/client';

describe('ApplicationsController', () => {
    let controller: ApplicationsController;
    let service: ApplicationsService;

    const mockApplication = {
        id: 'app-123',
        jobId: 'job-123',
        userId: 'user-123',
        coverNote: 'I am interested',
        status: ApplicationStatus.SUBMITTED,
        appliedAt: new Date(),
        updatedAt: new Date(),
    };

    const mockRequest = {
        user: {
            userId: 'user-123',
            role: UserRole.USER,
        },
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [ApplicationsController],
            providers: [
                {
                    provide: ApplicationsService,
                    useValue: {
                        create: jest.fn(),
                        findAll: jest.fn(),
                        findOne: jest.fn(),
                        findByJob: jest.fn(),
                        update: jest.fn(),
                        remove: jest.fn(),
                    },
                },
            ],
        }).compile();

        controller = module.get<ApplicationsController>(ApplicationsController);
        service = module.get<ApplicationsService>(ApplicationsService);
    });

    describe('create', () => {
        it('should create an application', async () => {
            jest.spyOn(service, 'create').mockResolvedValue(mockApplication);

            const result = await controller.create(
                { jobId: 'job-123', coverNote: 'I am interested' },
                mockRequest as any
            );

            expect(result).toEqual(mockApplication);
            expect(service.create).toHaveBeenCalledWith(
                { jobId: 'job-123', coverNote: 'I am interested' },
                'user-123',
                UserRole.USER
            );
        });
    });

    describe('findAll', () => {
        it('should return list of applications', async () => {
            const mockResult = {
                applications: [mockApplication],
                total: 1,
            };
            jest.spyOn(service, 'findAll').mockResolvedValue(mockResult);

            const result = await controller.findAll({}, mockRequest as any);

            expect(result).toEqual(mockResult);
            expect(service.findAll).toHaveBeenCalled();
        });
    });

    describe('findOne', () => {
        it('should return a single application', async () => {
            jest.spyOn(service, 'findOne').mockResolvedValue(mockApplication);

            const result = await controller.findOne('app-123', mockRequest as any);

            expect(result).toEqual(mockApplication);
            expect(service.findOne).toHaveBeenCalledWith('app-123', 'user-123', UserRole.USER);
        });
    });

    describe('update', () => {
        it('should update application status', async () => {
            const updatedApplication = {
                ...mockApplication,
                status: ApplicationStatus.VIEWED,
            };
            jest.spyOn(service, 'update').mockResolvedValue(updatedApplication);

            const result = await controller.update(
                'app-123',
                { status: ApplicationStatus.VIEWED },
                { user: { userId: 'employer-123', role: UserRole.EMPLOYER } } as any
            );

            expect(result.status).toBe(ApplicationStatus.VIEWED);
        });
    });

    describe('remove', () => {
        it('should delete an application', async () => {
            jest.spyOn(service, 'remove').mockResolvedValue(undefined);

            const result = await controller.remove('app-123', mockRequest as any);

            expect(result).toEqual({ message: 'Application deleted successfully' });
            expect(service.remove).toHaveBeenCalledWith('app-123', 'user-123', UserRole.USER);
        });
    });

    describe('findByJob', () => {
        it('should return applications for a job', async () => {
            jest.spyOn(service, 'findByJob').mockResolvedValue([mockApplication]);

            const result = await controller.findByJob(
                'job-123',
                { user: { userId: 'employer-123', role: UserRole.EMPLOYER } } as any
            );

            expect(result).toEqual([mockApplication]);
            expect(service.findByJob).toHaveBeenCalledWith('job-123', 'employer-123', UserRole.EMPLOYER);
        });
    });
});
