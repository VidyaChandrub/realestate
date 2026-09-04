import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { AmenityDto } from './amenity.dto';
import {
  PROJECT_CURRENCY_VALUES,
  PROJECT_STATUS_VALUES,
} from './list-projects-query.dto';

// Hand-written partial (the codebase doesn't use @nestjs/mapped-types).
// Every field optional; a field left out is left untouched, an explicit
// null clears the nullable columns.
export class UpdateProjectDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  location?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  reraId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  possession?: string | null;

  // Pass a user id to (re)assign, or explicit null to unassign.
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsUUID()
  managerId?: string | null;

  @IsOptional()
  @IsIn(PROJECT_STATUS_VALUES)
  status?: (typeof PROJECT_STATUS_VALUES)[number];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  priceMin?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  priceMax?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  baseRate?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100000)
  landArea?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(10000)
  towerCount?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  floorsDescription?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  carpetRange?: string | null;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => AmenityDto)
  amenities?: AmenityDto[];

  // --- Onboarding-wizard fields (Steps 3-8). Every field optional; an
  // omitted key is left untouched, an explicit null clears a nullable column
  // (arrays clear to [], blobs to null). ---

  // Step 3
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  bookingAmount?: number | null;

  @IsOptional()
  @IsIn(PROJECT_CURRENCY_VALUES)
  currency?: (typeof PROJECT_CURRENCY_VALUES)[number];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @MaxLength(120, { each: true })
  priceIncludes?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(120)
  paymentPlan?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  offers?: string | null;

  // Step 4
  @IsOptional()
  @IsString()
  @MaxLength(500)
  addressLine?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  city?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  locality?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  pincode?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number | null;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @MaxLength(120, { each: true })
  connectivity?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  landmarks?: string | null;

  // Step 5
  @IsOptional()
  @IsObject()
  specifications?: Record<string, unknown>;

  // Step 6
  @IsOptional()
  @IsObject()
  marketing?: Record<string, unknown>;

  // Step 7
  @IsOptional()
  @IsBoolean()
  requireBookingApproval?: boolean;

  @IsOptional()
  @IsBoolean()
  visibleToTelecallers?: boolean;

  @IsOptional()
  @IsBoolean()
  publishedToWebsite?: boolean;

  // Step 8
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  coverImageUrl?: string | null;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @MaxLength(2048, { each: true })
  galleryUrls?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  brochureUrl?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  reraCertificateUrl?: string | null;
}
