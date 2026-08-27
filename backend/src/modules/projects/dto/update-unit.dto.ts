import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { UNIT_STATUS_VALUES } from './create-unit.dto';
import type { UnitStatusValue } from './create-unit.dto';

export class UpdateUnitDto {
  // Allow moving a unit to a different type within the same project.
  @IsOptional()
  @IsUUID()
  unitTypeId?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  unitNo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  tower?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(-20)
  @Max(300)
  floor?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  facing?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  price?: number | null;

  @IsOptional()
  @IsIn(UNIT_STATUS_VALUES)
  status?: UnitStatusValue;
}

export class UpdateUnitStatusDto {
  @IsIn(UNIT_STATUS_VALUES)
  status: UnitStatusValue;
}
