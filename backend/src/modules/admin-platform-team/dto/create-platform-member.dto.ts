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
  PHONE_NUMBER_MESSAGE,
  PHONE_NUMBER_REGEX,
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

  @IsEmail({}, { message: 'Enter a valid email address.' })
  @IsNotEmpty()
  @MaxLength(254)
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'Mobile number is required.' })
  @MaxLength(16)
  @Matches(PHONE_NUMBER_REGEX, { message: PHONE_NUMBER_MESSAGE })
  phoneNumber: string;

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
