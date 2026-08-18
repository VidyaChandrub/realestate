import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { NotificationType, EntityType } from '@prisma/client';

export class CreateNotificationDto {
    @ApiProperty({ description: 'User ID of the recipient' })
    @IsString()
    @IsNotEmpty()
    userId: string;

    @ApiProperty({ enum: NotificationType, description: 'Type of notification' })
    @IsEnum(NotificationType)
    type: NotificationType;

    @ApiProperty({ description: 'Title of the notification' })
    @IsString()
    @IsNotEmpty()
    title: string;

    @ApiProperty({ description: 'Message content of the notification' })
    @IsString()
    @IsNotEmpty()
    message: string;

    @ApiProperty({ enum: EntityType, description: 'Type of entity this notification relates to' })
    @IsEnum(EntityType)
    entityType: EntityType;

    @ApiPropertyOptional({ description: 'ID of the related entity (e.g., Job ID, Application ID)' })
    @IsUUID()
    @IsOptional()
    entityId?: string;

    @ApiPropertyOptional({ description: 'Additional metadata as JSON' })
    @IsOptional()
    metadata?: any;
}
