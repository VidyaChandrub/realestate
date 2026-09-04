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

export const UNIT_STATUS_VALUES = [
  'available',
  'booked',
  'held',
  'sold',
] as const;
export type UnitStatusValue = (typeof UNIT_STATUS_VALUES)[number];

export class CreateUnitDto {
  // The unit's configuration — a `unit_type` catalog label ("2 BHK",
  // "Villa"). Required. Validated server-side against the caller's org
  // catalog (the UI restricting it is not trusted).
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  configuration: string;

  // Optional free-text variant label ("Type A"). Not a catalog, not a
  // lookup — just a string stored on the unit.
  @IsOptional()
  @IsString()
  @MaxLength(120)
  variantLabel?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  unitNo: string;

  // The unit carries its own areas.
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1000000)
  carpetSqft?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1000000)
  builtupSqft?: number;

  // Optional — projects without towers (villas, plots) leave this blank.
  @IsOptional()
  @IsString()
  @MaxLength(40)
  tower?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(-20)
  @Max(300)
  floor?: number;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  facing?: string;

  // Free text as entered on the form ("1 covered", "2 covered", "Open").
  @IsOptional()
  @IsString()
  @MaxLength(40)
  parking?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  price?: number;

  @IsOptional()
  @IsIn(UNIT_STATUS_VALUES)
  status?: UnitStatusValue;

  // --- Standalone-listing fields (ignored for project units by the UI, but
  // accepted here so the same DTO serves both paths). ---
  @IsOptional()
  @IsString()
  @MaxLength(500)
  addressLine?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  ownerName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  // --- Media (public R2 URLs from POST /org/projects/upload-url). ---
  @IsOptional()
  @IsUrl({ require_protocol: true })
  @MaxLength(2048)
  floorPlanUrl?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsUrl({ require_protocol: true }, { each: true })
  @MaxLength(2048, { each: true })
  galleryUrls?: string[];
}
