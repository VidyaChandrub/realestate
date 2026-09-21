import {
  IsArray,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PROJECT_LAYOUTS } from '../layouts';
import type { ProjectLayoutValue } from '../layouts';

// Field templates arrive as plain arrays and are validated in depth by
// normalizeFieldTemplate (type, choice options, unique keys/labels) — the
// service throws 400 for anything malformed.
export class CreateProjectTypeDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name: string;

  @IsIn(PROJECT_LAYOUTS)
  layout: ProjectLayoutValue;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  groupLabel?: string;

  @IsOptional()
  @IsArray()
  projectFields?: unknown[];

  @IsOptional()
  @IsArray()
  unitFields?: unknown[];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(10000)
  sortOrder?: number;
}

export class UpdateProjectTypeDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsIn(PROJECT_LAYOUTS)
  layout?: ProjectLayoutValue;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  groupLabel?: string;

  @IsOptional()
  @IsArray()
  projectFields?: unknown[];

  @IsOptional()
  @IsArray()
  unitFields?: unknown[];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(10000)
  sortOrder?: number;
}
