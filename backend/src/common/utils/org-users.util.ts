import { ConflictException, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import type { Prisma } from '@prisma/client';
import type { PrismaService } from '../../database/prisma.service';
import { generateTempPassword } from './tokens.util';
import { toSafeUser } from './mappers.util';

const BCRYPT_COST_FACTOR = 12;

export const ASSIGNABLE_ROLES = ['admin', 'manager', 'sales'] as const;
export type AssignableRole = (typeof ASSIGNABLE_ROLES)[number];

export const ORG_USER_STATUS_VALUES = ['active', 'disabled'] as const;
export type OrgUserStatus = (typeof ORG_USER_STATUS_VALUES)[number];

type OrgUsersPrisma = Pick<
  PrismaService,
  'user' | 'role' | 'userRole' | 'refreshToken' | '$transaction'
>;

export interface ProvisionUserInput {
  // Optional — the invite path (POST /team/invite, the wizard's Invite
  // step) only collects email + role; the invited person fills in their
  // own name later. Org/Super Admin's "create user directly" callers
  // always pass real names (their own DTOs require them), so this being
  // optional here doesn't weaken that path.
  firstName?: string;
  lastName?: string;
  email: string;
  phoneNumber?: string;
  role: AssignableRole;
}

function sendStubInviteEmail(email: string, tempPassword: string) {
  // Stub — real email provider not wired up yet. A separate task will
  // replace this with a "set your password" link; keep the mechanism in
  // this one place so that change only needs to land here.
  console.log(
    `[stub email] To: ${email} | Subject: Your BigEstate account | Temporary password: ${tempPassword}`,
  );
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
    throw new ConflictException('Email already registered');
  }

  const role = await prisma.role.findUniqueOrThrow({
    where: { key: dto.role },
  });

  const tempPassword = generateTempPassword();
  const passwordHash = await bcrypt.hash(tempPassword, BCRYPT_COST_FACTOR);

  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        orgId,
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email,
        phoneNumber: dto.phoneNumber,
        passwordHash,
        status: 'active',
        mustChangePassword: true,
        // Invited users join an org that already exists — they never go
        // through the signup wizard themselves. Marking them 'completed'
        // from creation matters beyond bookkeeping: onboardingStep is what
        // gates the passwordless /auth/resume-signup endpoint (see
        // AuthService.resumeSignup). Leaving this at the schema default
        // ('account') would let anyone who knows an invited teammate's
        // email — not just self-signup admins mid-wizard — resume into a
        // live, no-password session on that org via that endpoint.
        onboardingStep: 'completed',
      },
    });

    await tx.userRole.create({
      data: { userId: created.id, roleId: role.id },
    });

    return created;
  });

  sendStubInviteEmail(user.email, tempPassword);
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
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  role?: AssignableRole;
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

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id },
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        phoneNumber: dto.phoneNumber,
      },
    });

    if (dto.role) {
      const role = await tx.role.findUniqueOrThrow({
        where: { key: dto.role },
      });
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
  const user = await prisma.user.findFirst({ where: { id, orgId } });
  if (!user) {
    throw new NotFoundException('User not found');
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
