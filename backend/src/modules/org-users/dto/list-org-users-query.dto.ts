import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import {
  ASSIGNABLE_ROLES,
  ORG_USER_STATUS_VALUES,
} from '../../../common/utils/org-users.util';
import type {
  AssignableRole,
  OrgUserStatus,
} from '../../../common/utils/org-users.util';

export class ListOrgUsersQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsIn(ASSIGNABLE_ROLES)
  role?: AssignableRole;

  @IsOptional()
  @IsIn(ORG_USER_STATUS_VALUES)
  status?: OrgUserStatus;
}
