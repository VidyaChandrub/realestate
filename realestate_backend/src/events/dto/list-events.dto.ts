// src/events/dto/list-events.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsPositive, IsString, IsUUID, IsDateString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { EventMode, EventStatus } from '@prisma/client';

export class ListEventsDto {
    @ApiPropertyOptional({ description: 'Page number', default: 1 })
    @IsInt()
    @Min(1)
    @IsOptional()
    @Type(() => Number)
    page?: number = 1;

    @ApiPropertyOptional({ description: 'Number of results per page', default: 100 })
    @IsInt()
    @IsPositive()
    @Max(100)
    @IsOptional()
    @Type(() => Number)
    limit?: number = 100;

    @ApiPropertyOptional({ enum: EventStatus, description: 'Filter by event status' })
    @IsEnum(EventStatus)
    @IsOptional()
    status?: EventStatus;

    @ApiPropertyOptional({ enum: EventMode, description: 'Filter by event mode' })
    @IsEnum(EventMode)
    @IsOptional()
    mode?: EventMode;

     @ApiPropertyOptional({ description: 'Search by event title' })
    @IsString()
    @IsOptional()
    search?: string;

    @ApiPropertyOptional({ description: 'Filter by organization ID' })
    @IsUUID()
    @IsOptional()
    organizationId?: string;

    @ApiPropertyOptional({ description: 'Filter events starting on or after this date (ISO 8601)' })
    @IsDateString()
    @IsOptional()
    startDateFrom?: string;

    @ApiPropertyOptional({ description: 'Filter events starting on or before this date (ISO 8601)' })
    @IsDateString()
    @IsOptional()
    startDateTo?: string;
}
