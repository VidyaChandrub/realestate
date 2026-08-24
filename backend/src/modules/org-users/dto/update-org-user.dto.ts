import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ASSIGNABLE_ROLES } from '../../../common/utils/org-users.util';
import type { AssignableRole } from '../../../common/utils/org-users.util';

// Email is intentionally absent — it's the login identifier and is not editable.
export class UpdateOrgUserDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  firstName?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  lastName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phoneNumber?: string;

  @IsOptional()
  @IsIn(ASSIGNABLE_ROLES)
  role?: AssignableRole;
}
