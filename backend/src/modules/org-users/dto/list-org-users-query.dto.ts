import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import {
  ORG_USER_STATUS_VALUES,
} from '../../../common/utils/org-users.util';
import type {
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
  @IsString()
  role?: string;

  @IsOptional()
  @IsIn(ORG_USER_STATUS_VALUES)
  status?: OrgUserStatus;
}
