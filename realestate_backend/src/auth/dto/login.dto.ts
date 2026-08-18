import { IsString, MinLength, IsOptional, IsIn } from 'class-validator';

export class LoginDto {
  @IsString() @MinLength(1) email!: string;
  @IsString() password!: string;
  @IsOptional()
  @IsString()
  @IsIn(['JOB_SEEKER', 'EMPLOYER'])
  role?: 'JOB_SEEKER' | 'EMPLOYER';
}
