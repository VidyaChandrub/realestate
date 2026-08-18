import { NotificationType, EntityType } from '@prisma/client';

export class NotificationEntity {
    id: string;
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    entityType: EntityType;
    entityId?: string | null;
    isRead: boolean;
    metadata?: any | null;
    createdAt: Date;
    updatedAt: Date;

    constructor(partial: Partial<NotificationEntity>) {
        Object.assign(this, partial);
    }
}
