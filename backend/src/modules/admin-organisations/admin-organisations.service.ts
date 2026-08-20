import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../database/prisma.service';
import { JwtPayload } from '../../common/types/jwt-payload.interface';
import { generateUniqueOrgSlug } from '../../common/utils/slug.util';
import { generateTempPassword } from '../../common/utils/tokens.util';
import {
  toSafeOrganisation,
  toSafeUser,
} from '../../common/utils/mappers.util';
import { OnboardCompanyDto } from './dto/onboard-company.dto';
import { OnboardAdminDto } from './dto/onboard-admin.dto';
import { ActivateOrganisationDto } from './dto/activate-organisation.dto';
import { ListOrganisationsQueryDto } from './dto/list-organisations-query.dto';
import { UpdateOrganisationDto } from './dto/update-organisation.dto';
import { UpdateOrganisationStatusDto } from './dto/update-organisation-status.dto';
import type { Prisma } from '@prisma/client';

const BCRYPT_COST_FACTOR = 12;

@Injectable()
export class AdminOrganisationsService {
  // Ephemeral, single-instance only: bridges the temp password generated in
  // onboardAdmin to the stub credential email sent at activate — by design,
  // never persisted in plaintext and never returned to the client. A server
  // restart between the two steps just means the email log can't include it.
  private readonly pendingTempPasswords = new Map<string, string>();

  constructor(private readonly prisma: PrismaService) {}

  async onboardCompany(dto: OnboardCompanyDto) {
    const slug = await generateUniqueOrgSlug(this.prisma, dto.company_name);

    const organisation = await this.prisma.organisation.create({
      data: { name: dto.company_name, city: dto.city, slug, status: 'draft' },
    });

    return { orgId: organisation.id, slug: organisation.slug };
  }

  async onboardAdmin(orgId: string, dto: OnboardAdminDto) {
    const organisation = await this.getDraftOrganisation(orgId);

    const existingAdmin = await this.prisma.user.findFirst({
      where: { orgId: organisation.id },
    });
    if (existingAdmin) {
      throw new ConflictException(
        'An admin account already exists for this organisation',
      );
    }

    const existingEmail = await this.prisma.user.findUnique({
      where: { email: dto.work_email },
    });
    if (existingEmail) {
      throw new ConflictException('Email already registered');
    }

    const adminRole = await this.prisma.role.findUniqueOrThrow({
      where: { key: 'admin' },
    });

    const tempPassword = generateTempPassword();
    const passwordHash = await bcrypt.hash(tempPassword, BCRYPT_COST_FACTOR);

    const user = await this.prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          orgId: organisation.id,
          firstName: dto.first_name,
          lastName: dto.last_name,
          email: dto.work_email,
          phoneNumber: dto.phone_number,
          passwordHash,
          status: 'active',
          mustChangePassword: dto.force_password_change ?? true,
        },
      });

      await tx.userRole.create({
        data: { userId: created.id, roleId: adminRole.id },
      });

      return created;
    });

    this.pendingTempPasswords.set(organisation.id, tempPassword);

    return toSafeUser(user);
  }

  async activate(
    orgId: string,
    actor: JwtPayload,
    dto: ActivateOrganisationDto,
  ) {
    const organisation = await this.getDraftOrganisation(orgId);

    const admin = await this.prisma.user.findFirst({
      where: { orgId: organisation.id },
    });
    if (!admin) {
      throw new BadRequestException(
        'Complete the admin account step before activating',
      );
    }

    const activated = await this.prisma.organisation.update({
      where: { id: organisation.id },
      data: { status: 'active' },
    });

    const templateIds = dto.template_ids ?? [];

    await this.prisma.auditLog.create({
      data: {
        orgId: activated.id,
        actorId: actor.sub,
        action: 'org_onboarded',
        entity: 'Organisation',
        entityId: activated.id,
        // Templates & modules isn't built yet (separate task) — stashed here
        // so that work can pick up which templates were requested at
        // onboarding time without needing its own endpoint yet.
        metadata: { template_ids: templateIds },
      },
    });

    const tempPassword = this.pendingTempPasswords.get(organisation.id);
    this.pendingTempPasswords.delete(organisation.id);
    const loginLink = `${process.env.APP_URL ?? 'http://localhost:3000'}/login`;

    console.log(
      `[stub email] To: ${admin.email} | Subject: Welcome to BigEstate — your ${activated.name} account | ` +
        `Temporary password: ${tempPassword ?? '(unavailable — server restarted since admin creation)'} | Login: ${loginLink}`,
    );

    return {
      organisation: toSafeOrganisation(activated),
      admin: toSafeUser(admin),
    };
  }

  async list(query: ListOrganisationsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    // Statuses that don't exist in the data yet — an empty page, not an error.
    if (query.status === 'trial' || query.status === 'suspended') {
      return { data: [], total: 0, page, limit };
    }

    const where: Prisma.OrganisationWhereInput = {
      // Drafts are incomplete onboarding attempts, never real customers —
      // excluded under every status filter, including "all".
      status:
        query.status === 'all' || !query.status
          ? { not: 'draft' }
          : query.status,
    };

    if (query.search) {
      const search = query.search;
      where.AND = [
        {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { city: { contains: search, mode: 'insensitive' } },
            {
              users: {
                some: {
                  email: { contains: search, mode: 'insensitive' },
                },
              },
            },
          ],
        },
      ];
    }

    const [organisations, total] = await Promise.all([
      this.prisma.organisation.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          users: {
            where: { userRoles: { some: { role: { key: 'admin' } } } },
            take: 1,
            select: { email: true },
          },
          _count: { select: { users: true } },
        },
      }),
      this.prisma.organisation.count({ where }),
    ]);

    return {
      data: organisations.map((org) => ({
        id: org.id,
        name: org.name,
        slug: org.slug,
        city: org.city,
        adminEmail: org.users[0]?.email ?? null,
        status: org.status,
        createdAt: org.createdAt,
        userCount: org._count.users,
        plan: null,
        landingPagesCount: null,
        mrr: null,
      })),
      total,
      page,
      limit,
    };
  }

  async summary() {
    const [total, active] = await Promise.all([
      this.prisma.organisation.count({ where: { status: { not: 'draft' } } }),
      this.prisma.organisation.count({ where: { status: 'active' } }),
    ]);

    return { total, active, onTrial: null, suspended: null };
  }

  async getById(id: string) {
    const organisation = await this.getRealOrganisation(id);

    const [admin, userCount, teamCount] = await Promise.all([
      this.prisma.user.findFirst({
        where: { orgId: id, userRoles: { some: { role: { key: 'admin' } } } },
      }),
      this.prisma.user.count({ where: { orgId: id } }),
      this.prisma.team.count({ where: { orgId: id } }),
    ]);

    return {
      id: organisation.id,
      name: organisation.name,
      slug: organisation.slug,
      city: organisation.city,
      status: organisation.status,
      createdAt: organisation.createdAt,
      admin: admin
        ? {
            firstName: admin.firstName,
            lastName: admin.lastName,
            email: admin.email,
            phoneNumber: admin.phoneNumber,
          }
        : null,
      userCount,
      teamCount,
      plan: null,
      landingPagesCount: null,
      landingPagesPublished: null,
      leadsCaptured: null,
      leadsThisMonth: null,
      planValue: null,
      subscriptionRenewsAt: null,
    };
  }

  async listUsers(id: string) {
    await this.getRealOrganisation(id);

    const users = await this.prisma.user.findMany({
      where: { orgId: id },
      include: {
        userRoles: { include: { role: true } },
        teamMembers: { include: { team: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    return users.map((user) => ({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.userRoles[0]?.role.key ?? null,
      teams: user.teamMembers.map((membership) => membership.team.name),
    }));
  }

  async listActivity(id: string) {
    await this.getRealOrganisation(id);

    const logs = await this.prisma.auditLog.findMany({
      where: { orgId: id },
      orderBy: { createdAt: 'desc' },
    });

    return logs.map((log) => ({
      id: log.id,
      action: log.action,
      entity: log.entity,
      entityId: log.entityId,
      createdAt: log.createdAt,
    }));
  }

  async update(id: string, dto: UpdateOrganisationDto) {
    await this.getRealOrganisation(id);

    const updated = await this.prisma.organisation.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.city !== undefined ? { city: dto.city } : {}),
      },
    });

    return toSafeOrganisation(updated);
  }

  async updateStatus(id: string, dto: UpdateOrganisationStatusDto) {
    await this.getRealOrganisation(id);

    const updated = await this.prisma.organisation.update({
      where: { id },
      data: { status: dto.status },
    });

    return toSafeOrganisation(updated);
  }

  private async getDraftOrganisation(orgId: string) {
    const organisation = await this.prisma.organisation.findUnique({
      where: { id: orgId },
    });
    if (!organisation) {
      throw new NotFoundException('Organisation not found');
    }
    if (organisation.status !== 'draft') {
      throw new BadRequestException('Organisation is not in draft status');
    }
    return organisation;
  }

  // Drafts are incomplete onboarding attempts, not real customers — treated
  // as not-found everywhere outside the onboarding wizard itself.
  private async getRealOrganisation(id: string) {
    const organisation = await this.prisma.organisation.findUnique({
      where: { id },
    });
    if (!organisation || organisation.status === 'draft') {
      throw new NotFoundException('Organisation not found');
    }
    return organisation;
  }
}
