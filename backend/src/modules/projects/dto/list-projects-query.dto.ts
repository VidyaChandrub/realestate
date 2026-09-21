import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export const PROJECT_STATUS_VALUES = ['active', 'inactive'] as const;
export type ProjectStatusValue = (typeof PROJECT_STATUS_VALUES)[number];

// Every currency code a project can be priced in. Must mirror the currency
// codes in frontend/lib/countries.ts's COUNTRY_META (same list Settings →
// Localization offers) — that file is the source of truth for the set, this
// is just the server-side copy of it (no shared package between the two
// apps). Shared here (the de-facto home for project value lists) so
// create/update DTOs agree.
export const PROJECT_CURRENCY_VALUES = [
  'INR', 'AED', 'USD', 'GBP', 'AUD', 'CAD', 'SGD', 'SAR', 'QAR', 'KWD',
  'BHD', 'OMR', 'MYR', 'EUR', 'CHF', 'ZAR', 'NGN', 'KES', 'EGP', 'BDT',
  'PKR', 'LKR', 'NPR', 'JPY', 'CNY', 'HKD', 'IDR', 'THB', 'VND', 'PHP',
  'NZD', 'BRL', 'MXN', 'TRY', 'RUB',
] as const;
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

// Which project-assignment picker a candidate list is for. `sales_agent` is
// everyone except Admins/Managers; `manager` is the users holding the manager
// role. See ProjectsService.listProjectAssigneeCandidates.
export const ASSIGNEE_KIND_VALUES = ['sales_agent', 'manager'] as const;
export type AssigneeKind = (typeof ASSIGNEE_KIND_VALUES)[number];

export class ListAssigneeCandidatesQueryDto {
  @IsOptional()
  @IsIn(ASSIGNEE_KIND_VALUES)
  type?: AssigneeKind;
}
