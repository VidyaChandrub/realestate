import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Notification, Prisma } from '@prisma/client';
import { ListNotificationsDto } from '../dto/list-notifications.dto';

@Injectable()
export class NotificationsRepository {
    constructor(private readonly prisma: PrismaService) { }

    async create(data: Prisma.NotificationCreateInput): Promise<Notification> {
        return this.prisma.notification.create({ data });
    }

    async findAll(
        userId: string,
        query: ListNotificationsDto
    ): Promise<{ notifications: Notification[]; total: number; unreadCount: number }> {
        const page = query.page ?? 1;
        const limit = query.limit ?? 20;
        const sortBy = query.sortBy ?? 'createdAt';
        const sortOrder = query.sortOrder ?? 'desc';
        const skip = (page - 1) * limit;

        const metadataTypesFilter: Prisma.NotificationWhereInput =
            query.metadataTypes && query.metadataTypes.length > 0
                ? {
                    OR: query.metadataTypes.map((metadataType) => ({
                        metadata: { path: ['type'], equals: metadataType },
                    })),
                }
                : {};

        const where: Prisma.NotificationWhereInput = {
            userId: userId,
            ...(query.isRead !== undefined ? { isRead: query.isRead } : {}),
            ...(query.type ? { type: query.type } : {}),
            ...metadataTypesFilter,
        };

        const [notifications, total, unreadCount] = await Promise.all([
            this.prisma.notification.findMany({
                where,
                skip,
                take: limit,
                orderBy: { [sortBy as string]: sortOrder },
            }),
            this.prisma.notification.count({ where }),
            this.prisma.notification.count({
                where: {
                    userId: userId,
                    isRead: false,
                    ...metadataTypesFilter,
                },
            }),
        ]);

        return { notifications, total, unreadCount };
    }

    async findOne(id: string): Promise<Notification | null> {
        return this.prisma.notification.findUnique({
            where: { id },
        });
    }

    async update(id: string, data: Prisma.NotificationUpdateInput): Promise<Notification> {
        return this.prisma.notification.update({
            where: { id },
            data,
        });
    }

    async markAllRead(userId: string, metadataTypes?: string[]): Promise<Prisma.BatchPayload> {
        const metadataTypesFilter: Prisma.NotificationWhereInput =
            metadataTypes && metadataTypes.length > 0
                ? {
                    OR: metadataTypes.map((metadataType) => ({
                        metadata: { path: ['type'], equals: metadataType },
                    })),
                }
                : {};

        return this.prisma.notification.updateMany({
            where: {
                userId: userId,
                isRead: false,
                ...metadataTypesFilter,
            },
            data: {
                isRead: true,
            },
        });
    }
}
