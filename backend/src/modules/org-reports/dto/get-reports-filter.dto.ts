import { IsOptional, IsString } from 'class-validator';

export class GetReportsFilterDto {
  @IsString()
  @IsOptional()
  preset?: string;

  @IsString()
  @IsOptional()
  startDate?: string;

  @IsString()
  @IsOptional()
  endDate?: string;

  @IsString()
  @IsOptional()
  projectId?: string;

  @IsString()
  @IsOptional()
  agentId?: string;

  @IsString()
  @IsOptional()
  source?: string;

  @IsString()
  @IsOptional()
  orgId?: string;

  @IsString()
  @IsOptional()
  type?: string;
}
