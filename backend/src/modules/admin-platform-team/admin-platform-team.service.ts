import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../database/prisma.service';
import { EmailService } from '../email/email.service';
import { frontendBaseUrl } from '../../common/utils/app-url.util';
import { generateTempPassword } from '../../common/utils/tokens.util';
import { normalizePhoneNumber } from '../../common/utils/phone.util';
import { CreatePlatformMemberDto } from './dto/create-platform-member.dto';
import { UpdatePlatformMemberDto } from './dto/update-platform-member.dto';

const BCRYPT_COST = 12;

@Injectable()
export class AdminPlatformTeamService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
  ) {}

  async listAssignableRoles() {
    return this.prisma.role.findMany({
      where: { orgId: null, scope: 'platform', status: 'active' },
      orderBy: { sortOrder: 'asc' },
      select: { id: true, key: true, name: true, description: true, scope: true },
    });
  }

  async list() {
    const users = await this.prisma.user.findMany({
      where: {
        orgId: null,
        userRoles: { some: { role: { scope: 'platform' } } },
      },
      orderBy: { createdAt: 'asc' },
      include: {
        userRoles: {
          include: { role: { select: { key: true, name: true, scope: true } } },
        },
      },
    });

    return users.map((user) => this.toMember(user));
  }

  async create(dto: CreatePlatformMemberDto) {
    const email = dto.email.trim().toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException('This email is already assigned to another user.');
    }

    const phoneNumber = dto.phoneNumber
      ? normalizePhoneNumber(dto.phoneNumber)
      : undefined;
    if (phoneNumber) {
      const existingByPhone = await this.prisma.user.findFirst({
        where: { phoneNumber },
      });
      if (existingByPhone) {
        throw new ConflictException(
          'This mobile number is already assigned to another user.',
        );
      }
    }

    const roleIds = await this.resolvePlatformRoleIds(dto.role);
    const rawPassword = dto.password || generateTempPassword();
    const passwordHash = await bcrypt.hash(rawPassword, BCRYPT_COST);
    const now = new Date();

    const user = await this.prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          orgId: null,
          firstName: dto.firstName.trim(),
          lastName: dto.lastName.trim(),
          email,
          phoneNumber,
          passwordHash,
          status: 'active',
          approvedAt: now,
          emailVerifiedAt: now,
          // Credentials go out by email — the member must set their own
          // password on first login before the console is reachable (enforced
          // server-side in SuperAdminGuard, mirrors the Org Admin-created
          // user flow in provisionInvitedUser). Cleared by
          // AuthService.changePassword once they choose a new password.
          mustChangePassword: true,
          onboardingStep: 'completed',
        },
      });
      await tx.userRole.createMany({
        data: roleIds.map((roleId) => ({ userId: created.id, roleId })),
      });
      return created;
    });

    const role = await this.prisma.role.findFirst({
      where: { orgId: null, key: dto.role },
    });

    await this.email
      .sendInviteEmail({
        to: user.email,
        recipientName: `${dto.firstName} ${dto.lastName}`.trim(),
        orgName: 'iPixxel Realty',
        role: role?.name ?? 'Super Admin',
        tempPassword: rawPassword,
        loginUrl: `${frontendBaseUrl()}/admin-login`,
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`[Platform Team] Invite email failed for ${user.email}: ${message}`);
      });

    return this.getById(user.id);
  }

  async update(id: string, actorUserId: string, dto: UpdatePlatformMemberDto) {
    const member = await this.requireMember(id);

    if (dto.status === 'disabled' && id === actorUserId) {
      throw new ForbiddenException('You cannot disable your own account');
    }
    if (dto.status === 'disabled') {
      await this.assertNotLastSuperAdmin(id);
    }

    if (dto.email) {
      const email = dto.email.trim().toLowerCase();
      const clash = await this.prisma.user.findFirst({
        where: { email, NOT: { id } },
      });
      if (clash) {
        throw new ConflictException('This email is already assigned to another user.');
      }
    }

    let phoneNumber: string | undefined;
    if (dto.phoneNumber !== undefined) {
      phoneNumber = dto.phoneNumber
        ? normalizePhoneNumber(dto.phoneNumber)
        : undefined;
      if (phoneNumber) {
        const clash = await this.prisma.user.findFirst({
          where: { phoneNumber, NOT: { id } },
        });
        if (clash) {
          throw new ConflictException(
            'This mobile number is already assigned to another user.',
          );
        }
      }
    }

    let passwordHash: string | undefined;
    if (dto.password) {
      passwordHash = await bcrypt.hash(dto.password, BCRYPT_COST);
    }

    // Disabling a member must also end any live session immediately: stamp
    // tokenInvalidBefore so a still-valid access token is rejected on its next
    // request (SuperAdminGuard -> USER_INACTIVE -> frontend force-logout) and
    // revoke refresh tokens so it cannot be silently renewed. Re-enabling
    // deliberately does NOT clear the stamp — a disabled member's old session
    // stays dead and they must sign in again. Mirrors setOrgUserStatus.
    const disabling = dto.status === 'disabled';
    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id },
        data: {
          ...(dto.firstName ? { firstName: dto.firstName.trim() } : {}),
          ...(dto.lastName ? { lastName: dto.lastName.trim() } : {}),
          ...(dto.email ? { email: dto.email.trim().toLowerCase() } : {}),
          ...(dto.phoneNumber !== undefined ? { phoneNumber: phoneNumber ?? null } : {}),
          ...(dto.status ? { status: dto.status } : {}),
          ...(passwordHash ? { passwordHash } : {}),
          ...(passwordHash || disabling ? { tokenInvalidBefore: now } : {}),
        },
      });

      if (passwordHash || disabling) {
        await tx.refreshToken.updateMany({
          where: { userId: id, revokedAt: null },
          data: { revokedAt: now },
        });
      }

      if (dto.role) {
        const roleIds = await this.resolvePlatformRoleIds(dto.role);
        await tx.userRole.deleteMany({ where: { userId: id } });
        await tx.userRole.createMany({
          data: roleIds.map((roleId) => ({ userId: id, roleId })),
        });
      }
    });

    // Notify the member when a Super Admin flips their access on or off —
    // reuses the existing account activated / deactivated email templates
    // (platform-level config, resolved with orgId null). Fire-and-forget:
    // a delivery failure must not fail the status change.
    if (dto.status && dto.status !== member.status) {
      const recipientName =
        [member.firstName, member.lastName].filter(Boolean).join(' ') || undefined;
      void this.email
        .sendUserAccountStatusEmail({
          to: member.email,
          recipientName,
          status: dto.status === 'active' ? 'activated' : 'deactivated',
          orgId: null,
          loginUrl: `${frontendBaseUrl()}/admin-login`,
        })
        .catch((err: unknown) => {
          const message = err instanceof Error ? err.message : String(err);
          console.error(
            `[Platform Team] Account ${dto.status} email failed for ${member.email}: ${message}`,
          );
        });
    }

    return this.getById(id);
  }

  async remove(id: string, actorUserId: string) {
    if (id === actorUserId) {
      throw new ForbiddenException('You cannot remove your own account');
    }
    await this.requireMember(id);
    await this.assertNotLastSuperAdmin(id);
    await this.prisma.user.delete({ where: { id } });
    return { ok: true };
  }

  private async getById(id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, orgId: null },
      include: {
        userRoles: {
          include: { role: { select: { key: true, name: true, scope: true } } },
        },
      },
    });
    if (!user) {
      throw new NotFoundException('Platform team member not found');
    }
    return this.toMember(user);
  }

  private async requireMember(id: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        id,
        orgId: null,
        userRoles: { some: { role: { scope: 'platform' } } },
      },
    });
    if (!user) {
      throw new NotFoundException('Platform team member not found');
    }
    return user;
  }

  private async resolvePlatformRoleIds(roleKey: string): Promise<string[]> {
    const selected = await this.prisma.role.findFirst({
      where: { orgId: null, key: roleKey, scope: 'platform', status: 'active' },
    });
    if (!selected) {
      throw new BadRequestException(
        `Role '${roleKey}' is not an assignable Super Admin / platform role`,
      );
    }

    const ids = [selected.id];
    return ids;
  }

  private async assertNotLastSuperAdmin(userId: string) {
    const isSuperAdmin = await this.prisma.userRole.findFirst({
      where: { userId, role: { key: 'super_admin' } },
    });
    if (!isSuperAdmin) return;

    const remaining = await this.prisma.user.count({
      where: {
        orgId: null,
        status: { not: 'disabled' },
        id: { not: userId },
        userRoles: { some: { role: { key: 'super_admin' } } },
      },
    });
    if (remaining < 1) {
      throw new BadRequestException(
        'Cannot remove or disable the last Super Admin on the platform team',
      );
    }
  }

  private toMember(user: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
    phoneNumber: string | null;
    status: string;
    createdAt: Date;
    userRoles: {
      role: { key: string; name: string; scope: string };
    }[];
  }) {
    const roles = user.userRoles
      .map((ur) => ur.role)
      .filter((r) => r.scope === 'platform');
    const assigned =
      roles.find((r) => r.key !== 'super_admin') ??
      roles.find((r) => r.key === 'super_admin') ??
      roles[0] ??
      null;

    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phoneNumber: user.phoneNumber,
      status: user.status,
      createdAt: user.createdAt,
      role: assigned,
      roles,
    };
  }
}
