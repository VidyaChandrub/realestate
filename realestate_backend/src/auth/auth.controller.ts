import { BadRequestException, Controller, Post, Get, Body, HttpCode, HttpStatus, UseGuards, Req, Res, Query, ConflictException, UnauthorizedException, Logger } from '@nestjs/common';
import { IsEmail, IsString, IsOptional } from 'class-validator';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import type { AxiosError } from 'axios';
import passport from 'passport';
import { OAuth2Client, TokenPayload } from 'google-auth-library';
import { AuthService } from './services/auth.service';

type SocialRole = 'JOB_SEEKER' | 'EMPLOYER';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { GoogleMobileLoginDto } from './dto/google-mobile-login.dto';
import { Public, JwtAuthGuard } from './jwt-auth.guard';

class RefreshDto {
  @IsString() refreshToken!: string;
}

class ResendVerificationEmailDto {
  @IsEmail() email!: string;
}

class LogoutDto {
  @IsOptional() @IsString() deviceId?: string;
  @IsOptional() @IsString() token?: string;
}

const OAUTH_COOKIE = 'oauth_meta';
const COOKIE_OPTS = { httpOnly: true, sameSite: 'lax' as const, maxAge: 5 * 60 * 1000 };
const LINKEDIN_AUTH_URL = 'https://www.linkedin.com/oauth/v2/authorization';
const LINKEDIN_TOKEN_URL = 'https://www.linkedin.com/oauth/v2/accessToken';
const LINKEDIN_USERINFO_URL = 'https://api.linkedin.com/v2/userinfo';

interface LinkedInTokenResponse {
  access_token: string;
  expires_in?: number;
  scope?: string;
  token_type?: string;
  id_token?: string;
}

interface LinkedInUserInfoResponse {
  email?: string;
  given_name?: string;
  family_name?: string;
  name?: string;
}

@Controller('api/v1/auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);
  private readonly googleOAuthClient = new OAuth2Client();

  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  register(@Body() body: RegisterDto) {
    return this.authService.register(
      body.email,
      body.password,
      body.firstName,
      body.lastName,
      body.role,
      body.mobileNumber,
    );
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() body: LoginDto) {
    return this.authService.login(body.email, body.password, body.role);
  }

  @Public()
  @Post('resend-verification-email')
  @HttpCode(HttpStatus.OK)
  resendVerificationEmail(@Body() body: ResendVerificationEmailDto) {
    return this.authService.resendVerificationEmail(body.email);
  }

  @Public()
  @Get('verify-email')
  async verifyEmail(@Query('token') token: string, @Res() res: any) {
    const result = await this.authService.verifyEmail(token);
    const redirectUrl = this.getVerificationRedirectUrl(result.role, result.status);
    return res.redirect(redirectUrl);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(@Body() body: RefreshDto) {
    return this.authService.refreshToken(body.refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout(@Req() req: any, @Body() body: LogoutDto) {
    return this.authService.logout(req.user.userId, {
      deviceId: body.deviceId,
      token: body.token,
    });
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  forgotPassword(@Body() body: ForgotPasswordDto) {
    return this.authService.forgotPassword(body.email);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  resetPassword(@Body() body: ResetPasswordDto) {
    return this.authService.resetPassword(body.token, body.newPassword);
  }

  // ── Google OAuth ──────────────────────────────────────────────────────────
  // Flow:
  //   1. Client navigates to /auth/google?dest=web|admin&role=JOB_SEEKER|EMPLOYER
  //   2. Backend sets a short-lived cookie with dest+role, then redirects to Google
  //   3. Google calls back to /auth/google/callback
  //   4. Backend reads cookie, creates/finds user, redirects to the right frontend

  @Public()
  @Get('google')
  googleLogin(
    @Query('dest') dest = 'web',
    @Query('role') role = 'USER',
    @Req() req: any,
    @Res() res: any,
  ) {
    res.cookie(OAUTH_COOKIE, JSON.stringify({ dest, role }), COOKIE_OPTS);
    passport.authenticate('google', { scope: ['email', 'profile'] })(req, res, () => {});
  }

  @Public()
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleCallback(@Req() req: any, @Res() res: any) {
    return this.handleSocialCallback(req, res, 'google');
  }

  // ── Google native SDK (Capacitor mobile only) ───────────────────────────────
  // Additive endpoint — does not replace the redirect flow above. The mobile app
  // uses @capawesome/capacitor-google-sign-in to get an idToken directly from the
  // OS account chooser, then exchanges it here. Verifies idToken server-side against
  // the same GOOGLE_CLIENT_ID used by GoogleStrategy, then reuses findOrCreateSocialUser
  // so the response shape and business logic exactly match every other login path.

  @Public()
  @Post('google/mobile')
  @HttpCode(HttpStatus.OK)
  async googleMobileLogin(@Body() body: GoogleMobileLoginDto) {
    const payload = await this.verifyGoogleIdToken(body.idToken);

    const socialUser = {
      email: payload.email ?? '',
      firstName: payload.given_name ?? '',
      lastName: payload.family_name ?? '',
    };

    return this.authService.findOrCreateSocialUser(socialUser, 'JOB_SEEKER');
  }

  // ── Facebook OAuth ────────────────────────────────────────────────────────

  @Public()
  @Get('facebook')
  facebookLogin(
    @Query('dest') dest = 'web',
    @Query('role') role = 'USER',
    @Req() req: any,
    @Res() res: any,
  ) {
    res.cookie(OAUTH_COOKIE, JSON.stringify({ dest, role }), COOKIE_OPTS);
    passport.authenticate('facebook', { scope: ['email'] })(req, res, () => {});
  }

  @Public()
  @Get('facebook/callback')
  @UseGuards(AuthGuard('facebook'))
  async facebookCallback(@Req() req: any, @Res() res: any) {
    return this.handleSocialCallback(req, res, 'facebook');
  }

  // ── LinkedIn OAuth ────────────────────────────────────────────────────────

  @Public()
  @Get('linkedin')
  linkedInLogin(
    @Query('dest') dest = 'web',
    @Query('role') role = 'USER',
    @Res() res: any,
  ) {
    res.cookie(OAUTH_COOKIE, JSON.stringify({ dest, role }), COOKIE_OPTS);

    const clientId = this.config.get<string>('LINKEDIN_CLIENT_ID');
    const callbackUrl = this.config.get<string>('LINKEDIN_CALLBACK_URL');

    if (!clientId || !callbackUrl) {
      throw new BadRequestException('LinkedIn OAuth is not configured');
    }

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: callbackUrl,
      scope: 'openid profile email',
    });

    return res.redirect(`${LINKEDIN_AUTH_URL}?${params.toString()}`);
  }

  @Public()
  @Get('linkedin/callback')
  async linkedInCallback(@Req() req: any, @Res() res: any, @Query('code') code?: string) {
    if (!code) {
      throw new BadRequestException('Invalid LinkedIn authorization code');
    }

    const accessToken = await this.exchangeLinkedInCode(code);
    const linkedInUser = await this.fetchLinkedInUser(accessToken);

    req.user = linkedInUser;
    return this.handleSocialCallback(req, res, 'linkedin');
  }

  // ── Shared callback handler ───────────────────────────────────────────────

  private async handleSocialCallback(req: any, res: any, _provider: string) {
    let dest = 'web';
    let role: SocialRole = 'JOB_SEEKER';

    try {
      const meta = JSON.parse(req.cookies?.[OAUTH_COOKIE] ?? '{}');
      dest = meta.dest ?? 'web';
      role = meta.role === 'EMPLOYER' ? 'EMPLOYER' : 'JOB_SEEKER';
    } catch { /* use defaults */ }

    res.clearCookie(OAUTH_COOKIE);

    let appUrl: string;

    if (dest === 'admin') {
      appUrl =
        this.config.get<string>('ADMIN_URL') ??
        'https://admin.realestate.in';
    } else if (dest === 'mobile') {
      appUrl =
        this.config.get<string>('MOBILE_APP_URL') ??
        'realestate://auth';
    } else {
      appUrl =
        this.config.get<string>('APP_URL') ??
        'https://mobile.realestate.in';
    }

    try {
      const tokens = await this.authService.findOrCreateSocialUser(req.user, role);

      const params = new URLSearchParams({
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        role: tokens.role,
      });

      const redirectUrl =
        dest === 'mobile'
          ? `${appUrl}?${params.toString()}`
          : `${appUrl}/auth/callback?${params.toString()}`;

      this.logger.log(
        `OAuth callback resolved: provider=${_provider}, dest=${dest}, role=${role}, appUrl=${appUrl}`,
      );
      this.logger.log(`OAuth redirect URL: ${redirectUrl}`);

      return res.redirect(redirectUrl);
    } catch (error) {
      const errorCode = this.getOAuthErrorCode(error);

      // Include email for EMAIL_VERIFICATION_PENDING flow
      if (
        errorCode === 'EMAIL_VERIFICATION_PENDING' &&
        req.user?.email
      ) {
        const params = new URLSearchParams({
          error: errorCode,
          email: req.user.email,
        });

        return res.redirect(`${appUrl}/auth?${params.toString()}`);
      }

      return res.redirect(`${appUrl}/auth?error=${errorCode}`);
    }
  }

  private getOAuthErrorCode(error: unknown): string {
    const ACCOUNT_DEACTIVATED_MESSAGE = 'Your account has been deactivated by admin';

    // Extract a human-readable message if available
    const extractMessage = (err: any) => {
      if (!err) return '';
      if (typeof err === 'string') return err;
      if (err.message) return err.message;
      if (err.response && err.response.message) return err.response.message;
      try { return JSON.stringify(err); } catch { return String(err); }
    };

    const msg = extractMessage(error);

    if (error instanceof ConflictException) {
      if (msg.includes('Employer')) return 'EMPLOYER_ACCOUNT_EXISTS';
      if (msg.includes('Job Seeker') || msg.includes('JobSeeker')) return 'JOBSEEKER_ACCOUNT_EXISTS';
      return 'SOCIAL_LOGIN_FAILED';
    }

    if (error instanceof UnauthorizedException) {
      if (msg.includes(ACCOUNT_DEACTIVATED_MESSAGE) || msg.includes('deactivated')) return 'ACCOUNT_DEACTIVATED';
      if (msg.includes('verification is pending') || msg.includes('Email verification is pending')) return 'EMAIL_VERIFICATION_PENDING';
      return 'SOCIAL_LOGIN_FAILED';
    }

    return 'SOCIAL_LOGIN_FAILED';
  }

  private getVerificationRedirectUrl(role: SocialRole | undefined, status: 'success' | 'invalid' | 'expired'): string {
    const appUrl = role === 'EMPLOYER'
      ? (this.config.get<string>('ADMIN_URL') ?? 'https://admin.quespro.in')
      : (this.config.get<string>('APP_URL') ?? 'https://mobile.quespro.in');

    return `${appUrl}/verify-email?verification=${status}`;
  }

  private async verifyGoogleIdToken(idToken: string): Promise<TokenPayload> {
    const clientId = this.config.get<string>('GOOGLE_CLIENT_ID');
    if (!clientId) {
      throw new BadRequestException('Google OAuth is not configured');
    }

    let payload: TokenPayload | undefined;
    try {
      const ticket = await this.googleOAuthClient.verifyIdToken({
        idToken,
        audience: clientId,
      });
      payload = ticket.getPayload();
    } catch (error) {
      this.logger.warn(
        `Google idToken verification failed: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
      throw new UnauthorizedException('Invalid Google token');
    }

    if (!payload?.email) {
      throw new UnauthorizedException('Invalid Google token');
    }

    return payload;
  }

  private async exchangeLinkedInCode(code: string): Promise<string> {
    const clientId = this.config.get<string>('LINKEDIN_CLIENT_ID');
    const clientSecret = this.config.get<string>('LINKEDIN_CLIENT_SECRET');
    const callbackUrl = this.config.get<string>('LINKEDIN_CALLBACK_URL');

    if (!clientId || !clientSecret || !callbackUrl) {
      throw new BadRequestException('LinkedIn OAuth is not configured');
    }

    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: callbackUrl,
      client_id: clientId,
      client_secret: clientSecret,
    });

    try {
      const response = await axios.post<LinkedInTokenResponse>(LINKEDIN_TOKEN_URL, body, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });

      if (!response.data.access_token) {
        throw new BadRequestException('LinkedIn token exchange did not return an access token');
      }

      return response.data.access_token;
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw this.toLinkedInBadRequest(error, 'Failed to exchange LinkedIn authorization code');
    }
  }

  private async fetchLinkedInUser(accessToken: string): Promise<{ email: string; firstName: string; lastName: string }> {
    try {
      const response = await axios.get<LinkedInUserInfoResponse>(LINKEDIN_USERINFO_URL, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      const { email, given_name: givenName, family_name: familyName, name } = response.data;
      if (!email) {
        throw new BadRequestException('No email address returned from LinkedIn');
      }

      const nameParts = name?.trim().split(/\s+/) ?? [];
      return {
        email,
        firstName: givenName ?? nameParts[0] ?? '',
        lastName: familyName ?? nameParts.slice(1).join(' ') ?? '',
      };
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw this.toLinkedInBadRequest(error, 'Failed to fetch LinkedIn profile');
    }
  }

  private toLinkedInBadRequest(error: unknown, message: string): BadRequestException {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<{ error?: string; error_description?: string; message?: string }>;
      const detail = axiosError.response?.data?.error_description
        ?? axiosError.response?.data?.message
        ?? axiosError.response?.data?.error;

      return new BadRequestException(detail ? `${message}: ${detail}` : message);
    }

    return new BadRequestException(message);
  }
}
