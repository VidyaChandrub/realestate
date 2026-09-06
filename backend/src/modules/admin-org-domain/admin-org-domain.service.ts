import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import {
  generateSubdomainDnsInstructions,
  generateSubdomainHostInstructions,
  getSubdomainBaseDomain,
  subdomainHost,
} from '../../common/utils/domain.util';
import { buildNotificationData } from '../../common/utils/notifications.util';
import { PlatformConfigService } from '../platform-config/platform-config.service';
import { promises as dns } from 'node:dns';

// A single row returned to the Super Admin "Org Domains" list. Both subdomain
// and custom-domain requests are surfaced together so the Super Admin sees ALL
// organisations' requests in one place.
function toView(
  req: any,
  opts: {
    dnsMode?: string;
    ip?: string;
    ipv6?: string | null;
    cname?: string;
    ns1?: string;
    ns2?: string;
  } = {},
) {
  return {
    id: req.id,
    kind: req.kind,
    subdomain: req.subdomain,
    customDomain: req.customDomain,
    landingPageId: req.landingPageId ?? null,
    landingPage: req.landingPage
      ? { id: req.landingPage.id, name: req.landingPage.name, slug: req.landingPage.slug }
      : null,
    status: req.status,
    requestedAt: req.requestedAt,
    reviewedAt: req.reviewedAt,
    rejectionReason: req.rejectionReason,
    subdomainHost:
      req.kind === 'subdomain' && req.subdomain
        ? subdomainHost(req.subdomain)
        : null,
    dnsInstructions:
      req.kind === 'subdomain' && req.subdomain
        ? generateSubdomainHostInstructions(req.subdomain, opts)
        : null,
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
  constructor(
    private readonly prisma: PrismaService,
    private readonly platformConfig: PlatformConfigService,
  ) {}

  // DNS mode + origin targets taken from the Super Admin platform config (with
  // env fallback) — used to compute per-row instructions and verification.
  private async dnsOptions() {
    const cfg = await this.platformConfig.getConfig();
    return {
      mode: cfg.dnsMode,
      ip: cfg.infraIp ?? undefined,
      ipv6: cfg.infraIpv6 ?? null,
      cname: cfg.infraCname ?? undefined,
      ns1: cfg.infraNs1 ?? undefined,
      ns2: cfg.infraNs2 ?? undefined,
    };
  }

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
          landingPage: {
            select: { id: true, name: true, slug: true },
          },
          organisation: {
            select: {
              id: true,
              name: true,
              slug: true,
              subdomain: true,
              customDomain: true,
            },
          },
        },
      }),
      this.prisma.orgDomainRequest.count({ where }),
    ]);

    const dnsOpts = await this.dnsOptions();
    const baseDomain = getSubdomainBaseDomain();
    const wildcard = generateSubdomainDnsInstructions('*', {
      mode: dnsOpts.mode,
      ip: dnsOpts.ip,
      ipv6: dnsOpts.ipv6,
      cname: dnsOpts.cname,
      ns1: dnsOpts.ns1,
      ns2: dnsOpts.ns2,
    });

    return {
      data: rows.map((r) => toView(r, dnsOpts)),
      total,
      page,
      limit,
      baseDomain,
      dnsInstructions: wildcard.records,
      dnsMode: wildcard.mode,
    };
  }

  // Approve activates the organisation's subdomain or maps its custom domain.
  async approve(id: string, adminId: string) {
    const req = await this.getPending(id);
    const org = await this.prisma.organisation.findUnique({
      where: { id: req.orgId },
    });
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
        // Map the approved custom domain to the org's selected landing page.
        // Falls back to the org's primary published page when none was chosen.
        let targetPageId = req.landingPageId ?? null;
        if (!targetPageId) {
          const primary = await this.prisma.landingPage.findFirst({
            where: { orgId: org.id, status: 'published' },
            orderBy: { updatedAt: 'desc' },
            select: { id: true },
          });
          targetPageId = primary?.id ?? null;
        }
        if (targetPageId) {
          orgUpdate.customDomainLandingPageId = targetPageId;
        }
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
        await tx.organisation.update({
          where: { id: req.orgId },
          data: orgUpdate,
        });
      }
      await tx.auditLog.create({
        data: {
          orgId: req.orgId,
          actorId: adminId,
          action: 'org_domain_approved',
          entity: 'OrgDomainRequest',
          entityId: id,
          metadata: {
            kind: req.kind,
            domain: req.kind === 'subdomain' ? req.subdomain : req.customDomain,
          } as any,
        },
      });
      await tx.notification.create({
        data: buildNotificationData({
          orgId: req.orgId,
          type:
            req.kind === 'subdomain'
              ? 'subdomain_request'
              : 'custom_domain_request',
          title:
            req.kind === 'subdomain'
              ? 'Subdomain approved'
              : 'Custom domain approved',
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
      if (req.kind === 'custom_domain') {
        await tx.organisation.update({
          where: { id: req.orgId },
          data: { customDomain: null, customDomainStatus: 'rejected' },
        });
      }
      await tx.auditLog.create({
        data: {
          orgId: req.orgId,
          actorId: adminId,
          action: 'org_domain_rejected',
          entity: 'OrgDomainRequest',
          entityId: id,
          metadata: {
            kind: req.kind,
            domain: req.kind === 'subdomain' ? req.subdomain : req.customDomain,
            reason,
          } as any,
        },
      });
      await tx.notification.create({
        data: buildNotificationData({
          orgId: req.orgId,
          type:
            req.kind === 'subdomain'
              ? 'subdomain_request'
              : 'custom_domain_request',
          title:
            req.kind === 'subdomain'
              ? 'Subdomain request rejected'
              : 'Custom domain request rejected',
          body: `${req.kind === 'subdomain' ? req.subdomain : req.customDomain} was rejected${reason ? ` — ${reason}` : ''}.`,
          entity: 'OrgDomainRequest',
          entityId: id,
        }),
      });
      return reqRow;
    });

    return toView(updated);
  }

  // Verify an APPROVED subdomain request: resolves the live host against real
  // DNS, checks it points at the configured AWS origin, and confirms the org
  // has a published landing page to serve. This is exactly what surfaces why
  // a subdomain "isn't working" (no wildcard record / wrong IP / no site).
  async verify(id: string) {
    const req = await this.prisma.orgDomainRequest.findUnique({
      where: { id },
      include: { organisation: true },
    });
    if (!req) throw new NotFoundException('Domain request not found');
    if (req.kind !== 'subdomain') {
      throw new BadRequestException('Only subdomain requests can be verified');
    }
    const org = req.organisation;
    const subdomain = org.subdomain || req.subdomain;
    if (!subdomain || org.subdomainStatus !== 'active') {
      throw new BadRequestException(
        'Subdomain must be approved first — the organisation subdomain is not active.',
      );
    }

    const host = subdomainHost(subdomain);
    const baseDomain = getSubdomainBaseDomain();
    const cfg = await this.platformConfig.getConfig();
    const expectedIp = cfg.infraIp || process.env.INFRA_IP || null;

    let hostIps: string[] = [];
    let baseIps: string[] = [];
    let dnsStatus: 'ok' | 'mismatch' | 'unresolved' = 'unresolved';
    try {
      hostIps = await dns.resolve4(host);
    } catch {
      hostIps = [];
    }
    try {
      baseIps = await dns.resolve4(baseDomain);
    } catch {
      baseIps = [];
    }
    if (hostIps.length > 0) {
      dnsStatus = expectedIp
        ? hostIps.includes(expectedIp)
          ? 'ok'
          : 'mismatch'
        : 'ok';
    }

    const landingPage = await this.prisma.landingPage.findFirst({
      where: { orgId: org.id, status: 'published' },
      orderBy: { updatedAt: 'desc' },
      select: { id: true, slug: true, name: true, status: true },
    });

    return {
      id: req.id,
      subdomain,
      host,
      baseDomain,
      dnsMode: cfg.dnsMode,
      expectedIp,
      organisation: {
        id: org.id,
        name: org.name,
        slug: org.slug,
        status: org.status,
        subdomainStatus: org.subdomainStatus,
      },
      dns: {
        status: dnsStatus,
        hostIps,
        baseIps,
        expectedIp,
      },
      landingPage,
      live: dnsStatus === 'ok' && Boolean(landingPage),
    };
  }

  private async getPending(id: string) {
    const req = await this.prisma.orgDomainRequest.findUnique({
      where: { id },
    });
    if (!req) throw new NotFoundException('Domain request not found');
    if (req.status !== 'pending') {
      throw new BadRequestException(
        `Cannot review a request in status ${req.status}`,
      );
    }
    return req;
  }
}
