// src/events/dto/event-response.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EventMode, EventStatus, RegistrationType } from '@prisma/client';

export class EventResponseDto {
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
    registeredCount?: number;

    @ApiPropertyOptional()
    externalClickCount?: number;

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

    @ApiProperty()
    boostScore: number;

    @ApiProperty()
    createdAt: Date;

    @ApiProperty()
    updatedAt: Date;
}

export class PaginatedEventsResponseDto {
    @ApiProperty({ type: [EventResponseDto] })
    events: EventResponseDto[];

    @ApiProperty()
    total: number;

    @ApiProperty()
    page: number;

    @ApiProperty()
    limit: number;

    @ApiProperty()
    totalPages: number;
}
