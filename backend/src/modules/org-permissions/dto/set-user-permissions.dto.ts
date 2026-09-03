import {
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PERMISSION_MODULE_KEYS } from '../../../common/utils/permissions.util';

/**
 * One per-user module override. Every column is optional; omitting (or
 * sending null) means "inherit from the user's role" for that action. The
 * service treats `null`/undefined as "clear this override".
 */
export class UserPermissionItemDto {
  @IsIn(PERMISSION_MODULE_KEYS)
  moduleKey: string;

  @IsOptional()
  @IsBoolean()
  canView?: boolean | null;

  @IsOptional()
  @IsBoolean()
  canAdd?: boolean | null;

  @IsOptional()
  @IsBoolean()
  canEdit?: boolean | null;

  @IsOptional()
  @IsBoolean()
  canDelete?: boolean | null;

  @IsOptional()
  @IsBoolean()
  canApprove?: boolean | null;
}

/** Full-set replace of one user's permission overrides within the org. */
export class SetUserPermissionsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UserPermissionItemDto)
  permissions: UserPermissionItemDto[];
}
