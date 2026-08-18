import { IsOptional, IsString, IsNumber, Min, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { ApplicationStatus } from '@prisma/client';

export class ListApplicationsDto {
    @IsOptional()
    @IsString()
    jobId?: string;

    @IsString()
    @IsOptional()
    userId?: string;

    @IsOptional()
    @IsEnum(ApplicationStatus)
    status?: ApplicationStatus;

    @IsOptional()
    @IsNumber()
    @Min(1)
    @Type(() => Number)
    page?: number = 1;

    @IsOptional()
    @IsNumber()
    @Min(1)
    @Type(() => Number)
    limit?: number = 20;
}
