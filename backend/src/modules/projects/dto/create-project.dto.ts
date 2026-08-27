import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { AmenityDto } from './amenity.dto';
import { PROJECT_STATUS_VALUES } from './list-projects-query.dto';

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

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => AmenityDto)
  amenities?: AmenityDto[];
}
