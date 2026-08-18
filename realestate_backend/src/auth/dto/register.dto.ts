import { IsEmail, IsIn, IsOptional, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @IsEmail() email!: string;
  @IsString() @MinLength(8) password!: string;
  @IsOptional() @IsString() firstName?: string;
  @IsOptional() @IsString() lastName?: string;
  @IsOptional() @IsString() mobileNumber?: string;
  @IsOptional() @IsIn(['JOB_SEEKER', 'EMPLOYER']) role?: 'JOB_SEEKER' | 'EMPLOYER';
}
