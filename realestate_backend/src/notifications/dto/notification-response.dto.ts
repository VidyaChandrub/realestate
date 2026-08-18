import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NotificationType, EntityType } from '@prisma/client';

export class NotificationResponseDto {
    @ApiProperty()
    id: string;

    @ApiProperty()
    userId: string;

    @ApiProperty({ enum: NotificationType })
    type: NotificationType;

    @ApiProperty()
    title: string;

    @ApiProperty()
    message: string;

    @ApiProperty({ enum: EntityType })
    entityType: EntityType;

    @ApiPropertyOptional()
    entityId?: string | null;

    @ApiProperty()
    isRead: boolean;

    @ApiPropertyOptional()
    metadata?: any;

    @ApiProperty()
    createdAt: Date;

    @ApiProperty()
    updatedAt: Date;
}

export class PaginatedNotificationsResponseDto {
    @ApiProperty({ type: [NotificationResponseDto] })
    notifications: NotificationResponseDto[];

    @ApiProperty()
    total: number;

    @ApiProperty()
    unreadCount: number;

    @ApiProperty()
    page: number;

    @ApiProperty()
    limit: number;

    @ApiProperty()
    totalPages: number;
}
