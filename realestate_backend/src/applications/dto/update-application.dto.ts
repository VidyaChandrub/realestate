import { IsEnum, IsOptional } from 'class-validator';
import { ApplicationStatus } from '@prisma/client';

export class UpdateApplicationDto {
    @IsEnum(ApplicationStatus)
    @IsOptional()
    status?: ApplicationStatus;
}
