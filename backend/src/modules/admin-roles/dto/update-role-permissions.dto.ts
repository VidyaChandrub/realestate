import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  PERMISSION_MODULE_KEYS,
} from '../../../common/utils/permissions.util';

export class RolePermissionItemDto {
  @IsIn(PERMISSION_MODULE_KEYS)
  moduleKey: string;

  @IsBoolean()
  canView: boolean;

  @IsBoolean()
  canAdd: boolean;

  @IsBoolean()
  canEdit: boolean;

  @IsBoolean()
  canDelete: boolean;

  @IsBoolean()
  canApprove: boolean;

  // Users module only; optional so older clients keep working.
  @IsOptional()
  @IsBoolean()
  canActivate?: boolean;

  @IsOptional()
  @IsBoolean()
  canDeactivate?: boolean;

  // Projects module only (Add lead).
  @IsOptional()
  @IsBoolean()
  canAddLead?: boolean;
}

export class UpdateRolePermissionsDto {
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => RolePermissionItemDto)
  permissions: RolePermissionItemDto[];
}
