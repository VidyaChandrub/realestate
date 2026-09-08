import { IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class AssignLeadDto {
  /** User id to (re)assign the lead to. Must belong to the same org. */
  @IsOptional()
  @IsUUID()
  assignedToId?: string | null;

  /** Move the lead to a CRM stage at the same time (optional). */
  @IsOptional()
  @IsEnum([
    'new',
    'contacted',
    'follow_up',
    'site_visit',
    'negotiation',
    'won',
    'lost',
  ])
  status?: string;

  /** Required by the service when `status` actually changes. Logged on the timeline. */
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;
}
