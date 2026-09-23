import { IsEmail, IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

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

  /** Login surface requested by the browser, used to keep portal accounts isolated. */
  @IsIn(['organisation', 'platform'])
  portal: 'organisation' | 'platform';
}
