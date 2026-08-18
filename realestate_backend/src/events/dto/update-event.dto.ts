// src/events/dto/update-event.dto.ts
import { PartialType } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { EventStatus } from '@prisma/client';
import { CreateEventDto } from './create-event.dto';

export class UpdateEventDto extends PartialType(CreateEventDto) {
    @ApiPropertyOptional({ enum: EventStatus, description: 'Event status (DRAFT, ACTIVE, CANCELLED, COMPLETED)' })
    @IsEnum(EventStatus)
    @IsOptional()
    status?: EventStatus;
}
