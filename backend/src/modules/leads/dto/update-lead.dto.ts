import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  LOOSE_PHONE_NUMBER_MESSAGE,
  OPTIONAL_LOOSE_PHONE_NUMBER_REGEX,
} from '../../../common/utils/phone.util';

/**
 * Full lead edit form (lead edit page). Every field is optional — the client
 * sends the whole form, the service writes only what's present. Contact fields
 * that live in the capture `data` blob (name / phone / email) are carried
 * through `contact` and merged into that JSON; everything else maps to a real
 * column added in 20260910000000_lead_edit_fields_and_activity_actor.
 *
 * Pipeline `status` is deliberately NOT here — it keeps its own note-required
 * path (PATCH /org/leads/:id/assign). `assignedToId` IS accepted so the
 * Assignment card can reassign in the same save.
 */

class LeadContactDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  fullName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  @Matches(OPTIONAL_LOOSE_PHONE_NUMBER_REGEX, {
    message: LOOSE_PHONE_NUMBER_MESSAGE,
  })
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  email?: string;
}

export class UpdateLeadDto {
  // --- Contact (merged into the `data` JSON blob) ---
  @IsOptional()
  @ValidateNested()
  @Type(() => LeadContactDto)
  contact?: LeadContactDto;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  altName?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  @Matches(OPTIONAL_LOOSE_PHONE_NUMBER_REGEX, {
    message: LOOSE_PHONE_NUMBER_MESSAGE,
  })
  altPhone?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  @Matches(OPTIONAL_LOOSE_PHONE_NUMBER_REGEX, {
    message: LOOSE_PHONE_NUMBER_MESSAGE,
  })
  whatsapp?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  city?: string | null;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  @MaxLength(40, { each: true })
  tags?: string[];

  // --- Requirement ---
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(12)
  @IsString({ each: true })
  @MaxLength(40, { each: true })
  configurations?: string[];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  budgetMin?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  budgetMax?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  purpose?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  financing?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  loanStatus?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  timelineToBuy?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  preferredFloor?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  facing?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  parking?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  requirementNotes?: string | null;

  // --- Source & project ---
  @IsOptional()
  @IsUUID()
  projectId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  source?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  campaign?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  utmSource?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  utmMedium?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  utmCampaign?: string | null;

  // --- Status & scoring (temperature only; status stays on /assign) ---
  @IsOptional()
  @IsString()
  @MaxLength(20)
  temperature?: string | null;

  // --- Assignment ---
  @IsOptional()
  @IsUUID()
  assignedToId?: string | null;

  // --- Consent ---
  @IsOptional()
  @IsBoolean()
  consentWhatsapp?: boolean;

  @IsOptional()
  @IsBoolean()
  consentCall?: boolean;

  @IsOptional()
  @IsBoolean()
  consentEmail?: boolean;
}
