import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { normalizeLeadData } from '../../common/utils/lead-data.util';
import { ListAdminLeadsQueryDto } from './dto/list-admin-leads-query.dto';

@Injectable()
export class AdminLeadsService {
  constructor(private readonly prisma: PrismaService) {}

  private buildWhere(query: ListAdminLeadsQueryDto): Prisma.LeadWhereInput {
    const and: Prisma.LeadWhereInput[] = [];

    if (query.orgId) and.push({ orgId: query.orgId });
    if (query.projectId) and.push({ projectId: query.projectId });
    if (query.status) and.push({ status: query.status });
    if (query.source?.trim()) and.push({ source: query.source.trim() });

    if (query.search?.trim()) {
      const s = query.search.trim();
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

    return and.length ? { AND: and } : {};
  }

  async list(query: ListAdminLeadsQueryDto) {
    const where = this.buildWhere(query);
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 100);
    const skip = (page - 1) * limit;

    const kpiWhere = query.status
      ? this.buildWhere({ ...query, status: undefined })
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

    const orgIds = [...new Set(leads.map((l) => l.orgId).filter(Boolean))];
    const orgs = orgIds.length
      ? await this.prisma.organisation.findMany({
          where: { id: { in: orgIds } },
          select: { id: true, name: true, slug: true },
        })
      : [];
    const orgById = new Map(orgs.map((o) => [o.id, o]));

    const statusCount = (status: string) =>
      byStatus.find((row) => row.status === status)?._count._all ?? 0;

    return {
      data: leads.map((lead) => {
        const data =
          lead.data && typeof lead.data === 'object' && !Array.isArray(lead.data)
            ? normalizeLeadData(lead.data as Record<string, unknown>)
            : lead.data;
        const org = orgById.get(lead.orgId) ?? null;
        return {
          id: lead.id,
          orgId: lead.orgId,
          organisation: org
            ? { id: org.id, name: org.name, slug: org.slug }
            : lead.orgId === 'platform'
              ? { id: 'platform', name: 'Platform (Super Admin)', slug: 'platform' }
              : null,
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
      }),
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
        contacted: statusCount('contacted'),
        negotiation: statusCount('negotiation'),
        lost: statusCount('lost'),
      },
    };
  }

  async meta() {
    const [orgIdRows, sourceRows] = await Promise.all([
      this.prisma.lead.findMany({
        distinct: ['orgId'],
        select: { orgId: true },
      }),
      this.prisma.lead.findMany({
        distinct: ['source'],
        where: { source: { not: null } },
        select: { source: true },
        orderBy: { source: 'asc' },
        take: 50,
      }),
    ]);

    const orgIds = orgIdRows.map((r) => r.orgId).filter(Boolean);
    const orgs = orgIds.length
      ? await this.prisma.organisation.findMany({
          where: { id: { in: orgIds } },
          orderBy: { name: 'asc' },
          select: { id: true, name: true, slug: true },
        })
      : [];

    return {
      organisations: orgs,
      sources: sourceRows
        .map((s) => s.source)
        .filter((s): s is string => !!s?.trim()),
      statuses: [
        'new',
        'contacted',
        'follow_up',
        'site_visit',
        'negotiation',
        'won',
        'lost',
      ],
    };
  }
}
