import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import type { CreateLeadDto } from './dto/create-lead.dto';
import type { AssignLeadDto } from './dto/assign-lead.dto';
import type { JwtPayload } from '../../common/types/jwt-payload.interface';

/** Org members who manage CRM leads are scoped to only the leads routed to
 *  them. Admins see the whole inbox. */
const LIMITED_ROLES = ['manager', 'sales'];

@Injectable()
export class LeadsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Public capture path: an anonymous visitor submits a form. We resolve the
   * owning org from the landing page id rather than trusting a client-supplied
   * orgId. A missing/invalid landing page is rejected.
   */
  async createFromPublic(dto: CreateLeadDto) {
    if (!dto.landingPageId) {
      throw new NotFoundException(
        'landingPageId is required to attribute the lead',
      );
    }
    const page = await this.prisma.landingPage.findUnique({
      where: { id: dto.landingPageId },
      select: { orgId: true },
    });
    if (!page) {
      throw new NotFoundException('Landing page not found');
    }
    return this.prisma.lead.create({
      data: {
        orgId: page.orgId,
        landingPageId: dto.landingPageId,
        formName: dto.formName ?? null,
        source: dto.source ?? 'website',
        data: dto.data as Prisma.InputJsonValue,
      },
    });
  }

  /**
   * Org-scoped list for the CRM/lead inbox. Admins see every lead in the org;
   * manager/sales users are restricted to the leads assigned to them. This is
   * the enforcement point for "sales only sees routed leads" — the frontend
   * never decides scope, the backend does.
   */
  async list(orgId: string, actor: JwtPayload) {
    const scoped = LIMITED_ROLES.some((role) => actor.roles.includes(role));
    const where = scoped ? { orgId, assignedToId: actor.sub } : { orgId };

    const [leads, total] = await Promise.all([
      this.prisma.lead.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 200,
        include: {
          assignedTo: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      }),
      this.prisma.lead.count({ where }),
    ]);

    return {
      data: leads.map((lead) => ({
        id: lead.id,
        landingPageId: lead.landingPageId,
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
      },
    });

    return {
      id: updated.id,
      status: updated.status,
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
   * Admin-only: org members eligible as lead assignees (manager/sales), so the
   * assignment dropdown is a real query, not a hardcoded list. Only active
   * users appear.
   */
  async listAssignableUsers(orgId: string) {
    const users = await this.prisma.user.findMany({
      where: {
        orgId,
        status: 'active',
        userRoles: {
          some: { role: { key: { in: ['manager', 'sales'] } } },
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
