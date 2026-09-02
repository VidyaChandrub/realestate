import { ArrayMaxSize, ArrayUnique, IsArray, IsUUID } from 'class-validator';

// Full replacement set for a project's assigned sales agents — re-submitting
// replaces whatever was there (no duplicates). Every id is verified
// server-side to be a user in the caller's org.
export class SetSalesAgentsDto {
  @IsArray()
  @ArrayMaxSize(200)
  @ArrayUnique()
  @IsUUID('all', { each: true })
  userIds: string[];
}
