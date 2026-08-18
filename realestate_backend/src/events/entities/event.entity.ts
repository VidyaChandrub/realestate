// src/events/entities/event.entity.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EventMode, EventStatus, RegistrationType } from '@prisma/client';

export class EventEntity {
    @ApiProperty()
    id: string;

    @ApiProperty()
    organizationId: string;

    @ApiProperty()
    title: string;

    @ApiPropertyOptional()
    description?: string;

    @ApiPropertyOptional()
    categoryId?: string;

    @ApiProperty({ enum: EventMode })
    mode: EventMode;

    @ApiPropertyOptional()
    locationId?: string;

    @ApiPropertyOptional()
    meetingUrl?: string;

    @ApiProperty()
    isMeetingUrlPublished: boolean;

    @ApiProperty({ enum: RegistrationType })
    registrationType: RegistrationType;

    @ApiPropertyOptional()
    externalRegistrationUrl?: string;

    @ApiPropertyOptional()
    capacity?: number;

    @ApiPropertyOptional()
    startDate?: Date;

    @ApiPropertyOptional()
    endDate?: Date;

    @ApiProperty({ enum: EventStatus })
    status: EventStatus;

    @ApiPropertyOptional()
    bannerImage?: string;

    @ApiPropertyOptional()
    tagIds?: string[];

    @ApiProperty()
    isFree: boolean;

    @ApiPropertyOptional()
    price?: any;

    @ApiProperty()
    isSponsored: boolean;

    @ApiPropertyOptional()
    sponsorCampaignId?: string;

    @ApiProperty()
    boostScore: number;

    @ApiProperty()
    createdAt: Date;

    @ApiProperty()
    updatedAt: Date;
}
