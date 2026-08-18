// src/events/dto/create-event.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsString,
    IsNotEmpty,
    IsEnum,
    IsOptional,
    IsBoolean,
    IsInt,
    IsPositive,
    IsDateString,
    IsUrl,
    IsDecimal,
    MinLength,
    MaxLength,
    ValidateIf,
    IsArray,
    IsUUID,
} from 'class-validator';
import { EventMode, RegistrationType } from '@prisma/client';
import { Type } from 'class-transformer';

export class CreateEventDto {
    @ApiProperty({ description: 'Title of the event', minLength: 3, maxLength: 200 })
    @IsString()
    @IsNotEmpty()
    @MinLength(3)
    @MaxLength(200)
    title: string;

    @ApiPropertyOptional({ description: 'Detailed description of the event' })
    @IsString()
    @IsOptional()
    description?: string;

    @ApiPropertyOptional({ description: 'Master Data category UUID for event category' })
    @IsUUID()
    @IsOptional()
    categoryId?: string;

    @ApiProperty({ enum: EventMode, description: 'ONLINE or OFFLINE' })
    @IsEnum(EventMode)
    mode: EventMode;

    @ApiPropertyOptional({ description: 'Master Data UUID for location (required for OFFLINE events)' })
    @IsUUID()
    @IsOptional()
    @ValidateIf((o) => o.mode === EventMode.OFFLINE)
    @IsNotEmpty({ message: 'locationId is required for OFFLINE events' })
    locationId?: string;

    @ApiPropertyOptional({ description: 'Meeting URL for online or hybrid events' })
    @IsUrl()
    @IsOptional()
    meetingUrl?: string;

    @ApiPropertyOptional({ description: 'Whether the meeting URL is published for public visibility', default: false })
    @IsBoolean()
    @IsOptional()
    isMeetingUrlPublished?: boolean;

    @ApiProperty({
        enum: RegistrationType,
        description: 'INTERNAL (in-app) or EXTERNAL (redirect to external URL)',
    })
    @IsEnum(RegistrationType)
    registrationType: RegistrationType;

    @ApiPropertyOptional({ description: 'External registration URL (required for EXTERNAL type)' })
    @IsUrl()
    @IsOptional()
    @ValidateIf((o) => o.registrationType === RegistrationType.EXTERNAL)
    @IsNotEmpty({ message: 'External registration URL is required for EXTERNAL registration type' })
    externalRegistrationUrl?: string;

    @ApiPropertyOptional({ description: 'Maximum number of registrations (null = unlimited)' })
    @IsInt()
    @IsPositive()
    @IsOptional()
    @Type(() => Number)
    capacity?: number;

    @ApiPropertyOptional({ description: 'Event start date and time (ISO 8601)' })
    @IsDateString()
    @IsOptional()
    startDate?: string;

    @ApiPropertyOptional({ description: 'Event end date and time (ISO 8601)' })
    @IsDateString()
    @IsOptional()
    endDate?: string;

    @ApiPropertyOptional({ description: 'URL of the event banner image' })
    @IsUrl()
    @IsOptional()
    bannerImage?: string;

    @ApiPropertyOptional({ description: 'Array of Master Data UUID tag IDs for discoverability', type: [String] })
    @IsArray()
    @IsOptional()
    @IsString({ each: true })
    tagIds?: string[];

    @ApiProperty({ description: 'Is the event free?', default: true })
    @IsBoolean()
    isFree: boolean;

    @ApiPropertyOptional({ description: 'Price in INR (required when isFree is false)' })
    @IsOptional()
    @ValidateIf((o) => !o.isFree)
    @IsPositive({ message: 'Price must be a positive number when event is not free' })
    @Type(() => Number)
    price?: number;
}
