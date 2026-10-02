import { IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class GoogleAuthDto {
  /** Google ID token JWT from Google Identity Services (One-Tap or GSI button). */
  @IsOptional()
  @IsString()
  credential?: string;

  /** Google OAuth authorization code from standard OAuth2 redirect. */
  @IsOptional()
  @IsString()
  code?: string;

  /** The redirect URI used during OAuth code request. */
  @IsOptional()
  @IsString()
  redirectUri?: string;

  /** Whether the action is login or org registration. */
  @IsOptional()
  @IsIn(['login', 'register'])
  mode?: 'login' | 'register';

  /** Portal surface: organisation or platform. */
  @IsOptional()
  @IsIn(['organisation', 'platform'])
  portal?: 'organisation' | 'platform';

  /** Optional country for instant Step 1 creation during registration. */
  @IsOptional()
  @IsString()
  @MaxLength(100)
  country?: string;

  /** Optional phone number for instant Step 1 creation during registration. */
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phoneNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  lastName?: string;

  /** Browser host when signing in on a custom domain. */
  @IsOptional()
  @IsString()
  host?: string;
}
