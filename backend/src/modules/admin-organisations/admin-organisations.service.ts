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
  buildOrganisationUpdateData,
  toSafeOrganisation,
  toSafeUser,
} from '../../common/utils/mappers.util';
import {
  listOrgUsers,
  provisionInvitedUser,
  setOrgUserStatus,
} from '../../common/utils/org-users.util';
import { OnboardCompanyDto } from './dto/onboard-company.dto';
import { OnboardAdminDto } from './dto/onboard-admin.dto';
import { ActivateOrganisationDto } from './dto/activate-organisation.dto';
import { ListOrganisationsQueryDto } from './dto/list-organisations-query.dto';
import { UpdateOrganisationDto } from './dto/update-organisation.dto';
import { UpdateOrganisationStatusDto } from './dto/update-organisation-status.dto';
import { CreateOrgUserDto } from '../org-users/dto/create-org-user.dto';
import { UpdateOrgUserStatusDto } from '../org-users/dto/update-org-user-status.dto';
import { ListOrgUsersQueryDto } from '../org-users/dto/list-org-users-query.dto';
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

    // --- Validate plan + template assignment if provided ---
    let plan: any = null;
    if (dto.planId) {
      plan = await this.prisma.plan.findUnique({ where: { id: dto.planId } });
      if (!plan || !plan.isActive) throw new NotFoundException('Plan not found');
      const templateIds = dto.templateIds ?? [];
      if (templateIds.length > 0) {
        const templates = await this.prisma.template.findMany({ where: { id: { in: templateIds } } });
        if (templates.length !== templateIds.length) throw new BadRequestException('One or more templates not found');
        const limits = plan.limits as any;
        const rawLimit = limits?.templates;
        if (rawLimit && rawLimit !== 'All' && rawLimit !== 'Unlimited') {
          const max = parseInt(String(rawLimit), 10);
          if (!Number.isNaN(max) && templateIds.length > max) {
            throw new BadRequestException(`Plan "${plan.name}" allows max ${max} template(s), got ${templateIds.length}`);
          }
        }
      }
    } else if (dto.templateIds && dto.templateIds.length > 0) {
      // template assignment without plan — just validate templates exist
      const templates = await this.prisma.template.findMany({ where: { id: { in: dto.templateIds } } });
      if (templates.length !== dto.templateIds.length) throw new BadRequestException('One or more templates not found');
    }

    // Transactionally activate, create subscription and assignments
    const result = await this.prisma.$transaction(async (tx) => {
      const activated = await tx.organisation.update({
        where: { id: organisation.id },
        data: { status: 'active' },
      });

      let subscription: any = null;
      if (dto.planId && plan) {
        const billingCycle = dto.billingCycle ?? 'monthly';
        const isYearly = billingCycle === 'yearly';
        const amount = isYearly ? plan.priceYearly : plan.priceMonthly;
        const mrr = isYearly ? Math.round(amount / 12) : amount;
        const renewsAt = isYearly
          ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
          : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        subscription = await tx.subscription.create({
          data: {
            orgId: activated.id,
            planId: plan.id,
            billingCycle: billingCycle as any,
            status: 'active',
            amount,
            mrr,
            currency: dto.currency ?? 'INR',
            renewsAt,
          },
        });
      }

      if (dto.templateIds && dto.templateIds.length > 0) {
        const rows = dto.templateIds.map((tid) => ({
          orgId: activated.id,
          templateId: tid,
          assignedBy: actor.sub,
        }));
        await tx.organisationTemplate.createMany({ data: rows, skipDuplicates: true });
      }

      await tx.auditLog.create({
        data: {
          orgId: activated.id,
          actorId: actor.sub,
          action: 'org_onboarded',
          entity: 'Organisation',
          entityId: activated.id,
          metadata: { planId: dto.planId ?? null, templateIds: dto.templateIds ?? [] } as any,
        },
      });

      return { activated, subscription };
    });

    const tempPassword = this.pendingTempPasswords.get(organisation.id);
    this.pendingTempPasswords.delete(organisation.id);
    const loginLink = `${process.env.APP_URL ?? 'http://localhost:3000'}/login`;

    console.log(
      `[stub email] To: ${admin.email} | Subject: Welcome to BigEstate — your ${result.activated.name} account | ` +
        `Temporary password: ${tempPassword ?? '(unavailable — server restarted since admin creation)'} | Login: ${loginLink} | ` +
        `Plan: ${dto.planId ?? 'none'} | Templates: ${(dto.templateIds ?? []).length}`,
    );

    return {
      organisation: toSafeOrganisation(result.activated),
      admin: toSafeUser(admin),
      subscription: result.subscription
        ? { id: result.subscription.id, planId: result.subscription.planId, billingCycle: result.subscription.billingCycle }
        : null,
    };
  }

  async list(query: ListOrganisationsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    // Statuses that don't exist in the data yet — an empty page, not an error.
    if (query.status === 'trial' || query.status === 'suspended') {
      return { data: [], total: 0, page, limit };
    }

    const where: Prisma.OrganisationWhereInput = {};
    if (query.status === 'all' || !query.status) {
      // Drafts are incomplete onboarding attempts, never real customers —
      // excluded under every status filter, including "all".
      where.status = { not: 'draft' };
    } else if (query.status === 'pending') {
      where.status = 'pending';
    } else {
      where.status = query.status as any;
    }

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
            select: { email: true, firstName: true, lastName: true, phoneNumber: true },
          },
          _count: { select: { users: true, teams: true, organisationTemplates: true } },
        },
      }),
      this.prisma.organisation.count({ where }),
    ]);

    // Enrich with latest active subscription plan per org
    const orgIds = organisations.map((o) => o.id);
    const subs = orgIds.length
      ? await this.prisma.subscription.findMany({
          where: { orgId: { in: orgIds }, status: { not: 'cancelled' } },
          orderBy: { createdAt: 'desc' },
          include: { plan: true },
        })
      : [];
    const subByOrg = new Map<string, (typeof subs)[number]>();
    for (const s of subs) {
      if (!subByOrg.has(s.orgId)) subByOrg.set(s.orgId, s);
    }

    return {
      data: organisations.map((org) => {
        const sub = subByOrg.get(org.id) ?? null;
        const admin = org.users[0] ?? null;
        return {
          id: org.id,
          name: org.name,
          slug: org.slug,
          city: org.city,
          adminName: admin ? [admin.firstName, admin.lastName].filter(Boolean).join(' ') : null,
          adminEmail: admin?.email ?? null,
          adminPhone: admin?.phoneNumber ?? null,
          status: org.status,
          createdAt: org.createdAt,
          userCount: org._count.users,
          teamCount: (org._count as any).teams ?? 0,
          templatesCount: (org._count as any).organisationTemplates ?? 0,
          plan: sub ? { id: sub.plan.id, name: sub.plan.name, slug: sub.plan.slug, badge: sub.plan.badge, billingCycle: sub.billingCycle, amount: sub.amount } : null,
          mrr: sub?.mrr ?? sub?.amount ?? null,
        };
      }),
      total,
      page,
      limit,
    };
  }

  async summary() {
    const [total, active, pending] = await Promise.all([
      this.prisma.organisation.count({ where: { status: { not: 'draft' } } }),
      this.prisma.organisation.count({ where: { status: 'active' } }),
      this.prisma.organisation.count({ where: { status: 'pending' } }),
    ]);

    return { total, active, pending, onTrial: null, suspended: null };
  }

  async getById(id: string) {
    const organisation = await this.getRealOrganisation(id);

    const [admin, userCount, teamCount, subscription, assignedCount] = await Promise.all([
      this.prisma.user.findFirst({
        where: { orgId: id, userRoles: { some: { role: { key: 'admin' } } } },
      }),
      this.prisma.user.count({ where: { orgId: id } }),
      this.prisma.team.count({ where: { orgId: id } }),
      this.prisma.subscription.findFirst({
        where: { orgId: id, status: { not: 'cancelled' } },
        orderBy: { createdAt: 'desc' },
        include: { plan: true },
      }),
      this.prisma.organisationTemplate.count({ where: { orgId: id } }),
    ]);

    return {
      id: organisation.id,
      name: organisation.name,
      slug: organisation.slug,
      city: organisation.city,
      status: organisation.status,
      createdAt: organisation.createdAt,
      timezone: organisation.timezone,
      currency: organisation.currency,
      defaultLanguage: organisation.defaultLanguage,
      logoUrl: organisation.logoUrl,
      faviconUrl: organisation.faviconUrl,
      brandColour: organisation.brandColour,
      website: organisation.website,
      addressLine1: organisation.addressLine1,
      addressLine2: organisation.addressLine2,
      state: organisation.state,
      postalCode: organisation.postalCode,
      country: organisation.country,
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
      plan: subscription ? { id: subscription.plan.id, name: subscription.plan.name, slug: subscription.plan.slug, badge: subscription.plan.badge } : null,
      planValue: subscription?.amount ?? null,
      subscriptionRenewsAt: subscription?.renewsAt ?? null,
      assignedTemplates: assignedCount,
      subscription,
    };
  }

  async listUsers(id: string, query: ListOrgUsersQueryDto) {
    await this.getRealOrganisation(id);
    return listOrgUsers(this.prisma, id, query);
  }

  async createUser(id: string, dto: CreateOrgUserDto) {
    await this.getRealOrganisation(id);
    return provisionInvitedUser(this.prisma, id, dto);
  }

  async updateUserStatus(
    id: string,
    userId: string,
    dto: UpdateOrgUserStatusDto,
  ) {
    await this.getRealOrganisation(id);
    return setOrgUserStatus(this.prisma, id, userId, dto.status);
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
      data: buildOrganisationUpdateData(dto),
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

  async approvePending(
    orgId: string,
    actor: JwtPayload,
    dto: { planId?: string; billingCycle?: 'monthly' | 'yearly'; templateIds?: string[] },
  ) {
    const organisation = await this.prisma.organisation.findUnique({ where: { id: orgId } });
    if (!organisation) throw new NotFoundException('Organisation not found');
    if (organisation.status !== 'pending') throw new BadRequestException('Only pending organisations can be approved');

    let plan: any = null;
    if (dto.planId) {
      plan = await this.prisma.plan.findUnique({ where: { id: dto.planId } });
      if (!plan || !plan.isActive) throw new NotFoundException('Plan not found');
      const templateIds = dto.templateIds ?? [];
      if (templateIds.length > 0) {
        const templates = await this.prisma.template.findMany({ where: { id: { in: templateIds } } });
        if (templates.length !== templateIds.length) throw new BadRequestException('One or more templates not found');
        const limits = plan.limits as any;
        const rawLimit = limits?.templates;
        if (rawLimit && rawLimit !== 'All' && rawLimit !== 'Unlimited') {
          const max = parseInt(String(rawLimit), 10);
          if (!Number.isNaN(max) && templateIds.length > max) {
            throw new BadRequestException(`Plan "${plan.name}" allows max ${max} template(s), got ${templateIds.length}`);
          }
        }
      }
    } else if (dto.templateIds && dto.templateIds.length > 0) {
      const templates = await this.prisma.template.findMany({ where: { id: { in: dto.templateIds } } });
      if (templates.length !== dto.templateIds.length) throw new BadRequestException('One or more templates not found');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.organisation.update({ where: { id: orgId }, data: { status: 'active' } });
      let subscription: any = null;
      const existingSub = await tx.subscription.findFirst({ where: { orgId: updated.id, status: { not: 'cancelled' } } });
      if (dto.planId && plan && !existingSub) {
        const billingCycle = dto.billingCycle ?? 'monthly';
        const isYearly = billingCycle === 'yearly';
        const amount = isYearly ? plan.priceYearly : plan.priceMonthly;
        const mrr = isYearly ? Math.round(amount / 12) : amount;
        const renewsAt = isYearly ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        subscription = await tx.subscription.create({
          data: { orgId: updated.id, planId: plan.id, billingCycle: billingCycle as any, status: 'active', amount, mrr, currency: 'INR', renewsAt },
        });
      } else if (existingSub) {
        subscription = existingSub;
      }
      if (dto.templateIds && dto.templateIds.length > 0) {
        // If templates already assigned at registration, skipDuplicates handles, but if existing assignments exist, we merge
        await tx.organisationTemplate.createMany({
          data: dto.templateIds.map((tid) => ({ orgId: updated.id, templateId: tid, assignedBy: actor.sub })),
          skipDuplicates: true,
        });
      }
      await tx.auditLog.create({
        data: { orgId: updated.id, actorId: actor.sub, action: 'org_approved', entity: 'Organisation', entityId: updated.id, metadata: dto as any },
      });
      return { updated, subscription };
    });

    return { organisation: toSafeOrganisation(result.updated), subscription: result.subscription };
  }

  async rejectPending(orgId: string, actor: JwtPayload, reason?: string) {
    const org = await this.prisma.organisation.findUnique({ where: { id: orgId } });
    if (!org) throw new NotFoundException('Organisation not found');
    if (org.status !== 'pending') throw new BadRequestException('Only pending organisations can be rejected');
    // For now, disable the org and optionally keep user disabled? We'll set org to disabled
    const updated = await this.prisma.organisation.update({ where: { id: orgId }, data: { status: 'disabled' } });
    await this.prisma.auditLog.create({
      data: { orgId: updated.id, actorId: actor.sub, action: 'org_rejected', entity: 'Organisation', entityId: updated.id, metadata: { reason } as any },
    });
    return toSafeOrganisation(updated);
  }

  async getOrgTemplates(id: string) {
    await this.getRealOrganisation(id);
    const rows = await this.prisma.organisationTemplate.findMany({
      where: { orgId: id },
      include: { template: true },
    });
    return rows.map((r) => ({
      templateId: r.templateId,
      assignedAt: r.assignedAt,
      template: {
        id: r.template.id,
        name: r.template.name,
        slug: r.template.slug,
        thumbnail: r.template.thumbnail,
        category: r.template.category,
      },
    }));
  }

  async setOrgTemplates(id: string, actor: JwtPayload, templateIds: string[]) {
    await this.getRealOrganisation(id);
    // validate plan limits if subscription exists
    const sub = await this.prisma.subscription.findFirst({
      where: { orgId: id, status: { not: 'cancelled' } },
      include: { plan: true },
    });
    if (sub) {
      const limits = sub.plan.limits as any;
      const raw = limits?.templates;
      if (raw && raw !== 'All' && raw !== 'Unlimited') {
        const max = parseInt(String(raw), 10);
        if (!Number.isNaN(max) && templateIds.length > max) {
          throw new BadRequestException(`Plan "${sub.plan.name}" allows max ${max} template(s), got ${templateIds.length}`);
        }
      }
    }
    if (templateIds.length > 0) {
      const found = await this.prisma.template.findMany({ where: { id: { in: templateIds } } });
      if (found.length !== templateIds.length) throw new BadRequestException('One or more templates not found');
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.organisationTemplate.deleteMany({ where: { orgId: id } });
      if (templateIds.length > 0) {
        await tx.organisationTemplate.createMany({
          data: templateIds.map((tid) => ({ orgId: id, templateId: tid, assignedBy: actor.sub })),
        });
      }
      await tx.auditLog.create({
        data: { orgId: id, actorId: actor.sub, action: 'org_templates_updated', entity: 'Organisation', entityId: id, metadata: { templateIds } as any },
      });
    });
    return this.getOrgTemplates(id);
  }

  async remove(id: string, actor: JwtPayload) {
    const organisation = await this.getRealOrganisation(id);

    // users.orgId only SET NULLs on delete by default — deleting the org
    // alone would leave its accounts orphaned but still able to log in.
    // Removing the users first cascades their roles/tokens/team membership,
    // then the org delete cascades its teams and template assignments.
    await this.prisma.$transaction(async (tx) => {
      await tx.user.deleteMany({ where: { orgId: organisation.id } });
      await tx.organisation.delete({ where: { id: organisation.id } });
      await tx.auditLog.create({
        data: {
          orgId: null,
          actorId: actor.sub,
          action: 'org_deleted',
          entity: 'Organisation',
          entityId: organisation.id,
          metadata: { name: organisation.name, slug: organisation.slug },
        },
      });
    });

    return { success: true };
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
