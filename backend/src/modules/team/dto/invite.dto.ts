import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class InviteDto {
  // Optional — an invite only needs an email and a role; the invited
  // person supplies their own name later (see provisionInvitedUser). This
  // is the invite path specifically: Org/Super Admin's separate "create
  // user directly" flow (CreateOrgUserDto) still requires a full name.
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  first_name?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  last_name?: string;

  @IsEmail()
  email: string;

  @IsIn(['admin', 'manager', 'sales'])
  role: 'admin' | 'manager' | 'sales';
}
