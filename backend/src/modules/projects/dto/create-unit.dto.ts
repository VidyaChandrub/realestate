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

export const UNIT_STATUS_VALUES = ['available', 'booked', 'held'] as const;
export type UnitStatusValue = (typeof UNIT_STATUS_VALUES)[number];

export class CreateUnitDto {
  // Which unit type this inventory row belongs to. Validated server-side to
  // belong to the same project (and therefore the same org).
  @IsUUID()
  unitTypeId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  unitNo: string;

  // Optional — projects without towers (villas, plots) leave this blank.
  @IsOptional()
  @IsString()
  @MaxLength(40)
  tower?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(-20)
  @Max(300)
  floor?: number;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  facing?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  price?: number;

  @IsOptional()
  @IsIn(UNIT_STATUS_VALUES)
  status?: UnitStatusValue;
}
