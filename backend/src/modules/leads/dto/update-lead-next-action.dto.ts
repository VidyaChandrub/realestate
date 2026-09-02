import { IsISO8601, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateLeadNextActionDto {
  @IsIn(['site_visit', 'follow_up'])
  actionType!: 'site_visit' | 'follow_up';

  @IsISO8601()
  scheduledAt!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;

  @IsOptional()
  @IsISO8601()
  reminderAt?: string;
}
