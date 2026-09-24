import {
  ArrayMaxSize,
  ArrayNotEmpty,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

/** Hard cap on rows per CSV import request. */
export const LEAD_IMPORT_MAX_ROWS = 1000;

/**
 * One CSV row. Every field is optional *at the DTO level* on purpose: a row
 * with a missing/invalid field must not reject the whole request — the
 * service validates each row on its own and reports it as skipped. The
 * MaxLength caps only guard against abusive payloads; the per-row rules
 * (required, email/phone format, project match) live in the service.
 */
export class ImportLeadRowDto {
  /** 1-based line number in the uploaded file, echoed back in errors. */
  @IsOptional()
  @IsInt()
  @Min(1)
  rowNumber?: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  project?: string;
}

export class ImportLeadsDto {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(LEAD_IMPORT_MAX_ROWS)
  @ValidateNested({ each: true })
  @Type(() => ImportLeadRowDto)
  rows!: ImportLeadRowDto[];
}
