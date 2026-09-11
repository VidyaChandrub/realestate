import { IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateTeamDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  // FK to an org user (verified server-side to belong to the caller's org,
  // same rule as Project.managerId).
  @IsOptional()
  @IsUUID()
  teamLeadId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  region?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  workingHours?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}
