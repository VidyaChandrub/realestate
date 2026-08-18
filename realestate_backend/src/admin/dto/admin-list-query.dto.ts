import { IsOptional, IsInt, Min, IsString, IsUUID, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

export class AdminListQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) limit?: number = 20;
  @IsOptional() @IsString() q?: string;
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsString() jobType?: string;
  @IsOptional() @IsString() role?: string;
  @IsOptional() @IsString() isActive?: string;
  @IsOptional() @IsUUID() organizationId?: string;
  @IsOptional() @IsDateString() startDate?: string;
  @IsOptional() @IsDateString() endDate?: string;
  @IsOptional() @IsString() registrationType?: string;
  @IsOptional() @IsString() mode?: string;
  @IsOptional() @IsUUID() cityId?: string;
  @IsOptional() @IsUUID() stateId?: string;
  @IsOptional() @IsUUID() educationId?: string;
}
