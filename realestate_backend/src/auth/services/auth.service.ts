import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  NotFoundException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from './mail.service';
import { DeviceTokensService } from '../../device-tokens/services/device-tokens.service';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

const ACCOUNT_DEACTIVATED_MESSAGE = 'Your account has been deactivated by admin';
const EMAIL_VERIFICATION_REQUIRED_RESPONSE = {
  success: true,
  emailVerificationRequired: true,
  message: 'Email verification is pending. Please verify your email to continue.',
};
const EMAIL_VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_VERIFICATION_RESEND_ATTEMPTS = 3;
const VERIFICATION_RESEND_WINDOW_MS = 24 * 60 * 60 * 1000;
const VERIFICATION_RESEND_COOLDOWN_MS = 5 * 60 * 1000;
const VERIFICATION_RESEND_COOLDOWN_MESSAGE =
  'Please wait 5 minutes before requesting another verification email.';
const VERIFICATION_RESEND_MAX_ATTEMPTS_MESSAGE =
  'Maximum verification attempts reached. Please try again later.';
type EmailVerificationRole = 'JOB_SEEKER' | 'EMPLOYER';
type VerifyEmailResult = {
  status: 'success' | 'invalid' | 'expired';
  role?: EmailVerificationRole;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly mail: MailService,
    private readonly deviceTokensService: DeviceTokensService,
  ) {}

  async register(
    email: string,
    password: string,
    firstName?: string,
    lastName?: string,
    role: 'JOB_SEEKER' | 'EMPLOYER' = 'JOB_SEEKER',
    mobileNumber?: string,
  ) {
    // 1) Check existing email
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      // CASE A — VERIFIED EMAIL EXISTS
      if (existing.emailVerified) {
        throw new ConflictException('An account with this email already exists');
      }

      // existing is unverified
      // CASE B — UNVERIFIED SAME ROLE EXISTS => resend verification
      if (this.requiresEmailVerification(existing.role) && existing.role === role) {
          try {
            await this.resendVerificationEmail(existing.email);
          } catch (err) {
            if (
              !(err instanceof HttpException) ||
              (err as HttpException).getStatus() !== HttpStatus.TOO_MANY_REQUESTS
            ) {
              throw err;
            }
          }
        return EMAIL_VERIFICATION_REQUIRED_RESPONSE;
      }

      // CASE C — UNVERIFIED DIFFERENT ROLE EXISTS => block
      throw new ConflictException('An account with this email already exists');
    }

    // 3) Validate mobile uniqueness before creating user or sending emails
    if (mobileNumber) {
      const existingMobile = await this.prisma.user.findFirst({ where: { mobileNumber } });
      if (existingMobile) {
        throw new ConflictException('This mobile number is already taken');
      }
    }

    // 4) Create user (and 5) send verification email if required)
    const passwordHash = await bcrypt.hash(password, 12);

    if (this.requiresEmailVerification(role)) {
      const { rawToken, tokenHash, expiresAt } = this.createEmailVerificationToken();
      const created = await this.prisma.user.create({
        data: {
          email,
          passwordHash,
          firstName,
          lastName,
          role,
          mobileNumber,
          emailVerificationToken: tokenHash,
          emailVerificationExpiresAt: expiresAt,
        },
      });
      await this.mail.sendEmailVerificationEmail(email, rawToken, role);
      return EMAIL_VERIFICATION_REQUIRED_RESPONSE;
    }

    const user = await this.prisma.user.create({
      data: { email, passwordHash, firstName, lastName, role, mobileNumber },
    });
    return this.generateTokens(user);
  }

  async login(
    email: string,
    password: string,
    role: 'JOB_SEEKER' | 'EMPLOYER' = 'JOB_SEEKER',
  ) {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const isEmployerPortalRole =
      role === 'EMPLOYER' && (user.role === 'EMPLOYER' || user.role === 'ADMIN');

    if (!isEmployerPortalRole && user.role !== role) {
      const message =
        user.role === 'JOB_SEEKER'
          ? 'This email is already registered as a Job Seeker. Please login from the job seeker portal.'
          : 'This email is already registered as an Employer/Admin. Please login from the employer portal.';

      throw new ConflictException(message);
    }

    this.ensureUserIsActive(user);

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    this.ensureEmailVerified(user);
    return this.generateTokens(user);
  }

  async resendVerificationEmail(email: string): Promise<{ success: boolean; message: string }> {
    const message =
      'Verification email sent successfully. Please check your inbox to continue.';
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user || !this.requiresEmailVerification(user.role) || user.emailVerified) {
      return { success: true, message };
    }

    const now = Date.now();
    const windowStartedAt = user.verificationResendWindowStartedAt
      ? new Date(user.verificationResendWindowStartedAt).getTime()
      : null;
    const windowExpired =
      windowStartedAt === null || now - windowStartedAt >= VERIFICATION_RESEND_WINDOW_MS;
    const resendCount = windowExpired ? 0 : user.resendVerificationCount ?? 0;

    if (
      user.lastVerificationResendAt &&
      now - new Date(user.lastVerificationResendAt).getTime() < VERIFICATION_RESEND_COOLDOWN_MS
    ) {
      throw new HttpException(VERIFICATION_RESEND_COOLDOWN_MESSAGE, HttpStatus.TOO_MANY_REQUESTS);
    }

    if (!windowExpired && resendCount >= MAX_VERIFICATION_RESEND_ATTEMPTS) {
      throw new HttpException(VERIFICATION_RESEND_MAX_ATTEMPTS_MESSAGE, HttpStatus.TOO_MANY_REQUESTS);
    }

    const { rawToken, tokenHash, expiresAt } = this.createEmailVerificationToken();
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerificationToken: tokenHash,
        emailVerificationExpiresAt: expiresAt,
      },
    });

    await this.mail.sendEmailVerificationEmail(user.email, rawToken, user.role);

    await this.prisma.user.update({
      where: { id: user.id },
      data: windowExpired
        ? {
            resendVerificationCount: 1,
            lastVerificationResendAt: new Date(),
            verificationResendWindowStartedAt: new Date(),
          }
        : {
            resendVerificationCount: {
              increment: 1,
            },
            lastVerificationResendAt: new Date(),
          },
    });

    return { success: true, message };
  }

  async verifyEmail(token: string): Promise<VerifyEmailResult> {
    if (!token) return { status: 'invalid' };

    const tokenHash = this.hashToken(token);
    const user = await this.prisma.user.findFirst({
      where: {
        role: { in: ['JOB_SEEKER', 'EMPLOYER'] },
        emailVerificationToken: tokenHash,
      },
    });

    if (!user) return { status: 'invalid' };

    if (!user.emailVerificationExpiresAt || user.emailVerificationExpiresAt < new Date()) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          emailVerificationToken: null,
          emailVerificationExpiresAt: null,
        },
      });
      return { status: 'expired', role: user.role as EmailVerificationRole };
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        emailVerifiedAt: new Date(),
        emailVerificationToken: null,
        emailVerificationExpiresAt: null,
        resendVerificationCount: 0,
        lastVerificationResendAt: null,
        verificationResendWindowStartedAt: null,
      },
    });

    return { status: 'success', role: user.role as EmailVerificationRole };
  }

  async refreshToken(refreshToken: string) {
    let payload: any;
    try {
      payload = this.jwtService.verify(refreshToken, {
        secret: this.config.get<string>('JWT_SECRET')!,
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('Invalid token type');
    }

    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) throw new UnauthorizedException('User not found');
    this.ensureUserIsActive(user);
    this.ensureEmailVerified(user);
    return this.generateTokens(user);
  }

  async logout(
    userId: string,
    deviceOrToken: { deviceId?: string; token?: string },
  ): Promise<{ success: boolean }> {
    return this.deviceTokensService.deactivateDevice(userId, deviceOrToken);
  }

  async forgotPassword(email: string): Promise<{ message: string }> {
    const message = 'If an account with that email exists, a reset link has been sent.';

    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) return { message };

    // Invalidate any existing reset tokens for this user
    await this.prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await this.prisma.passwordResetToken.create({
      data: { userId: user.id, tokenHash, expiresAt },
    });

    const isJobSeeker = user.role === 'JOB_SEEKER';
    const appUrl = isJobSeeker
      ? (this.config.get<string>('APP_URL') ?? 'https://mobile.realestate.in')
      : (this.config.get<string>('ADMIN_URL') ?? 'https://admin.realestate.in');

    try {
      await this.mail.sendPasswordReset(email, rawToken, appUrl);
    } catch (err) {
      throw err;
    }

    return { message };
  }

  async findOrCreateSocialUser(
    socialUser: { email: string; firstName: string; lastName: string },
    role: 'JOB_SEEKER' | 'EMPLOYER' = 'JOB_SEEKER',
  ) {
    if (!socialUser.email) {
      throw new BadRequestException(
        'No email address returned from provider. Please ensure your account has a public email.',
      );
    }

    let user = await this.prisma.user.findUnique({ where: { email: socialUser.email } });

    // 1. ROLE CONFLICT FIRST
    const isEmployerPortalRole =
      role === 'EMPLOYER' && (user?.role === 'EMPLOYER' || user?.role === 'ADMIN');

    if (user && !isEmployerPortalRole && user.role !== role) {
      const message =
        user.role === 'JOB_SEEKER'
          ? 'This email is already registered as a Job Seeker. Please login from the job seeker portal.'
          : 'This email is already registered as an Employer/Admin. Please login from the employer portal.';

      throw new ConflictException(message);
    }

    // 2. ACCOUNT DEACTIVATED SECOND
    if (user) {
      this.ensureUserIsActive(user);
    }

    // 3. EMAIL VERIFICATION THIRD
    if (user && this.requiresEmailVerification(user.role) && !user.emailVerified) {
      throw new UnauthorizedException(
        'Email verification is pending. Please verify your email before continuing.',
      );
    }

    if (!user) {
      // Random non-usable password — social accounts never use password login
      const passwordHash = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 12);
      user = await this.prisma.user.create({
        data: {
          email: socialUser.email,
          passwordHash,
          firstName: socialUser.firstName || null,
          lastName: socialUser.lastName || null,
          role,
          emailVerified: true,
          emailVerifiedAt: new Date(),
        },
      });
    }

    return this.generateTokens(user);
  }

  // Convenience aliases kept for backwards compatibility with existing call sites
  async findOrCreateGoogleUser(
    googleUser: { email: string; firstName: string; lastName: string; googleId: string },
    role: 'JOB_SEEKER' | 'EMPLOYER' = 'JOB_SEEKER',
  ) {
    return this.findOrCreateSocialUser(googleUser, role);
  }

  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    if (!token) throw new BadRequestException('Reset token is required');

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const record = await this.prisma.passwordResetToken.findUnique({ where: { tokenHash } });
    if (!record) throw new BadRequestException('Invalid or expired reset token');
    if (record.expiresAt < new Date()) {
      await this.prisma.passwordResetToken.delete({ where: { tokenHash } });
      throw new BadRequestException('Reset token has expired. Please request a new one.');
    }

    const user = await this.prisma.user.findUnique({ where: { id: record.userId } });
    if (!user) throw new NotFoundException('User not found');

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await this.prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
    await this.prisma.passwordResetToken.delete({ where: { tokenHash } });

    return { message: 'Your password has been reset successfully. You can now log in.' };
  }

  private ensureUserIsActive(user: { isActive?: boolean }) {
    if (user.isActive === false) {
      throw new UnauthorizedException(ACCOUNT_DEACTIVATED_MESSAGE);
    }
  }

  private ensureEmailVerified(user: { role: string; emailVerified?: boolean }) {
    if (this.requiresEmailVerification(user.role) && !user.emailVerified) {
      throw new UnauthorizedException('Email verification is pending. Please verify your email before continuing.');
    }
  }

  private requiresEmailVerification(role: string): role is EmailVerificationRole {
    return role === 'JOB_SEEKER' || role === 'EMPLOYER';
  }

  private createEmailVerificationToken() {
    const rawToken = crypto.randomBytes(32).toString('hex');
    return {
      rawToken,
      tokenHash: this.hashToken(rawToken),
      expiresAt: new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS),
    };
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private generateTokens(user: {
    id: string;
    email: string;
    role: string;
    firstName?: string | null;
    lastName?: string | null;
  }) {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
    };
    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(
      { sub: user.id, type: 'refresh' },
      { expiresIn: (this.config.get<string>('JWT_REFRESH_EXPIRES_IN') ?? '30d') as any },
    );
    return { accessToken, refreshToken, role: user.role };
  }
}
