import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../database/prisma.service';
import { JwtPayload } from '../../common/types/jwt-payload.interface';
import { generateUniqueLandingPageSlug, generateUniqueOrgSlug } from '../../common/utils/slug.util';
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
import { assertTemplateQuota } from '../../common/utils/plan-quota.util';
import { assertEligibleTemplateIds } from '../../common/utils/template-eligibility.util';
import { OnboardCompanyDto } from './dto/onboard-company.dto';
import { OnboardAdminDto } from './dto/onboard-admin.dto';
import { ActivateOrganisationDto } from './dto/activate-organisation.dto';
import { ListOrganisationsQueryDto } from './dto/list-organisations-query.dto';
import { UpdateOrganisationDto } from './dto/update-organisation.dto';
import { UpdateOrganisationStatusDto } from './dto/update-organisation-status.dto';
import { LogoUploadUrlDto } from './dto/logo-upload-url.dto';
import { StorageService } from '../../common/storage/storage.service';
import { CreateOrgUserDto } from '../org-users/dto/create-org-user.dto';
import { UpdateOrgUserStatusDto } from '../org-users/dto/update-org-user-status.dto';
import { ListOrgUsersQueryDto } from '../org-users/dto/list-org-users-query.dto';
import { subdomainHost } from '../../common/utils/domain.util';
import { buildNotificationData } from '../../common/utils/notifications.util';
import type { Prisma } from '@prisma/client';

const BCRYPT_COST_FACTOR = 12;

@Injectable()
export class AdminOrganisationsService {
  // Ephemeral, single-instance only: bridges the temp password generated in
  // onboardAdmin to the stub credential email sent at activate — by design,
  // never persisted in plaintext and never returned to the client. A server
  // restart between the two steps just means the email log can't include it.
  private readonly pendingTempPasswords = new Map<string, string>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

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
    const templateIds = dto.templateIds ?? [];
    if (dto.planId) {
      plan = await this.prisma.plan.findUnique({ where: { id: dto.planId } });
      if (!plan || !plan.isActive) throw new NotFoundException('Plan not found');
      if (templateIds.length > 0) {
        await assertEligibleTemplateIds(this.prisma, templateIds);
        assertTemplateQuota(plan, templateIds.length);
      }
    } else if (templateIds.length > 0) {
      // template assignment without plan — eligibility still applies
      await assertEligibleTemplateIds(this.prisma, templateIds);
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
          subdomain: org.subdomain,
          subdomainHost: org.subdomain ? subdomainHost(org.subdomain) : null,
          subdomainStatus: org.subdomainStatus,
          customDomain: org.customDomain,
          customDomainStatus: org.customDomainStatus,
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
      subdomain: organisation.subdomain,
      subdomainHost: organisation.subdomain ? subdomainHost(organisation.subdomain) : null,
      subdomainStatus: organisation.subdomainStatus,
      customDomain: organisation.customDomain,
      customDomainStatus: organisation.customDomainStatus,
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

  // Presigned PUT URL for the target org's logo or favicon, used by the
  // Super Admin org-detail edit form. Same StorageService rules as the
  // signup wizard — the key is scoped to this org's id (path param,
  // already validated to be a real org above), never a client value.
  async createAssetUploadUrl(
    id: string,
    field: 'logo' | 'favicon',
    dto: LogoUploadUrlDto,
  ) {
    await this.getRealOrganisation(id);
    return this.storage.createUploadUrl({
      orgId: id,
      field,
      filename: dto.filename,
      contentType: dto.contentType,
      size: dto.size,
    });
  }

  async updateStatus(id: string, dto: UpdateOrganisationStatusDto) {
    const existing = await this.getRealOrganisation(id);

    const updated = await this.prisma.organisation.update({
      where: { id },
      data: {
        status: dto.status,
        ...(dto.status === 'active' && existing.subdomain && existing.subdomainStatus === 'pending'
          ? { subdomainStatus: 'active' }
          : {}),
      },
    });

    if (dto.status === 'active' && existing.subdomain) {
      await this.prisma.orgDomainRequest.updateMany({
        where: { orgId: id, kind: 'subdomain', status: 'pending' },
        data: { status: 'approved', reviewedAt: new Date() },
      });
    }

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
    const templateIds = dto.templateIds ?? [];
    if (dto.planId) {
      plan = await this.prisma.plan.findUnique({ where: { id: dto.planId } });
      if (!plan || !plan.isActive) throw new NotFoundException('Plan not found');
      if (templateIds.length > 0) {
        await assertEligibleTemplateIds(this.prisma, templateIds);
        assertTemplateQuota(plan, templateIds.length);
      }
    } else if (templateIds.length > 0) {
      await assertEligibleTemplateIds(this.prisma, templateIds);
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

      // Auto-activate the organisation's subdomain on approval so it becomes
      // immediately reachable on the platform wildcard, and provision the
      // organisation's primary website from the first assigned template so the
      // subdomain resolves to that template + its data (subdomain -> org ->
      // template).
      const primarySubdomain = organisation.subdomain ?? null;
      if (organisation.subdomain) {
        await tx.organisation.update({
          where: { id: orgId },
          data: { subdomainStatus: 'active' },
        });
        await tx.orgDomainRequest.updateMany({
          where: { orgId, kind: 'subdomain', status: 'pending' },
          data: {
            status: 'approved',
            reviewedAt: new Date(),
            reviewedBy: actor.sub,
          },
        });
        const primaryTemplateId = dto.templateIds?.[0] ?? null;
        const existingPrimary = await tx.landingPage.findFirst({
          where: { orgId, subdomainStatus: { not: 'none' } },
          select: { id: true },
        });
        if (!existingPrimary && primaryTemplateId) {
          const tpl = await tx.template.findUnique({
            where: { id: primaryTemplateId },
            include: { childPages: { where: { pageType: 'thank_you' }, take: 1 } },
          });
          if (tpl) {
            const baseSlug = await generateUniqueLandingPageSlug(
              tx,
              orgId,
              tpl.name,
            );
            const primary = await tx.landingPage.create({
              data: {
                orgId,
                sourceTemplateId: tpl.id,
                name: tpl.name,
                slug: baseSlug,
                pageType: 'landing',
                status: 'published',
                publishedAt: new Date(),
                subdomain: primarySubdomain,
                subdomainStatus: 'active',
                content: (tpl.content as Prisma.JsonObject) ?? {},
              },
            });
            if (tpl.childPages?.[0]) {
              await tx.landingPage.create({
                data: {
                  orgId,
                  sourceTemplateId: tpl.childPages[0].id,
                  name: tpl.childPages[0].name,
                  slug: `${baseSlug}-thank-you`,
                  pageType: 'thank_you',
                  status: 'published',
                  publishedAt: new Date(),
                  parentId: primary.id,
                  content: (tpl.childPages[0].content as Prisma.JsonObject) ?? {},
                },
              });
            }
          }
        }
      }

      await tx.notification.create({
        data: buildNotificationData({
          orgId: orgId,
          type: 'organisation_approved',
          title: `Organisation approved: ${organisation.name}`,
          body: `${organisation.name} was approved and activated.${organisation.subdomain ? ` It is now live at ${subdomainHost(organisation.subdomain)}.` : ''}`,
          entity: 'Organisation',
          entityId: orgId,
        }),
      });

      return { updated, subscription };
    });

    return { organisation: toSafeOrganisation(result.updated), subscription: result.subscription };
  }

  async rejectPending(orgId: string, actor: JwtPayload, reason?: string) {
    const org = await this.prisma.organisation.findUnique({ where: { id: orgId } });
    if (!org) throw new NotFoundException('Organisation not found');
    if (org.status !== 'pending') throw new BadRequestException('Only pending organisations can be rejected');
    // For now, disable the org and reject any pending subdomain requests
    const updated = await this.prisma.organisation.update({ where: { id: orgId }, data: { status: 'disabled', subdomainStatus: 'rejected' } });
    await this.prisma.orgDomainRequest.updateMany({
      where: { orgId, kind: 'subdomain', status: 'pending' },
      data: {
        status: 'rejected',
        reviewedAt: new Date(),
        reviewedBy: actor.sub,
        rejectionReason: reason ?? 'Organisation was rejected',
      },
    });
    await this.prisma.auditLog.create({
      data: { orgId: updated.id, actorId: actor.sub, action: 'org_rejected', entity: 'Organisation', entityId: updated.id, metadata: { reason } as any },
    });
    await this.prisma.notification.create({
      data: buildNotificationData({
        orgId,
        type: 'organisation_rejected',
        title: `Organisation rejected: ${org.name}`,
        body: `${org.name} was rejected${reason ? ` — ${reason}` : ''}.`,
        entity: 'Organisation',
        entityId: orgId,
      }),
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
      assertTemplateQuota(sub.plan, templateIds.length);
    }
    if (templateIds.length > 0) {
      await assertEligibleTemplateIds(this.prisma, templateIds);
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

  async getOrgDomains(id: string) {
    const org = await this.getRealOrganisation(id);

    const [domainRequests, landingPages] = await Promise.all([
      this.prisma.domainRequest.findMany({
        where: { orgId: id },
        orderBy: { createdAt: 'desc' },
        include: {
          landingPage: { select: { id: true, name: true, slug: true, status: true } },
          logs: { orderBy: { checkedAt: 'desc' }, take: 5 },
        },
      }),
      this.prisma.landingPage.findMany({
        where: { orgId: id },
        select: {
          id: true,
          name: true,
          slug: true,
          status: true,
          subdomain: true,
          subdomainStatus: true,
          sourceTemplate: { select: { id: true, name: true } },
        },
      }),
    ]);

    return {
      subdomain: org.subdomain,
      subdomainHost: org.subdomain ? subdomainHost(org.subdomain) : null,
      subdomainStatus: org.subdomainStatus,
      customDomain: org.customDomain,
      customDomainStatus: org.customDomainStatus,
      domainRequests,
      landingPages,
    };
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
