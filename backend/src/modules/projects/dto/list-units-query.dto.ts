import { IsIn, IsOptional, IsString } from 'class-validator';
import { UNIT_STATUS_VALUES } from './create-unit.dto';
import type { UnitStatusValue } from './create-unit.dto';

// Units are listed flat per project (the UI shows one "All units" table for
// the whole project, each row tagged with its configuration). Not paginated —
// a single project's inventory is bounded and the frontend renders it whole.
export class ListUnitsQueryDto {
  // Filter to one configuration label (e.g. "3 BHK").
  @IsOptional()
  @IsString()
  configuration?: string;

  @IsOptional()
  @IsIn(UNIT_STATUS_VALUES)
  status?: UnitStatusValue;

  @IsOptional()
  @IsString()
  search?: string;
}
