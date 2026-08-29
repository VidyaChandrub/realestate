import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../database/prisma.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { JwtPayload } from '../../common/types/jwt-payload.interface';
import {
  generateRandomToken,
  hashToken,
  parseDuration,
} from '../../common/utils/tokens.util';
import { generateUniqueOrgSlug } from '../../common/utils/slug.util';
import {
  toSafeOrganisation,
  toSafeUser,
} from '../../common/utils/mappers.util';
import { assertTemplateQuota } from '../../common/utils/plan-quota.util';
import { assertEligibleTemplateIds } from '../../common/utils/template-eligibility.util';

const BCRYPT_COST_FACTOR = 12;

@Injectable()
export class AuthService {
  private readonly accessExpiresIn = process.env.JWT_ACCESS_EXPIRES_IN ?? '15m';
  private readonly refreshExpiresIn =
    process.env.JWT_REFRESH_EXPIRES_IN ?? '30d';

  // Ephemeral, single-instance only: password reset tokens. Email sending is
  // stubbed, so the token is returned to the client for local development.
  private readonly resetTokens = new Map<string, { email: string; expires: number }>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async signup(dto: SignupDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.work_email },
    });
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    // Validate plan + template selection if provided at registration
    let plan: any = null;
    const templateIds = dto.templateIds ?? [];
    if (dto.planId) {
      plan = await this.prisma.plan.findUnique({ where: { id: dto.planId } });
      if (!plan || !plan.isActive) throw new NotFoundException('Plan not found');
      if (templateIds.length > 0) {
        await assertEligibleTemplateIds(this.prisma, templateIds);
        assertTemplateQuota(plan, templateIds.length);
      }
    } else if (templateIds.length > 0) {
      // Template assignment without a plan — plan-based quota doesn't apply,
      // but eligibility (published, landing) still does.
      await assertEligibleTemplateIds(this.prisma, templateIds);
    }

    const slug = await generateUniqueOrgSlug(this.prisma, dto.company_name);
    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_COST_FACTOR);
    const adminRole = await this.prisma.role.findUniqueOrThrow({
      where: { key: 'admin' },
    });

    const { user, organisation } = await this.prisma.$transaction(
      async (tx) => {
        const organisation = await tx.organisation.create({
          data: {
            name: dto.company_name,
            slug,
            city: dto.city,
            status: 'pending',
            country: dto.country ?? null,
            currency: dto.currency ?? 'INR',
            timezone: dto.timezone ?? 'Asia/Kolkata',
          },
        });

        const user = await tx.user.create({
          data: {
            orgId: organisation.id,
            firstName: dto.first_name,
            lastName: dto.last_name,
            email: dto.work_email,
            phoneNumber: dto.phone_number,
            passwordHash,
            status: 'active',
          },
        });

        await tx.userRole.create({
          data: { userId: user.id, roleId: adminRole.id },
        });

        // Create subscription if plan selected at registration
        if (dto.planId && plan) {
          const billingCycle = dto.billingCycle ?? 'monthly';
          const isYearly = billingCycle === 'yearly';
          const amount = isYearly ? plan.priceYearly : plan.priceMonthly;
          const mrr = isYearly ? Math.round(amount / 12) : amount;
          const renewsAt = isYearly
            ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
            : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
          await tx.subscription.create({
            data: {
              orgId: organisation.id,
              planId: plan.id,
              billingCycle: billingCycle as any,
              status: 'active',
              amount,
              mrr,
              currency: 'INR',
              renewsAt,
            },
          });
        }

        if (dto.templateIds && dto.templateIds.length > 0) {
          await tx.organisationTemplate.createMany({
            data: dto.templateIds.map((tid) => ({ orgId: organisation.id, templateId: tid, assignedBy: user.id })),
          });
        }

        await tx.auditLog.create({
          data: {
            orgId: organisation.id,
            actorId: user.id,
            action: 'org_registered_pending',
            entity: 'Organisation',
            entityId: organisation.id,
            metadata: { planId: dto.planId ?? null, templateIds: dto.templateIds ?? [], billingCycle: dto.billingCycle ?? null } as any,
          },
        });

        return { user, organisation };
      },
    );

    // Do NOT issue tokens — organisation is pending approval, user cannot log in yet
    return {
      organisation: toSafeOrganisation(organisation),
      user: toSafeUser(user),
      pending: true,
      message: 'Organisation created — pending super admin approval. You will be able to log in after approval.',
    };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: { userRoles: { include: { role: true } } },
    });

    if (!user || user.status !== 'active') {
      throw new UnauthorizedException('Invalid email or password');
    }

    const passwordMatches = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );
    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Org approval check — pending organisations cannot log in until super admin approves
    if (user.orgId) {
      const org = await this.prisma.organisation.findUnique({ where: { id: user.orgId } });
      if (org && org.status === 'pending') {
        throw new UnauthorizedException('Organisation pending approval — please wait for super admin approval');
      }
      if (org && org.status === 'disabled') {
        throw new UnauthorizedException('Organisation is disabled');
      }
      if (org && org.status === 'draft') {
        throw new UnauthorizedException('Organisation not yet activated');
      }
    }

    const roles = user.userRoles.map((userRole) => userRole.role.key);
    const tokens = await this.issueTokens(user.id, user.orgId, roles);

    return { user: toSafeUser(user), ...tokens };
  }

  async refresh(rawToken: string) {
    const existing = await this.findActiveRefreshToken(rawToken);

    const user = await this.prisma.user.findUnique({
      where: { id: existing.userId },
      include: { userRoles: { include: { role: true } } },
    });
    if (!user || user.status !== 'active') {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    await this.prisma.refreshToken.update({
      where: { id: existing.id },
      data: { revokedAt: new Date() },
    });

    const roles = user.userRoles.map((userRole) => userRole.role.key);
    return this.issueTokens(user.id, user.orgId, roles);
  }

  async logout(rawToken: string) {
    const tokenHash = hashToken(rawToken);
    const existing = await this.prisma.refreshToken.findFirst({
      where: { tokenHash },
    });

    if (existing && !existing.revokedAt) {
      await this.prisma.refreshToken.update({
        where: { id: existing.id },
        data: { revokedAt: new Date() },
      });
    }

    return { success: true };
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { organisation: true },
    });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    const organisation = user.organisation
      ? toSafeOrganisation(user.organisation)
      : null;
    return { user: toSafeUser(user), organisation };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const matches = await bcrypt.compare(dto.current_password, user.passwordHash);
    if (!matches) {
      throw new UnauthorizedException('Current password is incorrect');
    }
    if (dto.current_password === dto.new_password) {
      throw new UnauthorizedException(
        'New password must be different from your current password',
      );
    }

    const passwordHash = await bcrypt.hash(dto.new_password, BCRYPT_COST_FACTOR);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash, mustChangePassword: false },
    });
    return { success: true };
  }

  async forgotPassword(
    email: string,
  ): Promise<{ success: boolean; resetToken?: string }> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    // Always report success to avoid account enumeration.
    if (!user) {
      return { success: true };
    }
    const token = generateRandomToken(32);
    this.resetTokens.set(token, {
      email: user.email,
      expires: Date.now() + 1000 * 60 * 60,
    });
    // TODO: send a real email; for now return the token so local dev can complete the flow.
    return { success: true, resetToken: token };
  }

  async resetPassword(
    token: string,
    newPassword: string,
  ): Promise<{ success: boolean }> {
    const entry = this.resetTokens.get(token);
    if (!entry || entry.expires < Date.now()) {
      throw new UnauthorizedException('Invalid or expired reset token');
    }
    const user = await this.prisma.user.findUnique({
      where: { email: entry.email },
    });
    if (!user) {
      throw new UnauthorizedException('Invalid or expired reset token');
    }
    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_COST_FACTOR);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, mustChangePassword: false },
    });
    this.resetTokens.delete(token);
    return { success: true };
  }

  private async findActiveRefreshToken(rawToken: string) {
    const tokenHash = hashToken(rawToken);
    const existing = await this.prisma.refreshToken.findFirst({
      where: { tokenHash },
    });

    if (!existing || existing.revokedAt || existing.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    return existing;
  }

  private async issueTokens(
    userId: string,
    orgId: string | null,
    roles: string[],
  ) {
    const payload: JwtPayload = { sub: userId, orgId, roles };
    const accessToken = await this.jwtService.signAsync(
      payload as object,
      {
        secret: process.env.JWT_SECRET,
        expiresIn: this.accessExpiresIn,
      } as Parameters<JwtService['signAsync']>[1],
    );

    const rawRefreshToken = generateRandomToken();
    const tokenHash = hashToken(rawRefreshToken);
    const expiresAt = new Date(
      Date.now() + parseDuration(this.refreshExpiresIn),
    );

    await this.prisma.refreshToken.create({
      data: { userId, tokenHash, expiresAt },
    });

    return { access_token: accessToken, refresh_token: rawRefreshToken };
  }
}
