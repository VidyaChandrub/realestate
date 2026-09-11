import { ArrayMaxSize, ArrayUnique, IsArray, IsUUID } from 'class-validator';

// Full replacement set for a team's assigned projects — re-submitting
// replaces whatever was there (no duplicates). Every id is verified
// server-side to belong to the caller's org. Mirrors SetSalesAgentsDto.
export class SetTeamProjectsDto {
  @IsArray()
  @ArrayMaxSize(200)
  @ArrayUnique()
  @IsUUID('all', { each: true })
  projectIds: string[];
}
