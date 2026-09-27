import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import {
  DnsRecordSpec,
} from '../../common/utils/domain.util';
import { buildNotificationData } from '../../common/utils/notifications.util';
import { PlatformConfigService } from '../platform-config/platform-config.service';
import { promises as dns } from 'node:dns';

function generateCustomDomainDnsInstructions(
  domain: string,
  opts: {
    mode?: string;
    ip?: string;
    ipv6?: string | null;
    cname?: string;
    ns1?: string;
    ns2?: string;
  } = {},
): DnsRecordSpec[] {
  const mode = opts.mode ?? process.env.DNS_MODE ?? 'a';
  const ip = opts.ip ?? process.env.INFRA_IP ?? '';
  const ipv6 = opts.ipv6 !== undefined ? opts.ipv6 : (process.env.INFRA_IPV6 ?? null);
  const cname = opts.cname ?? process.env.INFRA_CNAME_TARGET ?? 'cname.bigestate.io';
  const ns1 = opts.ns1 ?? process.env.INFRA_NS1 ?? 'ns1.bigestate.io';
  const ns2 = opts.ns2 ?? process.env.INFRA_NS2 ?? 'ns2.bigestate.io';
  const records: DnsRecordSpec[] = [];

  if (mode === 'ns') {
    records.push({
      type: 'NS',
      host: '@',
      value: ns1,
      ttl: 'Auto',
      purpose: 'Primary nameserver',
    });
    records.push({
      type: 'NS',
      host: '@',
      value: ns2,
      ttl: 'Auto',
      purpose: 'Secondary nameserver',
    });
  } else if (mode === 'cname') {
    records.push({
      type: 'CNAME',
      host: domain.startsWith('www.') ? 'www' : '@',
      value: cname,
      ttl: 'Auto',
      purpose: 'Website origin',
    });
  } else {
    records.push({
      type: 'A',
      host: '@',
      value: ip || '76.76.21.21',
      ttl: 'Auto',
      purpose: 'Website origin (IPv4)',
    });
    if (ipv6) {
      records.push({
        type: 'AAAA',
        host: '@',
        value: ipv6,
        ttl: 'Auto',
        purpose: 'Website origin (IPv6)',
      });
    }
  }
  return records;
}

// A single row returned to the Super Admin "Org Domains" list.
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
    kind: 'custom_domain',
    customDomain: req.customDomain,
    landingPageId: req.landingPageId ?? null,
    landingPage: req.landingPage
      ? { id: req.landingPage.id, name: req.landingPage.name, slug: req.landingPage.slug }
      : null,
    status: req.status,
    requestedAt: req.requestedAt,
    reviewedAt: req.reviewedAt,
    rejectionReason: req.rejectionReason,
    dnsInstructions: req.customDomain
      ? generateCustomDomainDnsInstructions(req.customDomain, opts)
      : null,
    organisation: req.organisation
      ? {
          id: req.organisation.id,
          name: req.organisation.name,
          slug: req.organisation.slug,
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

  // Lists EVERY organisation's custom-domain requests across all orgs
  async list(query: {
    status?: string;
    kind?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: any = { kind: 'custom_domain' };
    if (query.status && query.status !== 'all') where.status = query.status;
    if (query.search) {
      where.AND = [
        {
          OR: [
            { customDomain: { contains: query.search, mode: 'insensitive' } },
            { organisation: { name: { contains: query.search, mode: 'insensitive' } } },
            { organisation: { slug: { contains: query.search, mode: 'insensitive' } } },
          ],
        },
      ];
    }

    const [total, rows, dnsOpts] = await Promise.all([
      this.prisma.orgDomainRequest.count({ where }),
      this.prisma.orgDomainRequest.findMany({
        where,
        orderBy: { requestedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          landingPage: { select: { id: true, name: true, slug: true } },
          organisation: {
            select: {
              id: true,
              name: true,
              slug: true,
              customDomain: true,
            },
          },
        },
      }),
      this.dnsOptions(),
    ]);

    return {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit) || 1,
      rows: rows.map((r) => toView(r, dnsOpts)),
      dnsInstructions: generateCustomDomainDnsInstructions('yourdomain.com', dnsOpts),
      dnsMode: dnsOpts.mode,
    };
  }

  // Approve maps the custom domain to the organisation's landing page.
  async approve(id: string, adminId: string) {
    const req = await this.getPending(id);
    const org = await this.prisma.organisation.findUnique({
      where: { id: req.orgId },
    });
    if (!org) throw new NotFoundException('Organisation not found');

    const orgUpdate: any = {};
    if (req.customDomain) {
      const targetPageId = req.landingPageId ?? null;
      if (!org.customDomain || org.customDomain === req.customDomain) {
        orgUpdate.customDomain = req.customDomain;
        orgUpdate.customDomainStatus = targetPageId ? 'connected' : 'approved';
        if (targetPageId) {
          orgUpdate.customDomainLandingPageId = targetPageId;
        }
      }
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const reqRow = await tx.orgDomainRequest.update({
        where: { id },
        data: {
          status: req.landingPageId ? 'connected' : 'approved',
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
            kind: 'custom_domain',
            domain: req.customDomain,
            landingPageId: req.landingPageId ?? null,
          } as any,
        },
      });
      await tx.notification.create({
        data: buildNotificationData({
          orgId: req.orgId,
          type: 'custom_domain_request',
          title: 'Custom domain approved',
          body: `${org.name} can now point ${req.customDomain} at its landing page.`,
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
    const org = await this.prisma.organisation.findUnique({
      where: { id: req.orgId },
    });

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
      if (org?.customDomain === req.customDomain) {
        const another = await tx.orgDomainRequest.findFirst({
          where: {
            orgId: req.orgId,
            id: { not: id },
            kind: 'custom_domain',
            status: { in: ['approved', 'connected'] },
          },
          orderBy: { requestedAt: 'desc' },
        });

        if (another) {
          await tx.organisation.update({
            where: { id: req.orgId },
            data: {
              customDomain: another.customDomain,
              customDomainStatus: another.status,
              customDomainLandingPageId: another.landingPageId,
            },
          });
        } else {
          await tx.organisation.update({
            where: { id: req.orgId },
            data: { customDomain: null, customDomainStatus: 'rejected', customDomainLandingPageId: null },
          });
        }
      }
      await tx.auditLog.create({
        data: {
          orgId: req.orgId,
          actorId: adminId,
          action: 'org_domain_rejected',
          entity: 'OrgDomainRequest',
          entityId: id,
          metadata: {
            kind: 'custom_domain',
            domain: req.customDomain,
            reason,
          } as any,
        },
      });
      await tx.notification.create({
        data: buildNotificationData({
          orgId: req.orgId,
          type: 'custom_domain_request',
          title: 'Custom domain request rejected',
          body: `${req.customDomain} was rejected${reason ? ` — ${reason}` : ''}.`,
          entity: 'OrgDomainRequest',
          entityId: id,
        }),
      });
      return reqRow;
    });

    return toView(updated);
  }

  // Verify an APPROVED custom domain request: resolves the live host against real
  // DNS and checks it points at the configured origin.
  async verify(id: string) {
    const req = await this.prisma.orgDomainRequest.findUnique({
      where: { id },
      include: { organisation: true },
    });
    if (!req) throw new NotFoundException('Domain request not found');
    const domain = req.customDomain;
    if (!domain) {
      throw new BadRequestException('No custom domain found on this request');
    }
    const org = req.organisation;

    const cfg = await this.platformConfig.getConfig();
    const expectedIp = cfg.infraIp || process.env.INFRA_IP || null;

    let hostIps: string[] = [];
    let dnsStatus: 'ok' | 'mismatch' | 'unresolved' = 'unresolved';
    try {
      hostIps = await dns.resolve4(domain);
    } catch {
      hostIps = [];
    }
    if (hostIps.length > 0) {
      dnsStatus = expectedIp
        ? hostIps.includes(expectedIp)
          ? 'ok'
          : 'mismatch'
        : 'ok';
    }

    const landingPage = req.landingPageId
      ? await this.prisma.landingPage.findFirst({
          where: { id: req.landingPageId, orgId: org.id },
          select: { id: true, slug: true, name: true, status: true },
        })
      : await this.prisma.landingPage.findFirst({
          where: { orgId: org.id, status: 'published' },
          orderBy: { updatedAt: 'desc' },
          select: { id: true, slug: true, name: true, status: true },
        });

    return {
      id: req.id,
      customDomain: domain,
      host: domain,
      dnsMode: cfg.dnsMode,
      expectedIp,
      organisation: {
        id: org.id,
        name: org.name,
        slug: org.slug,
        status: org.status,
      },
      dns: {
        status: dnsStatus,
        hostIps,
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
