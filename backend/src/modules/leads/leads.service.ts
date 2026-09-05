import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import type { CreateLeadDto } from './dto/create-lead.dto';
import type { CreateManualLeadDto } from './dto/create-manual-lead.dto';
import type { AssignLeadDto } from './dto/assign-lead.dto';
import type { ListLeadsQueryDto } from './dto/list-leads-query.dto';
import type { CreateLeadNoteDto } from './dto/create-lead-note.dto';
import type { UpdateLeadNextActionDto } from './dto/update-lead-next-action.dto';
import type { JwtPayload } from '../../common/types/jwt-payload.interface';
import {
  leadContactFromData,
  normalizeLeadData,
} from '../../common/utils/lead-data.util';
import {
  actorLeadOrClauses,
  canSeeAllLeads,
  leadMatchesActorScope,
} from '../../common/utils/lead-scope.util';

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

    if (dto.landingPageId) {
      const page = await this.prisma.landingPage.findUnique({
        where: { id: dto.landingPageId },
        select: { orgId: true, status: true },
      });
      if (!page) {
        throw new NotFoundException('Landing page not found');
      }
      if (page.status !== 'published') {
        throw new BadRequestException('Leads can only be submitted from a published landing page');
      }
      orgId = page.orgId;
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
      if (orgId && project.orgId !== orgId) {
        throw new BadRequestException(
          'Project and landing page must belong to the same organisation',
        );
      }
      orgId = project.orgId;
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
      (await this.resolveProjectId(orgId, dto.landingPageId, dto.data));

    const data = normalizeLeadData(dto.data ?? {}, { unitId: dto.unitId });
    const existing = await this.findRecentDuplicate(orgId, projectId, data);
    if (existing) {
      return this.prisma.lead.update({
        where: { id: existing.id },
        data: {
          data: data as Prisma.InputJsonValue,
          landingPageId: dto.landingPageId ?? existing.landingPageId,
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
        landingPageId: dto.landingPageId ?? null,
        projectId,
        formName: dto.formName ?? null,
        source: dto.source ?? 'website',
        data: data as Prisma.InputJsonValue,
        ...(assignedToId ? { assignedToId } : {}),
      },
    });

    if (assignedToId) {
      await this.prisma.activityEvent.create({
        data: {
          orgId,
          agentId: assignedToId,
          leadId: lead.id,
          type: 'status_updated',
          text: 'Lead captured from website and assigned automatically',
        },
      });
    }

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

  private async assertCanAccessLead(
    orgId: string,
    lead: {
      assignedToId?: string | null;
      projectId?: string | null;
      landingPageId?: string | null;
      data?: unknown;
    },
    actor: JwtPayload,
  ) {
    if (canSeeAllLeads(actor.roles)) return;
    const scope = await actorLeadOrClauses(this.prisma, orgId, actor.sub);
    if (!leadMatchesActorScope(lead, actor.sub, scope)) {
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

    const [leads, total] = await Promise.all([
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
    ]);

    return {
      data: leads.map((lead) => this.toListItem(lead)),
      total,
      page,
      limit,
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
          take: 20,
          select: { id: true, type: true, text: true, createdAt: true },
        },
        callLogs: {
          orderBy: { createdAt: 'desc' },
          take: 20,
          select: { id: true, direction: true, outcome: true, durationSeconds: true, createdAt: true },
        },
      },
    });
    if (!lead) throw new NotFoundException('Lead not found');
    await this.assertCanAccessLead(orgId, lead, actor);

    return {
      ...this.toListItem(lead),
      activities: lead.activities,
      callLogs: lead.callLogs,
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

  async addNote(
    orgId: string,
    leadId: string,
    actor: JwtPayload,
    dto: CreateLeadNoteDto,
  ) {
    await this.getById(orgId, leadId, actor);
    const text = dto.text.trim();
    if (!text) throw new BadRequestException('Note cannot be empty');
    return this.prisma.activityEvent.create({
      data: { orgId, agentId: actor.sub, leadId, type: 'note_added', text },
      select: { id: true, type: true, text: true, createdAt: true },
    });
  }

  async updateNextAction(
    orgId: string,
    leadId: string,
    actor: JwtPayload,
    dto: UpdateLeadNextActionDto,
  ) {
    await this.getById(orgId, leadId, actor);
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
    const activity = await this.prisma.activityEvent.create({
      data: {
        orgId,
        agentId: actor.sub,
        leadId,
        type: dto.actionType === 'site_visit' ? 'site_visit_booked' : 'status_updated',
        text: `${dto.actionType === 'site_visit' ? 'Site visit scheduled' : 'Follow-up scheduled'} — ${scheduledAt.toLocaleString('en-IN')}${dto.note?.trim() ? ` — ${dto.note.trim()}` : ''}`,
      },
      select: { id: true, type: true, text: true, createdAt: true },
    });

    return {
      type: updated.nextActionType,
      scheduledAt: updated.nextActionAt,
      note: updated.nextActionNote,
      reminderAt: updated.reminderAt,
      activity,
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
    await this.assertCanAccessLead(orgId, lead, actor);

    if (dto.assignedToId != null) {
      const assignee = await this.prisma.user.findFirst({
        where: { id: dto.assignedToId, orgId },
        select: { id: true, firstName: true, lastName: true, email: true },
      });
      if (!assignee) {
        throw new NotFoundException('Assignee not found in this organisation');
      }
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
      parts.push(`Status changed to ${dto.status.replace('_', ' ')}`);
    }
    if (parts.length > 0) {
      await this.prisma.activityEvent.create({
        data: {
          orgId,
          agentId: actor.sub,
          leadId,
          type: 'status_updated',
          text: parts.join(' · '),
        },
      });
    }

    return this.toListItem(updated);
  }

  /**
   * Org members eligible as lead assignees (manager/sales/telecaller/custom roles).
   */
  async listAssignableUsers(orgId: string) {
    const users = await this.prisma.user.findMany({
      where: {
        orgId,
        status: 'active',
        userRoles: {
          some: {
            role: {
              status: 'active',
              key: { notIn: ['super_admin', 'admin'] },
            },
          },
        },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        userRoles: { select: { role: { select: { key: true, name: true } } } },
      },
      orderBy: { createdAt: 'asc' },
    });

    return {
      data: users.map((user) => ({
        id: user.id,
        name:
          [user.firstName, user.lastName].filter(Boolean).join(' ') ||
          user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.userRoles[0]?.role ?? null,
      })),
      total: users.length,
    };
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
    return {
      id: lead.id,
      orgId: lead.orgId,
      landingPageId: lead.landingPageId ?? null,
      projectId: lead.projectId ?? null,
      project: lead.project ?? null,
      formName: lead.formName,
      source: lead.source,
      data: lead.data,
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
