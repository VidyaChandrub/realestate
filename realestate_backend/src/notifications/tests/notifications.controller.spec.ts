import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsController } from '../controllers/notifications.controller';
import { NotificationsService } from '../services/notifications.service';
import { NotificationType, EntityType } from '@prisma/client';

describe('NotificationsController', () => {
    let controller: NotificationsController;
    let service: NotificationsService;

    const mockNotification = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        userId: 'user-1',
        type: NotificationType.INFO,
        title: 'Test Title',
        message: 'Test Message',
        entityType: EntityType.SYSTEM,
        isRead: false,
        createdAt: new Date(),
        updatedAt: new Date(),
    };

    const mockService = {
        findAll: jest.fn(),
        markAsRead: jest.fn(),
        markAllRead: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [NotificationsController],
            providers: [
                {
                    provide: NotificationsService,
                    useValue: mockService,
                },
            ],
        }).compile();

        controller = module.get<NotificationsController>(NotificationsController);
        service = module.get<NotificationsService>(NotificationsService);
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    describe('findAll', () => {
        it('should return paginated notifications', async () => {
            const req = { user: { userId: 'user-1' } };
            const query = { page: 1, limit: 20 };
            const serviceResult = {
                notifications: [mockNotification],
                total: 1,
                unreadCount: 1,
            };

            mockService.findAll.mockResolvedValue(serviceResult);

            const result = await controller.findAll(req, query as any);

            expect(result).toEqual({
                notifications: serviceResult.notifications,
                total: 1,
                unreadCount: 1,
                page: 1,
                limit: 20,
                totalPages: 1,
            });
            expect(service.findAll).toHaveBeenCalledWith('user-1', query);
        });
    });

    describe('markAllRead', () => {
        it('should mark all notifications as read', async () => {
            const req = { user: { userId: 'user-1' } };
            mockService.markAllRead.mockResolvedValue({ count: 5 });

            const result = await controller.markAllRead(req);

            expect(result).toEqual({ count: 5 });
            expect(service.markAllRead).toHaveBeenCalledWith('user-1');
        });
    });

    describe('markAsRead', () => {
        it('should mark a notification as read', async () => {
            const req = { user: { userId: 'user-1' } };
            const id = '123e4567-e89b-12d3-a456-426614174000';
            mockService.markAsRead.mockResolvedValue({ ...mockNotification, isRead: true });

            const result = await controller.markAsRead(req, id);

            expect(result.isRead).toBe(true);
            expect(service.markAsRead).toHaveBeenCalledWith(id, 'user-1');
        });
    });
});
