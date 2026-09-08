import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

// Digits only, with an optional leading '+', at most 15 digits (E.164 ceiling).
// Rejects letters and anything longer. An empty string is allowed too (the
// field is optional — `@IsOptional()` only skips undefined/null); validated the
// same way on create and update.
export const PLATFORM_PHONE_REGEX = /^(\+?\d{1,15})?$/;
export const PLATFORM_PHONE_MESSAGE =
  'Mobile number must contain digits only (optionally starting with +) and be at most 15 digits.';

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
  @Matches(PLATFORM_PHONE_REGEX, { message: PLATFORM_PHONE_MESSAGE })
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
