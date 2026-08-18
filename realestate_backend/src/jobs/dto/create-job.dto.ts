import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
    IsArray,
    IsDateString,
    IsEnum,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsString,
    IsUUID,
    IsUrl,
    Min,
    ValidateNested,
} from 'class-validator';
import { JobStatus, JobType, JobWorkMode } from '@prisma/client';

export class JobSkillDto {
    @ApiPropertyOptional({ format: 'uuid' })
    @IsUUID()
    @IsNotEmpty()
    masterDataId: string;
}

export class JobEducationQualificationDto {
    @ApiPropertyOptional({ format: 'uuid' })
    @IsUUID()
    @IsNotEmpty()
    masterDataId: string;
}

export class CreateJobDto {
    @ApiPropertyOptional()
    @IsString()
    @IsNotEmpty()
    title: string;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    description?: string;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    summary?: string;

    @ApiPropertyOptional({ format: 'uuid' })
    @IsUUID()
    @IsOptional()
    categoryId?: string;

    @ApiPropertyOptional({ format: 'uuid' })
    @IsUUID()
    @IsOptional()
    locationId?: string;

    @ApiPropertyOptional()
    @IsNumber()
    @Min(0)
    @IsOptional()
    @Type(() => Number)
    minExperienceMonths?: number;

    @ApiPropertyOptional()
    @IsNumber()
    @Min(0)
    @IsOptional()
    @Type(() => Number)
    maxExperienceMonths?: number;

    @ApiPropertyOptional({ format: 'uuid' })
    @IsUUID()
    @IsOptional()
    experienceLevelId?: string;

    @ApiPropertyOptional({ format: 'uuid' })
    @IsUUID()
    @IsOptional()
    educationLevelId?: string;

    @ApiPropertyOptional({ enum: JobWorkMode, enumName: 'JobWorkMode' })
    @IsEnum(JobWorkMode)
    @IsOptional()
    workMode?: JobWorkMode;

    @ApiPropertyOptional()
    @IsNumber()
    @Min(0)
    @IsOptional()
    @Type(() => Number)
    salaryMin?: number;

    @ApiPropertyOptional()
    @IsNumber()
    @Min(0)
    @IsOptional()
    @Type(() => Number)
    salaryMax?: number;

    @ApiPropertyOptional({ format: 'uuid' })
    @IsUUID()
    @IsOptional()
    employmentTypeId?: string;

    @ApiPropertyOptional({ enum: JobType, enumName: 'JobType' })
    @IsEnum(JobType)
    @IsOptional()
    jobType?: JobType;

    @ApiPropertyOptional({ format: 'url' })
    @IsUrl()
    @IsOptional()
    externalUrl?: string;

    @ApiPropertyOptional({ enum: JobStatus, enumName: 'JobStatus' })
    @IsEnum(JobStatus)
    @IsOptional()
    status?: JobStatus;

    @ApiPropertyOptional({ format: 'date-time' })
    @IsDateString()
    @IsOptional()
    publishedAt?: string;

    @ApiPropertyOptional({ format: 'date-time' })
    @IsDateString()
    @IsOptional()
    expiresAt?: string;

    @ApiPropertyOptional({ format: 'url' })
    @IsUrl()
    @IsOptional()
    backgroundImage?: string;

    @ApiPropertyOptional({ type: [JobSkillDto] })
    @IsArray()
    @IsOptional()
    @ValidateNested({ each: true })
    @Type(() => JobSkillDto)
    skills?: JobSkillDto[];

    @ApiPropertyOptional({ type: [JobEducationQualificationDto] })
    @IsArray()
    @IsOptional()
    @ValidateNested({ each: true })
    @Type(() => JobEducationQualificationDto)
    educationQualifications?: JobEducationQualificationDto[];

    @ApiPropertyOptional({ type: [String], format: 'uuid' })
    @IsArray()
    @IsOptional()
    @IsUUID('4', { each: true })
    specializationIds?: string[];
}
