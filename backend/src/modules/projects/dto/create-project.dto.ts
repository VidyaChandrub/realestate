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
  ValidateNested,
} from 'class-validator';
import { AmenityDto } from './amenity.dto';
import {
  PROJECT_CURRENCY_VALUES,
  PROJECT_STATUS_VALUES,
} from './list-projects-query.dto';

export class CreateProjectDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  location?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  reraId?: string;

  // Free text ("Dec 2027"), not a date — matches what the form collects.
  @IsOptional()
  @IsString()
  @MaxLength(120)
  possession?: string;

  // FK to an org user (verified server-side to belong to the caller's org).
  @IsOptional()
  @IsUUID()
  managerId?: string;

  @IsOptional()
  @IsIn(PROJECT_STATUS_VALUES)
  status?: (typeof PROJECT_STATUS_VALUES)[number];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  priceMin?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  priceMax?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  baseRate?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100000)
  landArea?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(10000)
  towerCount?: number;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  floorsDescription?: string;

  // Free-text carpet-area range for the whole project ("640 – 1,850 sqft").
  @IsOptional()
  @IsString()
  @MaxLength(120)
  carpetRange?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => AmenityDto)
  amenities?: AmenityDto[];

  // --- Wizard Steps 1-2 identity & timeline. Optional free text; the
  // project-type label is copied from the org catalog, not referenced. ---
  @IsOptional()
  @IsString()
  @MaxLength(120)
  projectType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  tagline?: string;

  // ISO "YYYY-MM-DD" from an <input type="date">. Stored as text — see the
  // schema comment; anything longer is not a date.
  @IsOptional()
  @IsString()
  @MaxLength(10)
  launchDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  constructionStage?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  highlights?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  salesTeam?: string;

  // --- Onboarding-wizard fields (Steps 3-8). All optional; `specifications`
  // and `marketing` are deliberately loose preference blobs — validated only
  // as objects, their inner shape is expected to evolve. ---

  // Step 3 — pricing & payment
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  bookingAmount?: number;

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
  paymentPlan?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  offers?: string;

  // Step 4 — location & connectivity
  @IsOptional()
  @IsString()
  @MaxLength(500)
  addressLine?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  locality?: string;

  // Kept as text — leading zeros matter, and formats vary by country.
  @IsOptional()
  @IsString()
  @MaxLength(20)
  pincode?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @MaxLength(120, { each: true })
  connectivity?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  landmarks?: string;

  // Step 5 — specifications blob: { items: [{ label, value }], notes }.
  // Projects created before the dynamic-rows rework hold the original
  // fixed-key shape ({ flooring, kitchen, doorsWindows, fittings, notes });
  // both are accepted, and the client normalises on read.
  @IsOptional()
  @IsObject()
  specifications?: Record<string, unknown>;

  // Step 6 — marketing blob: { adSources, monthlyBudget, targetCpl, leadGoal,
  // landingPageChoice, aiCallingEnabled, whatsappWelcomeEnabled,
  // roundRobinEnabled, aiKnowledgeBaseEnabled }
  @IsOptional()
  @IsObject()
  marketing?: Record<string, unknown>;

  // Step 7 — access toggles (assigned agents go through PUT :id/sales-agents)
  @IsOptional()
  @IsBoolean()
  requireBookingApproval?: boolean;

  @IsOptional()
  @IsBoolean()
  visibleToTelecallers?: boolean;

  @IsOptional()
  @IsBoolean()
  publishedToWebsite?: boolean;

  // Step 8 — documents & media (R2 public URLs)
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  coverImageUrl?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @MaxLength(2048, { each: true })
  galleryUrls?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  brochureUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  reraCertificateUrl?: string;

  // Overall project floor / site plans. Not to be confused with
  // UnitType.floorPlanUrl, which is per-configuration.
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(2048, { each: true })
  floorPlanUrls?: string[];
}
