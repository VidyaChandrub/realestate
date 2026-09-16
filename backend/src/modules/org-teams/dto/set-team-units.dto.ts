import { ArrayMaxSize, ArrayUnique, IsArray, IsUUID } from 'class-validator';

// Full replacement set for a team's assigned standalone units — re-submitting
// replaces whatever was there (no duplicates). Every id is verified
// server-side to belong to the caller's org AND be standalone (no project) —
// see OrgTeamsService.assertOrgStandaloneUnits. Mirrors SetTeamProjectsDto.
export class SetTeamUnitsDto {
  @IsArray()
  @ArrayMaxSize(200)
  @ArrayUnique()
  @IsUUID('all', { each: true })
  unitIds: string[];
}
