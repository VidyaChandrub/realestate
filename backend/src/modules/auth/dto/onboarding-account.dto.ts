import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';

// Signup wizard — Step 1 (Account). Creates the User; no Organisation
// exists yet, so nothing org-related belongs here.
export class OnboardingAccountDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  first_name: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  last_name: string;

  @IsEmail()
  work_email: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  phone_number: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(72)
  password: string;
}
