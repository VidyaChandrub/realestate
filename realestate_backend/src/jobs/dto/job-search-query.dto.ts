import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsNumber, Min, IsUUID, IsEnum, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';
import { JobStatus, JobType, JobWorkMode } from '@prisma/client';

export class JobSearchQueryDto {
    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    q?: string;

    @ApiPropertyOptional({ format: 'uuid' })
    @IsOptional()
    @IsUUID()
    locationId?: string;

    @ApiPropertyOptional({ format: 'uuid' })
    @IsOptional()
    @IsUUID()
    categoryId?: string;

    @ApiPropertyOptional({ format: 'uuid' })
    @IsOptional()
    @IsUUID()
    experienceLevelId?: string;

    @ApiPropertyOptional({ enum: JobWorkMode, enumName: 'JobWorkMode' })
    @IsOptional()
    @IsEnum(JobWorkMode)
    workMode?: JobWorkMode;

    @ApiPropertyOptional()
    @IsOptional()
    @IsNumber()
    @Min(0)
    @Type(() => Number)
    experienceMonths?: number;

    @ApiPropertyOptional({ format: 'uuid' })
    @IsOptional()
    @IsUUID()
    employmentTypeId?: string;

    @ApiPropertyOptional({ enum: JobStatus, enumName: 'JobStatus' })
    @IsOptional()
    @IsEnum(JobStatus)
    status?: JobStatus;

    @ApiPropertyOptional({ enum: JobType, enumName: 'JobType' })
    @IsOptional()
    @IsEnum(JobType)
    jobType?: JobType;

    @ApiPropertyOptional({ format: 'date-time' })
    @IsOptional()
    @IsDateString()
    asOf?: string;

    @ApiPropertyOptional({ format: 'date' })
    @IsOptional()
    @IsDateString()
    startDate?: string;

    @ApiPropertyOptional({ format: 'date' })
    @IsOptional()
    @IsDateString()
    endDate?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    organizationId?: string;

    @ApiPropertyOptional({ default: 1 })
    @IsOptional()
    @IsNumber()
    @Min(1)
    @Type(() => Number)
    page?: number = 1;

    @ApiPropertyOptional({ default: 20 })
    @IsOptional()
    @IsNumber()
    @Min(1)
    @Type(() => Number)
    limit?: number = 20;
}
