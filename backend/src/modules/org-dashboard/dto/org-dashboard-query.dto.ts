import { IsIn, IsOptional, IsString } from 'class-validator';

export class OrgDashboardQueryDto {
  @IsOptional()
  @IsIn(['today', '7d', '30d', '90d', 'all'])
  period?: 'today' | '7d' | '30d' | '90d' | 'all' = '30d';

  @IsOptional()
  @IsString()
  projectId?: string;

  @IsOptional()
  @IsString()
  userId?: string;
}
