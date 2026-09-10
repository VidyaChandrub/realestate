import { Type } from 'class-transformer';
import {
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class ListAuditLogsQueryDto {
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
  @MaxLength(120)
  search?: string;

  /** Filter by the acting user's id (platform team member). */
  @IsOptional()
  @IsString()
  actorId?: string;

  /** Filter by organisation id (platform admins only). */
  @IsOptional()
  @IsString()
  orgId?: string;

  /** Filter by exact action key (e.g. org_onboarded, user_created). */
  @IsOptional()
  @IsString()
  @MaxLength(80)
  action?: string;

  /** Filter by console module key (e.g. admin_organisations). */
  @IsOptional()
  @IsString()
  @MaxLength(80)
  moduleKey?: string;

  /** Inclusive lower bound (ISO date). */
  @IsOptional()
  @IsISO8601()
  dateFrom?: string;

  /** Inclusive upper bound (ISO date). */
  @IsOptional()
  @IsISO8601()
  dateTo?: string;
}