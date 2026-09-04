import { ConflictException, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import type { Prisma } from '@prisma/client';
import type { PrismaService } from '../../database/prisma.service';
import { generateTempPassword } from './tokens.util';
import { toSafeUser } from './mappers.util';
import { normalizePhoneNumber } from './phone.util';

const BCRYPT_COST_FACTOR = 12;

export const ASSIGNABLE_ROLES = [
  'admin',
  'manager',
  'sales',
  'telecaller',
] as const;
export type AssignableRole = string;

export const ORG_USER_STATUS_VALUES = ['active', 'disabled'] as const;
export type OrgUserStatus = (typeof ORG_USER_STATUS_VALUES)[number];

type OrgUsersPrisma = Pick<
  PrismaService,
  'user' | 'role' | 'userRole' | 'refreshToken' | '$transaction'
>;

export interface ProvisionUserInput {
  firstName?: string;
  lastName?: string;
  email: string;
  phoneNumber?: string;
  role: string;
  password?: string;
}

function sendStubInviteEmail(email: string, tempPassword: string) {
  // Stub — real email provider not wired up yet. A separate task will
  // replace this with a "set your password" link; keep the mechanism in
  // this one place so that change only needs to land here.
  if (process.env.NODE_ENV !== 'production') {
    console.log(
      `[stub email] To: ${email} | Subject: Your BigEstate account | Temporary password: ${tempPassword}`,
    );
  }
}

// Shared invite mechanism — used by POST /team/invite, Org Admin and Super
// Admin user creation, and resend-invite, so password/email handling only
// lives in one place.
export async function provisionInvitedUser(
  prisma: OrgUsersPrisma,
  orgId: string,
  dto: ProvisionUserInput,
) {
  const existing = await prisma.user.findUnique({
    where: { email: dto.email },
  });
  if (existing) {
    throw new ConflictException(
      'This email is already assigned to another user.',
    );
  }

  const phoneNumber = dto.phoneNumber
    ? normalizePhoneNumber(dto.phoneNumber)
    : undefined;
  if (phoneNumber) {
    const existingByPhone = await prisma.user.findFirst({
      where: { phoneNumber },
    });
    if (existingByPhone) {
      throw new ConflictException(
        'This mobile number is already assigned to another user.',
      );
    }
  }

  const role = await prisma.role.findFirst({
    where: {
      key: dto.role,
      status: 'active',
      OR: [{ orgId: null }, { orgId }],
    },
  });
  if (!role) {
    throw new NotFoundException(`Role '${dto.role}' not found or inactive`);
  }

  const rawPassword = dto.password || generateTempPassword();
  const passwordHash = await bcrypt.hash(rawPassword, BCRYPT_COST_FACTOR);
  // Organisation Admin-created users must choose their own password at first login,
  // regardless of whether the admin supplied an initial password.
  const mustChangePassword = true;

  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        orgId,
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email,
        phoneNumber,
        passwordHash,
        status: 'active',
        mustChangePassword,
        onboardingStep: 'completed',
      },
    });

    await tx.userRole.create({
      data: { userId: created.id, roleId: role.id },
    });

    return created;
  });

  if (!dto.password) {
    sendStubInviteEmail(user.email, rawPassword);
  }
  return toSafeUser(user);
}

// Re-issues a temp password for a user who hasn't completed setup yet
// (mustChangePassword is the only signal the schema currently offers — there
// is no lastLoginAt field to check against).
export async function reissueInvite(
  prisma: OrgUsersPrisma,
  userId: string,
  orgId: string,
) {
  const user = await prisma.user.findFirst({ where: { id: userId, orgId } });
  if (!user) {
    throw new NotFoundException('User not found');
  }

  const tempPassword = generateTempPassword();
  const passwordHash = await bcrypt.hash(tempPassword, BCRYPT_COST_FACTOR);

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { passwordHash, mustChangePassword: true },
  });

  sendStubInviteEmail(updated.email, tempPassword);
  return toSafeUser(updated);
}

export interface OrgUsersQuery {
  page?: number;
  limit?: number;
  search?: string;
  role?: AssignableRole;
  status?: OrgUserStatus;
}

// Shared by GET /org/users (Org Admin, self-scoped) and
// GET /admin/organisations/:id/users (Super Admin, any org).
export async function listOrgUsers(
  prisma: OrgUsersPrisma,
  orgId: string,
  query: OrgUsersQuery,
) {
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;

  const where: Prisma.UserWhereInput = { orgId };
  if (query.status) {
    where.status = query.status;
  }
  if (query.role) {
    where.userRoles = { some: { role: { key: query.role } } };
  }
  if (query.search) {
    const search = query.search;
    where.OR = [
      { firstName: { contains: search, mode: 'insensitive' } },
      { lastName: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      include: {
        userRoles: { include: { role: true } },
        teamMembers: true,
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.user.count({ where }),
  ]);

  return {
    data: users.map((user) => ({
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phoneNumber: user.phoneNumber,
      role: user.userRoles[0]
        ? { key: user.userRoles[0].role.key, name: user.userRoles[0].role.name }
        : null,
      status: user.status,
      createdAt: user.createdAt,
      mustChangePassword: user.mustChangePassword,
      // Teams have no creation/membership UI yet, so this is always false in
      // practice today — computed for real (not hardcoded) so it needs no
      // reshaping once team membership ships.
      hasTeam: user.teamMembers.length > 0,
    })),
    total,
    page,
    limit,
  };
}

export async function getOrgUserById(
  prisma: OrgUsersPrisma,
  orgId: string,
  id: string,
) {
  const user = await prisma.user.findFirst({
    where: { id, orgId },
    include: {
      userRoles: { include: { role: true } },
      teamMembers: true,
    },
  });
  if (!user) {
    throw new NotFoundException('User not found');
  }

  return {
    ...toSafeUser(user),
    role: user.userRoles[0]
      ? { key: user.userRoles[0].role.key, name: user.userRoles[0].role.name }
      : null,
    hasTeam: user.teamMembers.length > 0,
  };
}

export interface UpdateOrgUserInput {
  email?: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  role?: string;
  password?: string;
}

export async function updateOrgUser(
  prisma: OrgUsersPrisma,
  orgId: string,
  id: string,
  dto: UpdateOrgUserInput,
) {
  const existing = await prisma.user.findFirst({ where: { id, orgId } });
  if (!existing) {
    throw new NotFoundException('User not found');
  }

  if (dto.email && dto.email !== existing.email) {
    const emailTaken = await prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (emailTaken) {
      throw new ConflictException(
        'This email is already assigned to another user.',
      );
    }
  }

  const phoneNumber =
    dto.phoneNumber === undefined
      ? undefined
      : normalizePhoneNumber(dto.phoneNumber);
  if (phoneNumber && phoneNumber !== existing.phoneNumber) {
    const phoneTaken = await prisma.user.findFirst({
      where: { phoneNumber, id: { not: id } },
    });
    if (phoneTaken) {
      throw new ConflictException(
        'This mobile number is already assigned to another user.',
      );
    }
  }

  await prisma.$transaction(async (tx) => {
    const dataToUpdate: Prisma.UserUpdateInput = {
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email,
      phoneNumber,
    };

    if (dto.password) {
      dataToUpdate.passwordHash = await bcrypt.hash(
        dto.password,
        BCRYPT_COST_FACTOR,
      );
      dataToUpdate.mustChangePassword = true;
    }

    await tx.user.update({
      where: { id },
      data: dataToUpdate,
    });

    if (dto.role) {
      const role = await tx.role.findFirst({
        where: {
          key: dto.role,
          status: 'active',
          OR: [{ orgId: null }, { orgId }],
        },
      });
      if (!role) {
        throw new NotFoundException(`Role '${dto.role}' not found or inactive`);
      }
      await tx.userRole.deleteMany({ where: { userId: id } });
      await tx.userRole.create({ data: { userId: id, roleId: role.id } });
    }
  });

  return getOrgUserById(prisma, orgId, id);
}

// Shared by the Org Admin's own PATCH /org/users/:id/status (which also
// forbids self-deactivation) and the Super Admin's equivalent endpoint.
export async function setOrgUserStatus(
  prisma: OrgUsersPrisma,
  orgId: string,
  id: string,
  status: OrgUserStatus,
) {
  const user = await prisma.user.findFirst({
    where: { id, orgId },
    include: { userRoles: { include: { role: true } } },
  });
  if (!user) {
    throw new NotFoundException('User not found');
  }
  if (
    status === 'disabled' &&
    user.userRoles.some(({ role }) => role.key === 'admin')
  ) {
    throw new ConflictException('Admin users cannot be deactivated.');
  }

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.user.update({ where: { id }, data: { status } });
    if (status === 'disabled') {
      await tx.refreshToken.updateMany({
        where: { userId: id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
    return result;
  });

  return toSafeUser(updated);
}
