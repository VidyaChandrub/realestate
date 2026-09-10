import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import type { CreateLeadDto } from './dto/create-lead.dto';
import type { CreateManualLeadDto } from './dto/create-manual-lead.dto';
import type { AssignLeadDto } from './dto/assign-lead.dto';
import type { ListLeadsQueryDto } from './dto/list-leads-query.dto';
import type { CreateLeadNoteDto } from './dto/create-lead-note.dto';
import type { UpdateLeadNextActionDto } from './dto/update-lead-next-action.dto';
import type { UpdateLeadDto } from './dto/update-lead.dto';
import type { JwtPayload } from '../../common/types/jwt-payload.interface';
import {
  leadContactFromData,
  normalizeLeadData,
} from '../../common/utils/lead-data.util';
import {
  actorLeadOrClauses,
  canSeeAllLeads,
} from '../../common/utils/lead-scope.util';
import { listLeadAssignableUsers } from '../../common/utils/lead-assignee.util';

/** Sentinel org id for Super Admin template captures (Lead.orgId has no FK). */
export const PLATFORM_LEAD_ORG_ID = 'platform';

type ResolvedPublicPage = {
  id: string;
  orgId: string;
  status: string;
};

/** Fields needed to render an activity/call actor. */
const ACTOR_SELECT = {
  select: { id: true, firstName: true, lastName: true, email: true },
} as const;

type ActorRow = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
} | null;

/** Actor for the activity feed. `null` (no user) renders as "System". */
function toActor(user: ActorRow): { id: string; name: string } | null {
  if (!user) return null;
  return {
    id: user.id,
    name:
      [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email,
  };
}

type ActivityRow = {
  id: string;
  type: string;
  text: string;
  createdAt: Date;
  agent?: ActorRow;
};

/** Shape an ActivityEvent row (with `agent` selected) for the API. */
function toActivity(row: ActivityRow) {
  return {
    id: row.id,
    type: row.type,
    text: row.text,
    createdAt: row.createdAt,
    actor: toActor(row.agent ?? null),
  };
}

@Injectable()
export class LeadsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Public capture path: an anonymous visitor submits a form. We resolve the
   * owning org from the landing page id and/or project id rather than trusting
   * a client-supplied orgId.
   */
  async createFromPublic(dto: CreateLeadDto) {
    if (!dto.landingPageId && !dto.projectId) {
      throw new NotFoundException(
        'landingPageId or projectId is required to attribute the lead',
      );
    }

    let orgId: string | null = null;
    let projectName: string | null = null;

    let resolvedLandingPageId = dto.landingPageId ?? null;

    if (dto.landingPageId) {
      const page = await this.resolvePublicLandingPage(dto.landingPageId);
      if (!page) {
        throw new NotFoundException('Landing page not found');
      }
      if (page.status !== 'published' && page.status !== 'draft') {
        throw new BadRequestException(
          'Leads can only be submitted from a published or draft landing page',
        );
      }
      orgId = page.orgId;
      resolvedLandingPageId = page.id;
    }

    if (dto.projectId) {
      const project = await this.prisma.project.findUnique({
        where: { id: dto.projectId },
        select: { orgId: true, status: true, name: true },
      });
      if (!project) {
        throw new NotFoundException('Project not found');
      }
      if (project.status !== 'active') {
        throw new BadRequestException('Project is not available for website enquiries');
      }
      // Platform template captures may bind a project later — then the project
      // org wins. Otherwise org + project must match.
      if (
        orgId &&
        orgId !== PLATFORM_LEAD_ORG_ID &&
        project.orgId !== orgId
      ) {
        throw new BadRequestException(
          'Project and landing page must belong to the same organisation',
        );
      }
      orgId = project.orgId;
      projectName = project.name;
    }

    if (dto.unitId) {
      const unit = await this.prisma.unit.findUnique({
        where: { id: dto.unitId },
        select: { projectId: true, orgId: true },
      });
      if (!unit || !dto.projectId || unit.projectId !== dto.projectId) {
        throw new BadRequestException('Selected unit does not belong to the selected project');
      }
      if (orgId !== unit.orgId) {
        throw new BadRequestException('Selected unit belongs to another organisation');
      }
    }

    if (!orgId) {
      throw new NotFoundException('Unable to resolve organisation');
    }

    const projectId =
      dto.projectId ??
      (await this.resolveProjectId(orgId, resolvedLandingPageId, dto.data));

    const data = normalizeLeadData(dto.data ?? {}, {
      unitId: dto.unitId,
      projectName,
    });
    const existing = await this.findRecentDuplicate(orgId, projectId, data);
    if (existing) {
      return this.prisma.lead.update({
        where: { id: existing.id },
        data: {
          data: data as Prisma.InputJsonValue,
          landingPageId: resolvedLandingPageId ?? existing.landingPageId,
          projectId: projectId ?? existing.projectId,
          formName: dto.formName ?? existing.formName,
          source: dto.source ?? existing.source,
        },
      });
    }

    const assignedToId = await this.nextRoundRobinAssignee(orgId, projectId);

    const lead = await this.prisma.lead.create({
      data: {
        orgId,
        landingPageId: resolvedLandingPageId,
        projectId,
        formName: dto.formName ?? null,
        source: dto.source ?? 'website',
        data: data as Prisma.InputJsonValue,
        configurations: [],
        tags: [],
        ...(assignedToId ? { assignedToId } : {}),
      },
    });

    // Always record the capture on the timeline. It's an automated event, so
    // there is no actor — `agentId: null` renders as "System". (Previously this
    // row was only written when a round-robin assignee existed, and was then
    // mis-attributed to that assignee.)
    await this.prisma.activityEvent.create({
      data: {
        orgId,
        agentId: null,
        leadId: lead.id,
        type: 'status_updated',
        text: assignedToId
          ? 'Lead captured from website and assigned automatically'
          : 'Lead captured from website',
      },
    });

    return lead;
  }

  async createFromCrm(orgId: string, actor: JwtPayload, dto: CreateManualLeadDto) {
    const data = normalizeLeadData(dto.data ?? {});
    const contact = leadContactFromData(data);
    if (!contact.fullName && !contact.phone && !contact.email) {
      throw new BadRequestException('Enter a name, phone, or email for the lead');
    }

    if (dto.projectId) {
      const project = await this.prisma.project.findFirst({
        where: { id: dto.projectId, orgId },
        select: { id: true },
      });
      if (!project) throw new NotFoundException('Project not found');
    }

    if (dto.assignedToId) {
      const assignee = await this.prisma.user.findFirst({
        where: { id: dto.assignedToId, orgId },
        select: { id: true },
      });
      if (!assignee) {
        throw new NotFoundException('Assignee not found in this organisation');
      }
    }

    const assignedToId =
      dto.assignedToId ??
      (await this.nextRoundRobinAssignee(orgId, dto.projectId ?? null));

    const lead = await this.prisma.lead.create({
      data: {
        orgId,
        projectId: dto.projectId ?? null,
        formName: dto.formName ?? 'Manual lead',
        source: dto.source ?? 'crm',
        data: data as Prisma.InputJsonValue,
        configurations: [],
        tags: [],
        assignedToId,
      },
      include: {
        assignedTo: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        project: { select: { id: true, name: true } },
      },
    });

    await this.prisma.activityEvent.create({
      data: {
        orgId,
        agentId: actor.sub,
        leadId: lead.id,
        type: 'status_updated',
        text: assignedToId
          ? 'Lead created in CRM and assigned'
          : 'Lead created in CRM',
      },
    });

    return this.toListItem(lead);
  }

  /**
   * Public forms may send a landing-page id, a page slug, a Super Admin
   * template id (published/draft live or preview), or a template id that an
   * org has already published as a landing page.
   */
  private async resolvePublicLandingPage(
    ref: string,
  ): Promise<ResolvedPublicPage | null> {
    const select = { id: true, orgId: true, status: true } as const;
    const byId = await this.prisma.landingPage.findUnique({
      where: { id: ref },
      select,
    });
    if (byId) return byId;

    const published = { status: 'published' as const };
    const bySlug = await this.prisma.landingPage.findFirst({
      where: { slug: ref, ...published },
      orderBy: { publishedAt: 'desc' },
      select,
    });
    if (bySlug) return bySlug;

    // Super Admin templates are not LandingPage rows — accept them directly so
    // lead-gen pages can publish without an org/project binding.
    const template = await this.prisma.template.findUnique({
      where: { id: ref },
      select: { id: true, status: true },
    });
    if (template) {
      return {
        id: template.id,
        orgId: PLATFORM_LEAD_ORG_ID,
        status: template.status,
      };
    }

    return this.prisma.landingPage.findFirst({
      where: { sourceTemplateId: ref, ...published },
      orderBy: { publishedAt: 'desc' },
      select,
    });
  }

  /** Map a captured lead onto a project via linked landing page or form data. */
  private async resolveProjectId(
    orgId: string,
    landingPageId?: string | null,
    data?: Record<string, unknown>,
  ): Promise<string | null> {
    if (landingPageId) {
      const linked = await this.prisma.project.findFirst({
        where: {
          orgId,
          marketing: { path: ['landingPageId'], equals: landingPageId },
        },
        select: { id: true },
      });
      if (linked) return linked.id;
    }

    const normalized = normalizeLeadData(data ?? {});
    const projectName =
      typeof normalized.project === 'string' ? normalized.project.trim() : '';
    if (projectName) {
      const byName = await this.prisma.project.findFirst({
        where: { orgId, name: { equals: projectName, mode: 'insensitive' } },
        select: { id: true },
      });
      if (byName) return byName.id;
    }

    return null;
  }

  private async findRecentDuplicate(
    orgId: string,
    projectId: string | null,
    data: Record<string, unknown>,
  ) {
    const contact = leadContactFromData(data);
    const or: Prisma.LeadWhereInput[] = [];
    if (contact.phone) {
      or.push({ data: { path: ['phone'], equals: contact.phone } });
    }
    if (contact.email) {
      or.push({ data: { path: ['email'], equals: contact.email } });
    }
    if (or.length === 0) return null;

    const since = new Date(Date.now() - 48 * 60 * 60 * 1000);
    return this.prisma.lead.findFirst({
      where: {
        orgId,
        createdAt: { gte: since },
        ...(projectId ? { projectId } : {}),
        OR: or,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  private async nextRoundRobinAssignee(
    orgId: string,
    projectId: string | null,
  ): Promise<string | null> {
    if (!projectId) return null;
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, orgId },
      select: { marketing: true },
    });
    const marketing =
      project?.marketing && typeof project.marketing === 'object'
        ? (project.marketing as Record<string, unknown>)
        : {};
    if (marketing.roundRobinEnabled !== true) return null;

    const agents = await this.prisma.projectSalesAgent.findMany({
      where: { projectId, user: { orgId, status: 'active' } },
      select: { userId: true },
      orderBy: { assignedAt: 'asc' },
    });
    if (agents.length === 0) return null;

    const last =
      typeof marketing.roundRobinIndex === 'number' ? marketing.roundRobinIndex : -1;
    const next = (last + 1) % agents.length;
    await this.prisma.project.update({
      where: { id: projectId },
      data: {
        marketing: { ...marketing, roundRobinIndex: next } as Prisma.InputJsonValue,
      },
    });
    return agents[next].userId;
  }

  private async projectLeadMatch(
    orgId: string,
    projectId: string,
  ): Promise<Prisma.LeadWhereInput[]> {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, orgId },
      select: { name: true, marketing: true },
    });
    const match: Prisma.LeadWhereInput[] = [{ projectId }];
    const landingPageId =
      project?.marketing &&
      typeof (project.marketing as Record<string, unknown>).landingPageId ===
        'string'
        ? ((project.marketing as Record<string, unknown>).landingPageId as string)
        : null;
    if (landingPageId) {
      match.push({ landingPageId });
    }
    if (project?.name) {
      match.push({ data: { path: ['project'], equals: project.name } });
    }
    return match;
  }

  /**
   * Gate a single lead behind the same visibility rule `list()` uses — by
   * re-running the scope clauses as a real query rather than re-checking the
   * loaded row in memory, so the by-id path can never drift from the list
   * path. A lead the caller may not see 404s (same as a non-existent id).
   */
  private async assertCanAccessLead(
    orgId: string,
    leadId: string,
    actor: JwtPayload,
  ) {
    if (canSeeAllLeads(actor.roles)) return;
    const scope = await actorLeadOrClauses(this.prisma, orgId, actor.sub);
    const visible = await this.prisma.lead.count({
      where: { id: leadId, orgId, OR: scope },
    });
    if (visible === 0) {
      throw new NotFoundException('Lead not found');
    }
  }

  private async buildListWhere(
    orgId: string,
    actor: JwtPayload,
    query: ListLeadsQueryDto,
  ): Promise<Prisma.LeadWhereInput> {
    const and: Prisma.LeadWhereInput[] = [{ orgId }];

    if (query.projectId) {
      and.push({ OR: await this.projectLeadMatch(orgId, query.projectId) });
    }
    if (query.status) and.push({ status: query.status as never });
    if (query.source) and.push({ source: query.source });
    if (query.assignedToId) and.push({ assignedToId: query.assignedToId });

    if (query.search) {
      const s = query.search.trim();
      if (s) {
        and.push({
          OR: [
            { formName: { contains: s, mode: 'insensitive' } },
            { source: { contains: s, mode: 'insensitive' } },
            { data: { path: ['fullName'], string_contains: s } },
            { data: { path: ['name'], string_contains: s } },
            { data: { path: ['Name'], string_contains: s } },
            { data: { path: ['Full Name'], string_contains: s } },
            { data: { path: ['phone'], string_contains: s } },
            { data: { path: ['Phone'], string_contains: s } },
            { data: { path: ['email'], string_contains: s } },
          ],
        });
      }
    }

    if (!canSeeAllLeads(actor.roles ?? [])) {
      and.push({ OR: await actorLeadOrClauses(this.prisma, orgId, actor.sub) });
    }

    return and.length === 1 ? { orgId } : { AND: and };
  }

  /**
   * Org-scoped list for the CRM/lead inbox. Admins see every lead in the org;
   * other roles are restricted to assigned leads or projects they manage/are on.
   */
  async list(orgId: string, actor: JwtPayload, query: ListLeadsQueryDto = {}) {
    const where = await this.buildListWhere(orgId, actor, query);
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 100);
    const skip = (page - 1) * limit;

    const kpiWhere = query.status
      ? await this.buildListWhere(orgId, actor, { ...query, status: undefined })
      : where;

    const [leads, total, kpiTotal, unassigned, byStatus] = await Promise.all([
      this.prisma.lead.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          assignedTo: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          project: {
            select: { id: true, name: true },
          },
        },
      }),
      this.prisma.lead.count({ where }),
      this.prisma.lead.count({ where: kpiWhere }),
      this.prisma.lead.count({
        where: { AND: [kpiWhere, { assignedToId: null }] },
      }),
      this.prisma.lead.groupBy({
        by: ['status'],
        where: kpiWhere,
        _count: { _all: true },
      }),
    ]);

    const statusCount = (status: string) =>
      byStatus.find((row) => row.status === status)?._count._all ?? 0;

    const teams = await this.projectTeamsByProject(
      leads.filter((l) => !l.assignedToId).map((l) => l.projectId),
    );

    return {
      data: leads.map((lead) => ({
        ...this.toListItem(lead),
        projectTeam: this.projectTeamFor(lead, teams),
      })),
      total,
      page,
      limit,
      stats: {
        total: kpiTotal,
        unassigned,
        new: statusCount('new'),
        followUp: statusCount('follow_up'),
        siteVisit: statusCount('site_visit'),
        won: statusCount('won'),
      },
    };
  }

  async getById(orgId: string, leadId: string, actor: JwtPayload) {
    const lead = await this.prisma.lead.findFirst({
      where: { id: leadId, orgId },
      include: {
        assignedTo: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        project: { select: { id: true, name: true } },
        activities: {
          orderBy: { createdAt: 'desc' },
          take: 50,
          select: {
            id: true,
            type: true,
            text: true,
            createdAt: true,
            agent: ACTOR_SELECT,
          },
        },
        callLogs: {
          orderBy: { createdAt: 'desc' },
          take: 20,
          select: {
            id: true,
            direction: true,
            outcome: true,
            durationSeconds: true,
            createdAt: true,
            agent: ACTOR_SELECT,
          },
        },
      },
    });
    if (!lead) throw new NotFoundException('Lead not found');
    await this.assertCanAccessLead(orgId, leadId, actor);

    const teams = await this.projectTeamsByProject([
      lead.assignedToId ? null : lead.projectId,
    ]);

    return {
      ...this.toListItem(lead),
      ...this.leadEditFields(lead),
      projectTeam: this.projectTeamFor(lead, teams),
      activities: lead.activities.map(toActivity),
      callLogs: lead.callLogs.map((call) => ({
        id: call.id,
        direction: call.direction,
        outcome: call.outcome,
        durationSeconds: call.durationSeconds,
        createdAt: call.createdAt,
        actor: toActor(call.agent ?? null),
      })),
      nextAction: lead.nextActionType
        ? {
            type: lead.nextActionType,
            scheduledAt: lead.nextActionAt,
            note: lead.nextActionNote,
            reminderAt: lead.reminderAt,
          }
        : null,
    };
  }

  /**
   * The structured CRM edit-form columns, shaped for the API. BigInt budgets
   * become plain numbers (rupee amounts are well within Number range).
   */
  private leadEditFields(lead: {
    altName: string | null;
    altPhone: string | null;
    whatsapp: string | null;
    city: string | null;
    budgetMin: bigint | null;
    budgetMax: bigint | null;
    configurations: string[];
    purpose: string | null;
    financing: string | null;
    loanStatus: string | null;
    timelineToBuy: string | null;
    preferredFloor: string | null;
    facing: string | null;
    parking: string | null;
    requirementNotes: string | null;
    campaign: string | null;
    utmSource: string | null;
    utmMedium: string | null;
    utmCampaign: string | null;
    temperature: string | null;
    tags: string[];
    consentWhatsapp: boolean;
    consentCall: boolean;
    consentEmail: boolean;
  }) {
    return {
      altName: lead.altName,
      altPhone: lead.altPhone,
      whatsapp: lead.whatsapp,
      city: lead.city,
      budgetMin: lead.budgetMin == null ? null : Number(lead.budgetMin),
      budgetMax: lead.budgetMax == null ? null : Number(lead.budgetMax),
      configurations: lead.configurations,
      purpose: lead.purpose,
      financing: lead.financing,
      loanStatus: lead.loanStatus,
      timelineToBuy: lead.timelineToBuy,
      preferredFloor: lead.preferredFloor,
      facing: lead.facing,
      parking: lead.parking,
      requirementNotes: lead.requirementNotes,
      campaign: lead.campaign,
      utmSource: lead.utmSource,
      utmMedium: lead.utmMedium,
      utmCampaign: lead.utmCampaign,
      temperature: lead.temperature,
      tags: lead.tags,
      consentWhatsapp: lead.consentWhatsapp,
      consentCall: lead.consentCall,
      consentEmail: lead.consentEmail,
    };
  }

  /**
   * Full lead edit form (lead edit page). Writes the structured columns and
   * merges contact name/phone/email back into the capture `data` blob. Pipeline
   * `status` is intentionally not handled here — it keeps its note-required path
   * in `assign`. An activity entry is written, attributed to the editor, so the
   * change shows up (correctly attributed) on the timeline.
   */
  async update(
    orgId: string,
    leadId: string,
    actor: JwtPayload,
    dto: UpdateLeadDto,
  ) {
    const existing = await this.prisma.lead.findFirst({
      where: { id: leadId, orgId },
    });
    if (!existing) throw new NotFoundException('Lead not found');
    await this.assertCanAccessLead(orgId, leadId, actor);

    if (dto.projectId) {
      const project = await this.prisma.project.findFirst({
        where: { id: dto.projectId, orgId },
        select: { id: true },
      });
      if (!project) throw new NotFoundException('Project not found');
    }

    let assignee: {
      id: string;
      firstName: string | null;
      lastName: string | null;
      email: string;
    } | null = null;
    if (dto.assignedToId != null) {
      assignee = await this.prisma.user.findFirst({
        where: { id: dto.assignedToId, orgId },
        select: { id: true, firstName: true, lastName: true, email: true },
      });
      if (!assignee) {
        throw new NotFoundException('Assignee not found in this organisation');
      }
    }

    // Merge contact fields into the raw capture blob without disturbing other
    // submitted values.
    const currentData =
      existing.data && typeof existing.data === 'object'
        ? (existing.data as Record<string, unknown>)
        : {};
    let data = currentData;
    if (dto.contact) {
      const merged = { ...currentData };
      if (dto.contact.fullName !== undefined) {
        merged.fullName = dto.contact.fullName;
        merged.name = dto.contact.fullName;
      }
      if (dto.contact.phone !== undefined) {
        merged.phone = dto.contact.phone;
        merged.phoneNumber = dto.contact.phone;
      }
      if (dto.contact.email !== undefined) merged.email = dto.contact.email;
      data = normalizeLeadData(merged);
    }

    const has = <K extends keyof UpdateLeadDto>(key: K): boolean =>
      Object.prototype.hasOwnProperty.call(dto, key) === true;
    const bignum = (v: number | null | undefined) =>
      v == null ? null : BigInt(Math.trunc(v));

    const updated = await this.prisma.lead.update({
      where: { id: leadId },
      data: {
        ...(dto.contact ? { data: data as Prisma.InputJsonValue } : {}),
        ...(has('altName') ? { altName: dto.altName ?? null } : {}),
        ...(has('altPhone') ? { altPhone: dto.altPhone ?? null } : {}),
        ...(has('whatsapp') ? { whatsapp: dto.whatsapp ?? null } : {}),
        ...(has('city') ? { city: dto.city ?? null } : {}),
        ...(has('tags') ? { tags: dto.tags ?? [] } : {}),
        ...(has('configurations')
          ? { configurations: dto.configurations ?? [] }
          : {}),
        ...(has('budgetMin') ? { budgetMin: bignum(dto.budgetMin) } : {}),
        ...(has('budgetMax') ? { budgetMax: bignum(dto.budgetMax) } : {}),
        ...(has('purpose') ? { purpose: dto.purpose ?? null } : {}),
        ...(has('financing') ? { financing: dto.financing ?? null } : {}),
        ...(has('loanStatus') ? { loanStatus: dto.loanStatus ?? null } : {}),
        ...(has('timelineToBuy')
          ? { timelineToBuy: dto.timelineToBuy ?? null }
          : {}),
        ...(has('preferredFloor')
          ? { preferredFloor: dto.preferredFloor ?? null }
          : {}),
        ...(has('facing') ? { facing: dto.facing ?? null } : {}),
        ...(has('parking') ? { parking: dto.parking ?? null } : {}),
        ...(has('requirementNotes')
          ? { requirementNotes: dto.requirementNotes ?? null }
          : {}),
        ...(has('projectId') ? { projectId: dto.projectId ?? null } : {}),
        ...(has('source') ? { source: dto.source ?? null } : {}),
        ...(has('campaign') ? { campaign: dto.campaign ?? null } : {}),
        ...(has('utmSource') ? { utmSource: dto.utmSource ?? null } : {}),
        ...(has('utmMedium') ? { utmMedium: dto.utmMedium ?? null } : {}),
        ...(has('utmCampaign') ? { utmCampaign: dto.utmCampaign ?? null } : {}),
        ...(has('temperature') ? { temperature: dto.temperature ?? null } : {}),
        ...(has('assignedToId')
          ? { assignedToId: dto.assignedToId ?? null }
          : {}),
        ...(has('consentWhatsapp')
          ? { consentWhatsapp: dto.consentWhatsapp ?? false }
          : {}),
        ...(has('consentCall')
          ? { consentCall: dto.consentCall ?? false }
          : {}),
        ...(has('consentEmail')
          ? { consentEmail: dto.consentEmail ?? false }
          : {}),
      },
    });

    // One timeline entry for the edit, plus a distinct assignment line when the
    // owner actually changed (mirrors `assign`'s wording).
    const parts: string[] = [];
    if (
      has('assignedToId') &&
      (dto.assignedToId ?? null) !== existing.assignedToId
    ) {
      const name = assignee
        ? [assignee.firstName, assignee.lastName].filter(Boolean).join(' ') ||
          assignee.email
        : 'Unassigned';
      parts.push(`Assigned to ${name}`);
    }
    parts.push('Lead details updated');
    await this.prisma.activityEvent.create({
      data: {
        orgId,
        agentId: actor.sub,
        leadId,
        type: 'status_updated',
        text: parts.join(' · '),
      },
    });

    return this.getById(orgId, updated.id, actor);
  }

  async addNote(
    orgId: string,
    leadId: string,
    actor: JwtPayload,
    dto: CreateLeadNoteDto,
  ) {
    await this.getById(orgId, leadId, actor);
    const text = dto.text.trim();
    if (!text) throw new BadRequestException('Note cannot be empty');
    const activity = await this.prisma.activityEvent.create({
      data: { orgId, agentId: actor.sub, leadId, type: 'note_added', text },
      select: {
        id: true,
        type: true,
        text: true,
        createdAt: true,
        agent: ACTOR_SELECT,
      },
    });
    return toActivity(activity);
  }

  async updateNextAction(
    orgId: string,
    leadId: string,
    actor: JwtPayload,
    dto: UpdateLeadNextActionDto,
  ) {
    await this.getById(orgId, leadId, actor);
    const current = await this.prisma.lead.findFirst({
      where: { id: leadId, orgId },
      select: { nextActionAt: true },
    });
    const scheduledAt = new Date(dto.scheduledAt);
    const reminderAt = dto.reminderAt ? new Date(dto.reminderAt) : null;
    if (Number.isNaN(scheduledAt.getTime()) || (reminderAt && Number.isNaN(reminderAt.getTime()))) {
      throw new BadRequestException('Invalid action or reminder date');
    }
    const updated = await this.prisma.lead.update({
      where: { id: leadId },
      data: {
        nextActionType: dto.actionType,
        nextActionAt: scheduledAt,
        nextActionNote: dto.note?.trim() || null,
        reminderAt,
      },
      select: { nextActionType: true, nextActionAt: true, nextActionNote: true, reminderAt: true },
    });
    const kind = dto.actionType === 'site_visit' ? 'Site visit' : 'Follow-up';
    const verb = current?.nextActionAt ? 'updated' : 'scheduled';
    const note = dto.note?.trim();
    const activity = await this.prisma.activityEvent.create({
      data: {
        orgId,
        agentId: actor.sub,
        leadId,
        type: dto.actionType === 'site_visit' ? 'site_visit_booked' : 'status_updated',
        text: `Next action ${verb}: ${kind} on ${scheduledAt.toLocaleString('en-IN')}${note ? ` — ${note}` : ''}${reminderAt ? ` · reminder ${reminderAt.toLocaleString('en-IN')}` : ''}`,
      },
      select: {
        id: true,
        type: true,
        text: true,
        createdAt: true,
        agent: ACTOR_SELECT,
      },
    });

    return {
      type: updated.nextActionType,
      scheduledAt: updated.nextActionAt,
      note: updated.nextActionNote,
      reminderAt: updated.reminderAt,
      activity: toActivity(activity),
    };
  }

  /**
   * (Re)assign a lead to an org member and optionally move its CRM stage.
   * Caller must already be able to see the lead.
   */
  async assign(orgId: string, leadId: string, dto: AssignLeadDto, actor: JwtPayload) {
    const lead = await this.prisma.lead.findFirst({
      where: { id: leadId, orgId },
    });
    if (!lead) {
      throw new NotFoundException('Lead not found');
    }
    await this.assertCanAccessLead(orgId, leadId, actor);

    if (dto.assignedToId != null) {
      const assignee = await this.prisma.user.findFirst({
        where: { id: dto.assignedToId, orgId },
        select: { id: true, firstName: true, lastName: true, email: true },
      });
      if (!assignee) {
        throw new NotFoundException('Assignee not found in this organisation');
      }
    }

    if (dto.status && dto.status !== lead.status && !dto.note?.trim()) {
      throw new BadRequestException('A note is required when changing pipeline status');
    }

    const updated = await this.prisma.lead.update({
      where: { id: leadId },
      data: {
        assignedToId: dto.assignedToId ?? null,
        ...(dto.status ? { status: dto.status as never } : {}),
      },
      include: {
        assignedTo: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        project: { select: { id: true, name: true } },
      },
    });

    const assigneeName = updated.assignedTo
      ? [updated.assignedTo.firstName, updated.assignedTo.lastName]
          .filter(Boolean)
          .join(' ') || updated.assignedTo.email
      : 'Unassigned';
    const parts: string[] = [];
    if (lead.assignedToId !== updated.assignedToId) {
      parts.push(`Assigned to ${assigneeName}`);
    }
    if (dto.status && dto.status !== lead.status) {
      parts.push(
        `Status changed from ${lead.status.replaceAll('_', ' ')} to ${dto.status.replaceAll('_', ' ')} — ${dto.note!.trim()}`,
      );
    }
    let activity: ReturnType<typeof toActivity> | null = null;
    if (parts.length > 0) {
      const row = await this.prisma.activityEvent.create({
        data: {
          orgId,
          agentId: actor.sub,
          leadId,
          type: 'status_updated',
          text: parts.join(' · '),
        },
        select: {
          id: true,
          type: true,
          text: true,
          createdAt: true,
          agent: ACTOR_SELECT,
        },
      });
      activity = toActivity(row);
    }

    return { ...this.toListItem(updated), activity };
  }

  /**
   * Org members eligible to hold a lead — one shared rule (permission-based)
   * used by this picker and the project Sales Agent picker alike. See
   * listLeadAssignableUsers.
   */
  async listAssignableUsers(orgId: string) {
    const data = await listLeadAssignableUsers(this.prisma, orgId);
    return { data, total: data.length };
  }

  /**
   * Sales-agent roster for a set of projects. Used to show "Project team" on a
   * lead that has a project but no individual assignee — those agents can all
   * see it, nobody owns it. Purely derived, never written to Lead.assignedToId.
   */
  private async projectTeamsByProject(
    projectIds: Array<string | null | undefined>,
  ): Promise<Map<string, { count: number; names: string[] }>> {
    const map = new Map<string, { count: number; names: string[] }>();
    const ids = [...new Set(projectIds.filter((id): id is string => !!id))];
    if (ids.length === 0) return map;
    const rows = await this.prisma.projectSalesAgent.findMany({
      where: { projectId: { in: ids } },
      select: {
        projectId: true,
        user: { select: { firstName: true, lastName: true, email: true } },
      },
      orderBy: { assignedAt: 'asc' },
    });
    for (const row of rows) {
      const name =
        [row.user.firstName, row.user.lastName].filter(Boolean).join(' ') ||
        row.user.email;
      const entry = map.get(row.projectId) ?? { count: 0, names: [] };
      entry.count += 1;
      entry.names.push(name);
      map.set(row.projectId, entry);
    }
    return map;
  }

  /** `projectTeam` for one lead, or null when it has an owner / no project. */
  private projectTeamFor(
    lead: { assignedToId?: string | null; projectId?: string | null },
    teams: Map<string, { count: number; names: string[] }>,
  ): { count: number; names: string[] } | null {
    if (lead.assignedToId || !lead.projectId) return null;
    return teams.get(lead.projectId) ?? null;
  }

  private toListItem(lead: {
    id: string;
    orgId: string;
    landingPageId?: string | null;
    projectId?: string | null;
    project?: { id: string; name: string } | null;
    formName: string | null;
    source: string | null;
    data: unknown;
    status: string;
    assignedTo?: {
      id: string;
      firstName: string | null;
      lastName: string | null;
      email: string;
    } | null;
    createdAt: Date;
  }) {
    const data =
      lead.data && typeof lead.data === 'object' && !Array.isArray(lead.data)
        ? normalizeLeadData(lead.data as Record<string, unknown>)
        : lead.data;

    return {
      id: lead.id,
      orgId: lead.orgId,
      landingPageId: lead.landingPageId ?? null,
      projectId: lead.projectId ?? null,
      project: lead.project ?? null,
      formName: lead.formName,
      source: lead.source,
      data,
      status: lead.status,
      assignedTo: lead.assignedTo
        ? {
            id: lead.assignedTo.id,
            name:
              [lead.assignedTo.firstName, lead.assignedTo.lastName]
                .filter(Boolean)
                .join(' ') || lead.assignedTo.email,
          }
        : null,
      createdAt: lead.createdAt,
    };
  }
}
