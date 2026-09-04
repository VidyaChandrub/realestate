import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import type { CreateLeadDto } from './dto/create-lead.dto';
import type { AssignLeadDto } from './dto/assign-lead.dto';
import type { ListLeadsQueryDto } from './dto/list-leads-query.dto';
import type { CreateLeadNoteDto } from './dto/create-lead-note.dto';
import type { UpdateLeadNextActionDto } from './dto/update-lead-next-action.dto';
import type { JwtPayload } from '../../common/types/jwt-payload.interface';

/** Org members who manage CRM leads are scoped to only the leads routed to
 *  them. Admins see the whole inbox. */
const LIMITED_ROLES = ['manager', 'sales'];

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
        select: { orgId: true, status: true },
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
        select: { unitType: { select: { projectId: true, project: { select: { orgId: true } } } } },
      });
      if (!unit || !dto.projectId || unit.unitType.projectId !== dto.projectId) {
        throw new BadRequestException('Selected unit does not belong to the selected project');
      }
      if (orgId !== unit.unitType.project.orgId) {
        throw new BadRequestException('Selected unit belongs to another organisation');
      }
    }

    if (!orgId) {
      throw new NotFoundException('Unable to resolve organisation');
    }

    return this.prisma.lead.create({
      data: {
        orgId,
        landingPageId: dto.landingPageId ?? null,
        projectId: dto.projectId ?? null,
        formName: dto.formName ?? null,
        source: dto.source ?? 'website',
        data: dto.data as Prisma.InputJsonValue,
      },
    });
  }

  private canSeeAllRoles(roles: string[]): boolean {
    // super_admin or admin sees all; all other roles (manager, sales, telecaller, custom) are scoped
    return roles.includes('super_admin') || roles.includes('admin');
  }

  private async buildListWhere(
    orgId: string,
    actor: JwtPayload,
    query: ListLeadsQueryDto,
  ): Promise<Prisma.LeadWhereInput> {
    const where: Prisma.LeadWhereInput = { orgId };

    if (query.projectId) where.projectId = query.projectId;
    if (query.status) where.status = query.status as never;
    if (query.source) where.source = query.source;
    if (query.assignedToId) where.assignedToId = query.assignedToId;

    if (query.search) {
      const s = query.search.trim();
      if (s) {
        // Search over formName, source, and JSON data stringified paths via raw contains on data is not indexed.
        // We fallback to searching formName + source + data via OR with maybe not super efficient but fine for 200 limit.
        // Use Prisma's `string_contains` on data is not supported, so we search formName/source and rely on client for data text.
        where.OR = [
          { formName: { contains: s, mode: 'insensitive' } },
          { source: { contains: s, mode: 'insensitive' } },
        ];
      }
    }

    // Role scoping: manager/sales see only leads assigned to them OR leads on projects they are assigned to
    const canSeeAll = this.canSeeAllRoles(actor.roles ?? []);
    if (!canSeeAll) {
      const actorId = actor.sub;
      // Find projectIds where actor is manager or sales agent
      const [managedIds, salesIds] = await Promise.all([
        this.prisma.project.findMany({
          where: { orgId, managerId: actorId },
          select: { id: true },
        }),
        this.prisma.projectSalesAgent.findMany({
          where: { userId: actorId, project: { orgId } },
          select: { projectId: true },
        }),
      ]);
      const projectIds = [
        ...managedIds.map((p) => p.id),
        ...salesIds.map((p) => p.projectId),
      ];

      const orClauses: Prisma.LeadWhereInput[] = [
        { assignedToId: actorId },
      ];
      if (projectIds.length > 0) {
        orClauses.push({ projectId: { in: projectIds } });
      }

      // Combine with existing filters: need (assignedToId == actor OR projectId in ... ) AND other filters already in where
      // To do this, we move existing where keys into AND
      const baseAnd: Prisma.LeadWhereInput[] = [{ orgId }];
      if (query.projectId) baseAnd.push({ projectId: query.projectId });
      if (query.status) baseAnd.push({ status: query.status as never });
      if (query.source) baseAnd.push({ source: query.source });
      if (query.assignedToId) baseAnd.push({ assignedToId: query.assignedToId });
      if (where.OR && query.search) baseAnd.push({ OR: where.OR });

      // Replace with AND of base filters + OR clause for scoping
      return {
        AND: [...baseAnd, { OR: orClauses }],
      };
    }

    return where;
  }

  /**
   * Org-scoped list for the CRM/lead inbox. Admins see every lead in the org;
   * manager/sales users are restricted to leads assigned to them or on projects they manage/are assigned to.
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
      data: leads.map((lead) => ({
        id: lead.id,
        orgId: lead.orgId,
        landingPageId: lead.landingPageId,
        projectId: (lead as unknown as { projectId: string | null }).projectId ?? null,
        project: (lead as unknown as { project: { id: string; name: string } | null }).project ?? null,
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
      })),
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

    // Enforce visibility for limited roles
    const canSeeAll = this.canSeeAllRoles(actor.roles ?? []);
    if (!canSeeAll) {
      const actorId = actor.sub;
      const isAssigned = lead.assignedToId === actorId;
      let isProjectMember = false;
      const pid = (lead as unknown as { projectId: string | null }).projectId;
      if (pid) {
        const [isManager, isSales] = await Promise.all([
          this.prisma.project.findFirst({
            where: { id: pid, managerId: actorId },
            select: { id: true },
          }),
          this.prisma.projectSalesAgent.findFirst({
            where: { projectId: pid, userId: actorId },
            select: { projectId: true },
          }),
        ]);
        isProjectMember = !!isManager || !!isSales;
      }

      if (!isAssigned && !isProjectMember) {
        throw new NotFoundException('Lead not found');
      }

    }

    return {
      id: lead.id,
      orgId: lead.orgId,
      landingPageId: lead.landingPageId,
      projectId: (lead as unknown as { projectId: string | null }).projectId ?? null,
      project: (lead as unknown as { project: { id: string; name: string } | null }).project ?? null,
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
   * Admin-only: (re)assign a lead to an org member and optionally move its
   * CRM stage. Unassigning is supported (assignedToId === null keeps the lead
   * in the inbox as "new"). The assignee must belong to the same org — a
   * tenant-isolation guard, never trusting a cross-org user id.
   */
  async assign(orgId: string, leadId: string, dto: AssignLeadDto) {
    const lead = await this.prisma.lead.findFirst({
      where: { id: leadId, orgId },
    });
    if (!lead) {
      throw new NotFoundException('Lead not found');
    }

    if (dto.assignedToId != null) {
      const assignee = await this.prisma.user.findFirst({
        where: { id: dto.assignedToId, orgId },
        select: { id: true },
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

    return {
      id: updated.id,
      status: updated.status,
      projectId: (updated as unknown as { projectId: string | null }).projectId ?? null,
      project: (updated as unknown as { project: { id: string; name: string } | null }).project ?? null,
      assignedTo: updated.assignedTo
        ? {
            id: updated.assignedTo.id,
            name:
              [updated.assignedTo.firstName, updated.assignedTo.lastName]
                .filter(Boolean)
                .join(' ') || updated.assignedTo.email,
          }
        : null,
    };
  }

  /**
   * Org members eligible as lead assignees (manager/sales/telecaller/custom roles).
   * Only active users with team roles appear.
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
}
