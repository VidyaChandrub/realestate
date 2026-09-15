import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { toLandingPageData } from '../admin-templates/template.mapper';
import { ListOrgTemplatesQueryDto } from './dto/list-org-templates-query.dto';
import { resolveTemplateQuota } from '../../common/utils/plan-quota.util';
import { getOrgActivePlan } from '../../common/utils/subscription-lifecycle.util';

// Templates are plan-quota based, not per-template priced — access is
// entirely determined by the OrganisationTemplate assignment made at
// signup or by a super admin, never by isPaid. Eligibility beyond that is
// just published + a real landing page (not a thank-you companion).
const ELIGIBLE_WHERE: Prisma.TemplateWhereInput = {
  status: 'published',
  pageType: 'landing',
};

@Injectable()
export class OrgTemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: ListOrgTemplatesQueryDto, orgId?: string | null) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.TemplateWhereInput = { ...ELIGIBLE_WHERE };
    if (query.category) {
      where.category = query.category;
    }
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { baseDesignName: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    // Org sees only its assigned templates — no assignments means no
    // templates, not "all templates" (that fallback was the old
    // globally-visible-free-templates rule, superseded by plan quotas).
    // OrgAdminGuard guarantees orgId is always present on this route, but
    // guard against a missing one resolving to "no filter" (= every org).
    const assigned = orgId
      ? await this.prisma.organisationTemplate.findMany({
          where: { orgId },
          select: { templateId: true },
        })
      : [];
    where.id = { in: assigned.map((a) => a.templateId) };

    const [templates, total] = await Promise.all([
      this.prisma.template.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.template.count({ where }),
    ]);

    return {
      data: templates.map((t) => {
        const mapped = toLandingPageData(t);
        return {
          id: mapped.id,
          name: mapped.name,
          slug: mapped.slug,
          thumbnail: mapped.thumbnail,
          category: mapped.category,
          template: mapped.template,
          updatedAt: mapped.updatedAt,
        };
      }),
      total,
      page,
      limit,
    };
  }

  async getAvailable(orgId: string) {
    const activePlanInfo = await getOrgActivePlan(this.prisma, orgId);
    const plan = activePlanInfo?.plan;
    const maxAllowed = resolveTemplateQuota(plan);

    const [allPublishedTemplates, assignedRecords] = await Promise.all([
      this.prisma.template.findMany({
        where: ELIGIBLE_WHERE,
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.organisationTemplate.findMany({
        where: { orgId },
        select: { templateId: true },
      }),
    ]);

    const assignedSet = new Set(assignedRecords.map((a) => a.templateId));
    const assignedCount = assignedSet.size;
    const remainingQuota = Number.isFinite(maxAllowed)
      ? Math.max(0, maxAllowed - assignedCount)
      : null;

    const data = allPublishedTemplates.map((t) => {
      const mapped = toLandingPageData(t);
      return {
        id: mapped.id,
        name: mapped.name,
        slug: mapped.slug,
        thumbnail: mapped.thumbnail,
        category: mapped.category,
        template: mapped.template,
        updatedAt: mapped.updatedAt,
        isAssigned: assignedSet.has(t.id),
      };
    });

    return {
      data,
      assignedCount,
      maxAllowed: Number.isFinite(maxAllowed) ? maxAllowed : null,
      remainingQuota,
      planName: plan?.name ?? 'Current',
    };
  }

  async assignTemplate(templateId: string, orgId: string, userId?: string) {
    const template = await this.prisma.template.findFirst({
      where: { id: templateId, ...ELIGIBLE_WHERE },
    });
    if (!template) {
      throw new NotFoundException('Template not found or not published');
    }

    const existing = await this.prisma.organisationTemplate.findUnique({
      where: { orgId_templateId: { orgId, templateId } },
    });
    if (existing) {
      return { success: true, message: 'Template is already assigned to your organisation' };
    }

    const activePlanInfo = await getOrgActivePlan(this.prisma, orgId);
    const plan = activePlanInfo?.plan;
    const maxAllowed = resolveTemplateQuota(plan);
    const currentCount = await this.prisma.organisationTemplate.count({
      where: { orgId },
    });

    if (currentCount >= maxAllowed) {
      const planName = plan?.name ? `"${plan.name}" ` : '';
      throw new BadRequestException(
        `Template limit reached. Your ${planName}plan allows a maximum of ${maxAllowed} template(s). Upgrade your package to add more templates.`,
      );
    }

    await this.prisma.organisationTemplate.create({
      data: {
        orgId,
        templateId,
        assignedBy: userId,
      },
    });

    return {
      success: true,
      message: 'Template added to your organisation successfully',
    };
  }

  async unassignTemplate(templateId: string, orgId: string) {
    const existing = await this.prisma.organisationTemplate.findUnique({
      where: { orgId_templateId: { orgId, templateId } },
    });
    if (!existing) {
      throw new NotFoundException('Template assignment not found');
    }

    await this.prisma.organisationTemplate.delete({
      where: { orgId_templateId: { orgId, templateId } },
    });

    return { success: true, message: 'Template removed from your organisation' };
  }

  async getById(id: string, orgId?: string | null) {
    // Same eligibility filter as the list — a draft/paid/thank-you id must
    // 404 here, not just be hidden by the UI.
    const template = await this.prisma.template.findFirst({
      where: { id, ...ELIGIBLE_WHERE },
    });
    if (!template) {
      throw new NotFoundException('Template not found');
    }
    // Must be assigned to this org — no assignment record means no access,
    // regardless of how many (if any) other templates are assigned.
    const assignment = orgId
      ? await this.prisma.organisationTemplate.findUnique({
          where: { orgId_templateId: { orgId, templateId: id } },
        })
      : null;
    if (!assignment) {
      throw new NotFoundException('Template not assigned to your organisation');
    }
    return toLandingPageData(template, { includeContent: true });
  }
}

