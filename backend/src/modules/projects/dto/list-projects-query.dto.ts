import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export const PROJECT_STATUS_VALUES = ['active', 'inactive'] as const;
export type ProjectStatusValue = (typeof PROJECT_STATUS_VALUES)[number];

// Currencies the onboarding wizard offers on the pricing step. Shared here
// (the de-facto home for project value lists) so create/update DTOs agree.
export const PROJECT_CURRENCY_VALUES = ['INR', 'AED', 'USD'] as const;
export type ProjectCurrencyValue = (typeof PROJECT_CURRENCY_VALUES)[number];

export class ListProjectsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsIn(PROJECT_STATUS_VALUES)
  status?: ProjectStatusValue;
}
