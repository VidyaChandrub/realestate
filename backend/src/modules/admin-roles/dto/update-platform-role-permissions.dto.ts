import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsIn,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PLATFORM_PERMISSION_MODULE_KEYS } from '../../../common/utils/permissions.util';

export class PlatformRolePermissionItemDto {
  @IsIn(PLATFORM_PERMISSION_MODULE_KEYS)
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
}

export class UpdatePlatformRolePermissionsDto {
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => PlatformRolePermissionItemDto)
  permissions: PlatformRolePermissionItemDto[];
}
