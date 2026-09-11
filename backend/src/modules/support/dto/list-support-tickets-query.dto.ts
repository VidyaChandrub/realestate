import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { SUPPORT_TICKET_STATUS_VALUES } from './support-ticket-status.enum';
import type { SupportTicketStatusValue } from './support-ticket-status.enum';

export class ListSupportTicketsQueryDto {
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
  @IsIn(SUPPORT_TICKET_STATUS_VALUES)
  status?: SupportTicketStatusValue;

  // Matches subject / ticket number (case-insensitive, contains).
  @IsOptional()
  @IsString()
  search?: string;

  // Support Management (admin) only — narrow to one organisation. Ignored on
  // the org-facing endpoint, which is always scoped to the caller's own org.
  @IsOptional()
  @IsUUID()
  orgId?: string;
}
