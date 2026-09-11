import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsEnum,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { TeamMemberRole } from '@prisma/client';

export class TeamMemberItemDto {
  @IsUUID()
  userId: string;

  // TeamMemberRole is its own enum, unrelated to the org-wide Role/RBAC
  // system — see the comment on the Prisma model.
  @IsEnum(TeamMemberRole)
  role: TeamMemberRole;
}

// Full replacement set for a team's members — re-submitting replaces
// whatever was there (no duplicates). Every userId is verified server-side
// to belong to the caller's org.
export class SetTeamMembersDto {
  @IsArray()
  @ArrayMaxSize(200)
  @ArrayUnique((item: TeamMemberItemDto) => item.userId)
  @ValidateNested({ each: true })
  @Type(() => TeamMemberItemDto)
  members: TeamMemberItemDto[];
}
