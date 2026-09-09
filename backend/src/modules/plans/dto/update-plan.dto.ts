import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Min,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { PlanLimitsDto } from './plan-limits.dto';
import { IsPlanCapabilityMap } from '../plan-capabilities';

export class UpdatePlanDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  priceMonthly?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  priceYearly?: number;

  /** Marketing bullet points only — not functional. */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  features?: string[];

  /** Numeric quotas; each field is a non-negative int or null (= unlimited). */
  @IsOptional()
  @ValidateNested()
  @Type(() => PlanLimitsDto)
  limits?: PlanLimitsDto;

  /** { <capability catalog key>: boolean }. Unknown keys are rejected. */
  @IsOptional()
  @IsObject()
  @IsPlanCapabilityMap()
  capabilities?: Record<string, boolean>;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsString()
  badge?: string;

  @IsOptional()
  @IsBoolean()
  isPopular?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
