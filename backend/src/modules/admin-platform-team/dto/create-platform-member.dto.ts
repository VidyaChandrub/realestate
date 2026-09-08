import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import {
  OPTIONAL_PHONE_NUMBER_REGEX,
  PHONE_NUMBER_MESSAGE,
} from '../../../common/utils/phone.util';

export class CreatePlatformMemberDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  firstName: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  lastName: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsOptional()
  @IsString()
  @MaxLength(16)
  @Matches(OPTIONAL_PHONE_NUMBER_REGEX, { message: PHONE_NUMBER_MESSAGE })
  phoneNumber?: string;

  /** Platform-scoped role key (e.g. super_admin or a custom platform role). */
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  role: string;

  @IsOptional()
  @IsString()
  @MinLength(6)
  @MaxLength(100)
  password?: string;
}
