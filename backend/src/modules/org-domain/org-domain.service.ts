import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import {
  isValidDomain,
  normalizeDomain,
  subdomainHost,
} from '../../common/utils/domain.util';
import { buildNotificationData } from '../../common/utils/notifications.util';

function toView(req: any) {
  return {
    id: req.id,
    kind: req.kind,
    subdomain: req.subdomain,
    customDomain: req.customDomain,
    landingPageId: req.landingPageId,
    landingPage: req.landingPage
      ? { id: req.landingPage.id, name: req.landingPage.name, slug: req.landingPage.slug }
      : null,
    status: req.status,
    requestedAt: req.requestedAt,
    reviewedAt: req.reviewedAt,
    rejectionReason: req.rejectionReason,
  };
}

@Injectable()
export class OrgDomainService {
  constructor(private readonly prisma: PrismaService) {}

  // The organisation's own subdomain / custom-domain identity plus the history
  // of the org's own domain requests (org-scoped, single-tenant isolation).
  async getInfo(orgId: string) {
    const org = await this.prisma.organisation.findUnique({ where: { id: orgId } });
    if (!org) throw new BadRequestException('Organisation not found');

    const [requests, landingPages] = await Promise.all([
      this.prisma.orgDomainRequest.findMany({
        where: { orgId },
        orderBy: { requestedAt: 'desc' },
        include: { landingPage: { select: { id: true, name: true, slug: true } } },
      }),
      this.prisma.landingPage.findMany({
        where: { orgId },
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          name: true,
          slug: true,
          status: true,
          pageType: true,
          sourceTemplate: { select: { name: true } },
        },
      }),
    ]);

    return {
      subdomain: org.subdomain,
      subdomainHost: org.subdomain ? subdomainHost(org.subdomain) : null,
      subdomainStatus: org.subdomainStatus,
      customDomain: org.customDomain,
      customDomainStatus: org.customDomainStatus,
      customDomainLandingPageId: org.customDomainLandingPageId,
      landingPages,
      requests: requests.map(toView),
    };
  }

  // Submit a custom-domain request for review by a Super Admin. The org's
  // customDomain is staked as pending immediately so the Settings screen can
  // display "Pending approval"; it only becomes connected once approved. The
  // optional landingPageId selects which of the org's landing pages the custom
  // domain maps to (defaults to the primary published page at approval).
  async requestCustomDomain(
    orgId: string,
    userId: string,
    domain: string,
    landingPageId?: string,
  ) {
    const host = normalizeDomain(domain);
    if (!isValidDomain(host)) {
      throw new BadRequestException('Invalid domain format. Example: example.com');
    }
    await this.assertDomainAvailable(host);

    const org = await this.prisma.organisation.findUnique({ where: { id: orgId } });
    if (!org) throw new BadRequestException('Organisation not found');

    let targetPageId: string | null = landingPageId ?? null;
    if (targetPageId) {
      const page = await this.prisma.landingPage.findFirst({
        where: { id: targetPageId, orgId },
        select: { id: true },
      });
      if (!page) {
        throw new BadRequestException('Landing page not found for this organisation');
      }
    }

    const existing = await this.prisma.orgDomainRequest.findFirst({
      where: { orgId, kind: 'custom_domain', status: { in: ['pending', 'approved', 'connected'] } },
    });
    if (existing) {
      throw new ConflictException('You already have a custom-domain request pending or connected');
    }

    const created = await this.prisma.$transaction(async (tx) => {
      const row = await tx.orgDomainRequest.create({
        data: {
          orgId,
          kind: 'custom_domain',
          customDomain: host,
          landingPageId: targetPageId,
          status: 'pending',
          requestedBy: userId,
        },
        include: { landingPage: { select: { id: true, name: true, slug: true } } },
      });
      await tx.organisation.update({
        where: { id: orgId },
        data: { customDomain: host, customDomainStatus: 'pending' },
      });
      await tx.auditLog.create({
        data: {
          orgId,
          actorId: userId,
          action: 'custom_domain_requested',
          entity: 'OrgDomainRequest',
          entityId: row.id,
          metadata: { domain: host } as any,
        },
      });
      await tx.notification.create({
        data: buildNotificationData({
          orgId,
          type: 'custom_domain_request',
          title: `Custom domain request: ${host}`,
          body: `${org.name} requested to map custom domain ${host}. Review in the Org Domains screen.`,
          entity: 'OrgDomainRequest',
          entityId: row.id,
        }),
      });
      return row;
    });

    return toView(created);
  }

  private async assertDomainAvailable(host: string) {
    const ownedByOtherOrg = await this.prisma.organisation.findFirst({
      where: { customDomain: host, status: { not: 'draft' } },
      select: { id: true },
    });
    if (ownedByOtherOrg) {
      throw new ConflictException(`Domain "${host}" is already mapped to another organisation.`);
    }
    const req = await this.prisma.orgDomainRequest.findFirst({
      where: {
        customDomain: host,
        status: { in: ['pending', 'approved', 'connected'] },
      },
      select: { id: true },
    });
    if (req) {
      throw new ConflictException(`Domain "${host}" is currently in use or pending.`);
    }
  }
}
