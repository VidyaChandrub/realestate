import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class OrgActivityService {
  constructor(private readonly prisma: PrismaService) {}

  // Same shape as AdminOrganisationsService.listActivity — same AuditLog
  // rows, just scoped to the caller's own org (from the JWT) instead of an
  // id a Super Admin passes in. `entityId` further scopes to one record
  // (e.g. the landing page currently open in the builder) — without it,
  // every page's history shows up together, which reads as noise/stale
  // data when you're looking at one specific page.
  async list(orgId: string, entityId?: string) {
    const logs = await this.prisma.auditLog.findMany({
      where: { orgId, ...(entityId ? { entityId } : {}) },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return logs.map((log) => ({
      id: log.id,
      action: log.action,
      entity: log.entity,
      entityId: log.entityId,
      createdAt: log.createdAt,
    }));
  }
}
