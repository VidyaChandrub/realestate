import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { NotificationsRepository } from '../repositories/notifications.repository';
import { CreateNotificationDto } from '../dto/create-notification.dto';
import { ListNotificationsDto } from '../dto/list-notifications.dto';
import { NotificationNotFoundException } from '../exceptions/notification-not-found.exception';
import { UnauthorizedNotificationAccessException } from '../exceptions/unauthorized-notification-access.exception';
import { Notification } from '@prisma/client';

@Injectable()
export class NotificationsService {
    private readonly logger = new Logger(NotificationsService.name);

    constructor(
        private readonly notificationsRepository: NotificationsRepository,
        private readonly eventEmitter: EventEmitter2
    ) { }

    /**
     * Internal method to be used by other modules to create notifications
     */
    async createNotification(createDto: CreateNotificationDto): Promise<Notification> {
        this.logger.log(`Creating notification for user: ${createDto.userId}`);

        const notification = await this.notificationsRepository.create({
            userId: createDto.userId,
            type: createDto.type,
            title: createDto.title,
            message: createDto.message,
            entityType: createDto.entityType,
            entityId: createDto.entityId,
            metadata: createDto.metadata || {},
        });

        // Emit internal domain event
        this.eventEmitter.emit('notification.created', notification);

        return notification;
    }

    /**
     * List notifications for an authenticated user
     */
    async findAll(userId: string, query: ListNotificationsDto) {
        return this.notificationsRepository.findAll(userId, query);
    }

    /**
     * Mark a single notification as read
     */
    async markAsRead(id: string, userId: string): Promise<Notification> {
        const notification = await this.notificationsRepository.findOne(id);

        if (!notification) {
            throw new NotificationNotFoundException(id);
        }

        if (notification.userId !== userId) {
            throw new UnauthorizedNotificationAccessException();
        }

        const updated = await this.notificationsRepository.update(id, { isRead: true });
        this.eventEmitter.emit('notification.read', updated);
        return updated;
    }

    /**
     * Mark all notifications as read for a user
     */
    async markAllRead(userId: string, metadataTypes?: string[]): Promise<{ count: number }> {
        const result = await this.notificationsRepository.markAllRead(userId, metadataTypes);
        if (result.count > 0) {
            this.eventEmitter.emit('notification.read', {
                userId: userId,
                count: result.count,
            });
        }
        return { count: result.count };
    }
}
