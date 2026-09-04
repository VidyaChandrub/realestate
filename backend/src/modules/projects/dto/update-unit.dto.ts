import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { UNIT_STATUS_VALUES } from './create-unit.dto';
import type { UnitStatusValue } from './create-unit.dto';

export class UpdateUnitDto {
  // A `unit_type` catalog label — validated server-side when present. Can be
  // changed, but not cleared (a unit always has a configuration).
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  configuration?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  variantLabel?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1000000)
  carpetSqft?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1000000)
  builtupSqft?: number | null;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  unitNo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  tower?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(-20)
  @Max(300)
  floor?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  facing?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  parking?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  price?: number | null;

  @IsOptional()
  @IsIn(UNIT_STATUS_VALUES)
  status?: UnitStatusValue;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  addressLine?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  ownerName?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string | null;

  @IsOptional()
  @IsUrl({ require_protocol: true })
  @MaxLength(2048)
  floorPlanUrl?: string | null;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsUrl({ require_protocol: true }, { each: true })
  @MaxLength(2048, { each: true })
  galleryUrls?: string[];
}

export class UpdateUnitStatusDto {
  @IsIn(UNIT_STATUS_VALUES)
  status: UnitStatusValue;
}
