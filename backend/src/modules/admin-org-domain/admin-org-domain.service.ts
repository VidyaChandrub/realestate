import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { subdomainHost } from '../../common/utils/domain.util';
import { buildNotificationData } from '../../common/utils/notifications.util';

// A single row returned to the Super Admin "Org Domains" list. Both subdomain
// and custom-domain requests are surfaced together so the Super Admin sees ALL
// organisations' requests in one place.
function toView(req: any) {
  return {
    id: req.id,
    kind: req.kind,
    subdomain: req.subdomain,
    customDomain: req.customDomain,
    status: req.status,
    requestedAt: req.requestedAt,
    reviewedAt: req.reviewedAt,
    rejectionReason: req.rejectionReason,
    organisation: req.organisation
      ? {
          id: req.organisation.id,
          name: req.organisation.name,
          slug: req.organisation.slug,
          subdomain: req.organisation.subdomain,
          customDomain: req.organisation.customDomain,
        }
      : null,
  };
}

@Injectable()
export class AdminOrgDomainService {
  constructor(private readonly prisma: PrismaService) {}

  // Lists EVERY organisation's subdomain / custom-domain requests (across all
  // orgs) so the Super Admin can review them centrally.
  async list(query: {
    status?: string;
    kind?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: any = {};
    if (query.status) where.status = query.status;
    if (query.kind) where.kind = query.kind;
    if (query.search) {
      where.AND = [
        {
          OR: [
            { subdomain: { contains: query.search, mode: 'insensitive' } },
            { customDomain: { contains: query.search, mode: 'insensitive' } },
          ],
        },
      ];
    }

    const [rows, total] = await Promise.all([
      this.prisma.orgDomainRequest.findMany({
        where,
        orderBy: { requestedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          organisation: { select: { id: true, name: true, slug: true, subdomain: true, customDomain: true } },
        },
      }),
      this.prisma.orgDomainRequest.count({ where }),
    ]);

    return { data: rows.map(toView), total, page, limit };
  }

  // Approve activates the organisation's subdomain or maps its custom domain.
  async approve(id: string, adminId: string) {
    const req = await this.getPending(id);
    const org = await this.prisma.organisation.findUnique({ where: { id: req.orgId } });
    if (!org) throw new NotFoundException('Organisation not found');

    const orgUpdate: any = {};
    if (req.kind === 'subdomain') {
      if (req.subdomain) {
        orgUpdate.subdomain = req.subdomain;
        orgUpdate.subdomainStatus = 'active';
      }
    } else if (req.kind === 'custom_domain') {
      if (req.customDomain) {
        orgUpdate.customDomain = req.customDomain;
        orgUpdate.customDomainStatus = 'connected';
      }
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const reqRow = await tx.orgDomainRequest.update({
        where: { id },
        data: {
          status: 'approved',
          reviewedAt: new Date(),
          reviewedBy: adminId,
        },
      });
      if (Object.keys(orgUpdate).length > 0) {
        await tx.organisation.update({ where: { id: req.orgId }, data: orgUpdate });
      }
      await tx.auditLog.create({
        data: {
          orgId: req.orgId,
          actorId: adminId,
          action: 'org_domain_approved',
          entity: 'OrgDomainRequest',
          entityId: id,
          metadata: { kind: req.kind, domain: req.kind === 'subdomain' ? req.subdomain : req.customDomain } as any,
        },
      });
      await tx.notification.create({
        data: buildNotificationData({
          orgId: req.orgId,
          type: req.kind === 'subdomain' ? 'subdomain_request' : 'custom_domain_request',
          title: req.kind === 'subdomain' ? 'Subdomain approved' : 'Custom domain approved',
          body:
            req.kind === 'subdomain'
              ? `${org.name} is now live at ${subdomainHost(req.subdomain as string)}.`
              : `${org.name} can now point ${req.customDomain} at its site.`,
          entity: 'OrgDomainRequest',
          entityId: id,
        }),
      });
      return reqRow;
    });

    return toView(updated);
  }

  async reject(id: string, adminId: string, reason?: string) {
    if (!reason) throw new BadRequestException('Rejection reason is required');
    const req = await this.getPending(id);

    const updated = await this.prisma.$transaction(async (tx) => {
      const reqRow = await tx.orgDomainRequest.update({
        where: { id },
        data: {
          status: 'rejected',
          reviewedAt: new Date(),
          reviewedBy: adminId,
          rejectionReason: reason,
        },
      });
      await tx.auditLog.create({
        data: {
          orgId: req.orgId,
          actorId: adminId,
          action: 'org_domain_rejected',
          entity: 'OrgDomainRequest',
          entityId: id,
          metadata: { kind: req.kind, domain: req.kind === 'subdomain' ? req.subdomain : req.customDomain, reason } as any,
        },
      });
      await tx.notification.create({
        data: buildNotificationData({
          orgId: req.orgId,
          type: req.kind === 'subdomain' ? 'subdomain_request' : 'custom_domain_request',
          title: req.kind === 'subdomain' ? 'Subdomain request rejected' : 'Custom domain request rejected',
          body: `${req.kind === 'subdomain' ? req.subdomain : req.customDomain} was rejected${reason ? ` — ${reason}` : ''}.`,
          entity: 'OrgDomainRequest',
          entityId: id,
        }),
      });
      return reqRow;
    });

    return toView(updated);
  }

  private async getPending(id: string) {
    const req = await this.prisma.orgDomainRequest.findUnique({ where: { id } });
    if (!req) throw new NotFoundException('Domain request not found');
    if (req.status !== 'pending') {
      throw new BadRequestException(`Cannot review a request in status ${req.status}`);
    }
    return req;
  }
}
