import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

// Field templates arrive as plain arrays and are validated in depth by
// normalizeFieldTemplate (type, role, choice options, unique keys/labels) —
// the service throws 400 for anything malformed. There is no layout: every
// type is just a list of fields, some carrying a role.
export class CreateProjectTypeDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name: string;

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
