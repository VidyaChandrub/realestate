import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

// Media URLs — public R2 URLs produced by POST /org/projects/upload-url.
// Stored as-is (plain string columns); the upload endpoint is what enforces
// type/size/org-scoping, not this.
export class CreateUnitTypeDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  name: string;

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

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  price?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1000000)
  totalUnits?: number;

  @IsOptional()
  @IsUrl({ require_protocol: true })
  @MaxLength(2048)
  floorPlanUrl?: string;

  @IsOptional()
  @IsUrl({ require_protocol: true })
  @MaxLength(2048)
  brochureUrl?: string;

  @IsOptional()
  @IsUrl({ require_protocol: true })
  @MaxLength(2048)
  videoUrl?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @IsUrl({ require_protocol: true }, { each: true })
  galleryUrls?: string[];
}
