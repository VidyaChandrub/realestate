import { IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateTeamDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  // Rejected server-side if present: a team lead must already be a member
  // (see OrgTeamsService.create/assertTeamLeadIsMember), and a team being
  // created has no members yet. Set it via update() after adding members.
  @IsOptional()
  @IsUUID()
  teamLeadId?: string;

  // FK to an org user who must hold the `manager` role — verified
  // server-side in OrgTeamsService, same rule Project.managerId enforces.
  @IsOptional()
  @IsUUID()
  projectManagerId?: string;

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
