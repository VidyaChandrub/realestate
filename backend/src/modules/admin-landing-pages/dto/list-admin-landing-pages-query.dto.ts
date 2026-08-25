import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';
import { LANDING_PAGE_STATUS_VALUES } from '../../org-landing-pages/dto/list-landing-pages-query.dto';
import type { LandingPageStatusValue } from '../../org-landing-pages/dto/list-landing-pages-query.dto';

export class ListAdminLandingPagesQueryDto {
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
  @IsIn(LANDING_PAGE_STATUS_VALUES)
  status?: LandingPageStatusValue;

  @IsOptional()
  @IsUUID()
  orgId?: string;
}
