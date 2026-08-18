import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsService } from '../services/notifications.service';
import { NotificationsRepository } from '../repositories/notifications.repository';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { NotificationType, EntityType } from '@prisma/client';
import { NotificationNotFoundException } from '../exceptions/notification-not-found.exception';
import { UnauthorizedNotificationAccessException } from '../exceptions/unauthorized-notification-access.exception';

describe('NotificationsService', () => {
    let service: NotificationsService;
    let repository: NotificationsRepository;
    let eventEmitter: EventEmitter2;

    const mockNotification = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        userId: 'user-1',
        type: NotificationType.INFO,
        title: 'Test Title',
        message: 'Test Message',
        entityType: EntityType.SYSTEM,
        entityId: null,
        isRead: false,
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
    };

    const mockRepository = {
        create: jest.fn(),
        findAll: jest.fn(),
        findOne: jest.fn(),
        update: jest.fn(),
        markAllRead: jest.fn(),
    };

    const mockEventEmitter = {
        emit: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                NotificationsService,
                {
                    provide: NotificationsRepository,
                    useValue: mockRepository,
                },
                {
                    provide: EventEmitter2,
                    useValue: mockEventEmitter,
                },
            ],
        }).compile();

        service = module.get<NotificationsService>(NotificationsService);
        repository = module.get<NotificationsRepository>(NotificationsRepository);
        eventEmitter = module.get<EventEmitter2>(EventEmitter2);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('createNotification', () => {
        it('should create a notification and emit an event', async () => {
            const createDto = {
                userId: 'user-1',
                type: NotificationType.INFO,
                title: 'Test Title',
                message: 'Test Message',
                entityType: EntityType.SYSTEM,
            };

            mockRepository.create.mockResolvedValue(mockNotification);

            const result = await service.createNotification(createDto);

            expect(result).toEqual(mockNotification);
            expect(repository.create).toHaveBeenCalledWith(expect.objectContaining(createDto));
            expect(eventEmitter.emit).toHaveBeenCalledWith('notification.created', mockNotification);
        });
    });

    describe('findAll', () => {
        it('should return paginated notifications', async () => {
            const userId = 'user-1';
            const query = { page: 1, limit: 10 };
            const expectedResult = { notifications: [mockNotification], total: 1, unreadCount: 1 };

            mockRepository.findAll.mockResolvedValue(expectedResult);

            const result = await service.findAll(userId, query as any);

            expect(result).toEqual(expectedResult);
            expect(repository.findAll).toHaveBeenCalledWith(userId, query);
        });
    });

    describe('markAsRead', () => {
        it('should mark a notification as read if owner', async () => {
            const id = '123e4567-e89b-12d3-a456-426614174000';
            const userId = 'user-1';

            mockRepository.findOne.mockResolvedValue(mockNotification);
            mockRepository.update.mockResolvedValue({ ...mockNotification, isRead: true });

            const result = await service.markAsRead(id, userId);

            expect(result.isRead).toBe(true);
            expect(repository.update).toHaveBeenCalledWith(id, { isRead: true });
            expect(eventEmitter.emit).toHaveBeenCalledWith('notification.read', expect.objectContaining({ id }));
        });

        it('should throw NotificationNotFoundException if not found', async () => {
            mockRepository.findOne.mockResolvedValue(null);

            await expect(service.markAsRead('none', 'user-1')).rejects.toThrow(NotificationNotFoundException);
        });

        it('should throw UnauthorizedNotificationAccessException if not owner', async () => {
            mockRepository.findOne.mockResolvedValue(mockNotification);

            await expect(service.markAsRead('123', 'other-user')).rejects.toThrow(UnauthorizedNotificationAccessException);
        });
    });

    describe('markAllRead', () => {
        it('should mark all unread notifications as read', async () => {
            const userId = 'user-1';
            mockRepository.markAllRead.mockResolvedValue({ count: 5 });

            const result = await service.markAllRead(userId);

            expect(result).toEqual({ count: 5 });
            expect(repository.markAllRead).toHaveBeenCalledWith(userId);
            expect(eventEmitter.emit).toHaveBeenCalledWith('notification.read', { userId, count: 5 });
        });
    });
});
