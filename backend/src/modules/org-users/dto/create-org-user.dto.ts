import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ASSIGNABLE_ROLES } from '../../../common/utils/org-users.util';
import type { AssignableRole } from '../../../common/utils/org-users.util';

export class CreateOrgUserDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  firstName: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  lastName: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phoneNumber?: string;

  @IsIn(ASSIGNABLE_ROLES)
  role: AssignableRole;
}
