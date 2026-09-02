import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { CATALOG_CATEGORY_VALUES } from './list-catalog-options-query.dto';

export class CreateCatalogOptionDto {
  @IsIn(CATALOG_CATEGORY_VALUES)
  category: (typeof CATALOG_CATEGORY_VALUES)[number];

  // 120 matches AmenityDto.name — amenity labels are copied verbatim onto
  // Project.amenities when a project is created, so the caps must agree.
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  label: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(10000)
  sortOrder?: number;
}
