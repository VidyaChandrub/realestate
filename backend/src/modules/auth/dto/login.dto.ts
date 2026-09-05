import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;

  /** Browser host when signing in on an organisation subdomain or custom domain. */
  @IsOptional()
  @IsString()
  host?: string;
}
