import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { TeamStatus } from '@prisma/client';

export class UpdateTeamDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsEnum(TeamStatus)
  status?: TeamStatus;

  // Explicit null clears the lead; omit the field to leave it untouched.
  // Must already be a TeamMember on this team — verified server-side in
  // OrgTeamsService.assertTeamLeadIsMember.
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsUUID()
  teamLeadId?: string | null;

  // Explicit null clears the project manager; omit to leave untouched. Must
  // hold the `manager` role — verified server-side in OrgTeamsService.
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsUUID()
  projectManagerId?: string | null;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @MaxLength(120)
  region?: string | null;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @MaxLength(60)
  workingHours?: string | null;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @MaxLength(500)
  description?: string | null;
}
