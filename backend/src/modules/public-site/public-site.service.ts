import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { extractSubdomainFromHost, subdomainHost } from '../../common/utils/domain.util';

@Injectable()
export class PublicSiteService {
  constructor(private readonly prisma: PrismaService) {}

  // Resolve an incoming host to an organisation site. Supports:
  //  - organisation subdomain: "<sub>.<base>" or "<sub>.localhost" (local dev)
  //  - a custom domain that the org has verified/connected
  // Returns the org + its active, published landing page.
  async resolveByHost(host: string) {
    const normalized = (host ?? '').trim().toLowerCase().replace(/:\d+$/, '').replace(/^www\./, '');

    // 1) Organisation subdomain (platform wildcard / localhost).
    const subdomain = extractSubdomainFromHost(normalized);
    if (subdomain) {
      const org = await this.prisma.organisation.findFirst({
        where: { subdomain, subdomainStatus: 'active', status: 'active' },
      });
      if (org) {
        return this.buildOrgSite(org, host);
      }
    }

    // 2) Custom domain mapped to an organisation (verified/connected).
    const custom = await this.prisma.organisation.findFirst({
      where: { customDomain: normalized, customDomainStatus: 'connected', status: 'active' },
    });
    if (custom) {
      return this.buildOrgSite(custom, host);
    }

    // 3) Legacy per-landing-page custom domain (existing behaviour).
    const req = await this.prisma.domainRequest.findFirst({
      where: { domain: normalized, status: 'connected' },
      include: { landingPage: true },
    });
    if (req && req.landingPage.status === 'published') {
      return { type: 'legacy', domain: req.domain, landingPage: req.landingPage, ssl: req.sslStatus, verifiedAt: req.verifiedAt };
    }

    throw new NotFoundException('No site for host');
  }

  private async buildOrgSite(org: any, host: string) {
    // The org's primary published landing page (first published one, else null).
    const landingPage = await this.prisma.landingPage.findFirst({
      where: { orgId: org.id, status: 'published' },
      orderBy: { updatedAt: 'desc' },
    }) ?? null;
    return {
      type: org.customDomain && host.replace(/^www\./, '') === org.customDomain ? 'custom' : 'subdomain',
      organisation: {
        id: org.id,
        name: org.name,
        slug: org.slug,
        subdomain: org.subdomain,
        subdomainStatus: org.subdomainStatus,
        customDomain: org.customDomain,
        customDomainStatus: org.customDomainStatus,
        logoUrl: org.logoUrl,
        brandColour: org.brandColour,
        defaultLanguage: org.defaultLanguage,
      },
      subdomainHost: org.subdomain ? subdomainHost(org.subdomain) : null,
      landingPage: landingPage
        ? {
            id: landingPage.id,
            slug: landingPage.slug,
            name: landingPage.name,
            status: landingPage.status,
            content: landingPage.content,
            publishedAt: landingPage.publishedAt,
          }
        : null,
    };
  }

  async projectsForLandingPage(landingPageId: string) {
    const page = await this.prisma.landingPage.findFirst({
      where: { id: landingPageId, status: 'published' },
      select: { orgId: true },
    });
    if (!page) throw new NotFoundException('Published landing page not found');

    const projects = await this.prisma.project.findMany({
      where: {
        orgId: page.orgId,
        status: 'active',
      },
      orderBy: { updatedAt: 'desc' },
      include: {
        unitTypes: {
          orderBy: { createdAt: 'asc' },
          include: {
            units: {
              where: { status: 'available' },
              orderBy: { unitNo: 'asc' },
              select: { id: true, unitNo: true, tower: true, floor: true, facing: true, price: true, status: true },
            },
          },
        },
      },
    });

    return projects.map((project) => ({
      ...project,
      landArea: project.landArea === null ? null : Number(project.landArea),
    }));
  }

  async resolveByDomain(domain: string) {
    const normalized = domain.toLowerCase().replace(/^www\./, '');
    const req = await this.prisma.domainRequest.findFirst({ where: { domain: normalized, status: 'connected' }, include: { landingPage: true } });
    if (!req) throw new NotFoundException('No site for domain');
    // ensure landing page is published
    if (req.landingPage.status !== 'published') throw new NotFoundException('Site not published');
    return { domain: req.domain, landingPage: req.landingPage, ssl: req.sslStatus, verifiedAt: req.verifiedAt };
  }

  async sitemapForDomain(domain: string): Promise<string> {
    const site = await this.resolveByDomain(domain);
    const cfg: any = site.landingPage.content;
    const base = `https://${site.domain}`;
    // Includes only published pages for that website - currently single page + children (thank-you) excluded if not published
    const pages = await this.prisma.landingPage.findMany({ where: { orgId: site.landingPage.orgId, status: 'published' } });
    // Filter to those that belong to same website group? For now return all published for that org that share domain?
    // Better: return just this landing page + its published children that have same domain via domainRequest? Simulate isolated.
    const urls = pages
      .filter((p) => p.id === site.landingPage.id || p.parentId === site.landingPage.id)
      .map((p) => `${base}/${p.slug === site.landingPage.slug ? '' : p.slug}`.replace(/\/$/, '/'));
    const unique = [...new Set(urls)];
    if (unique.length === 0) unique.push(`${base}/`);
    return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${unique.map((u) => `  <url><loc>${u}</loc><changefreq>weekly</changefreq><priority>0.8</priority></url>`).join('\n')}\n</urlset>`;
  }

  async robotsForDomain(domain: string): Promise<string> {
    const site = await this.resolveByDomain(domain);
    const cfg: any = site.landingPage.content;
    const seoIndex = cfg?.config?.seo?.index !== false;
    const sitemapUrl = `https://${site.domain}/sitemap.xml`;
    if (!seoIndex) {
      return `User-agent: *\nDisallow: /\n# Sitemap: ${sitemapUrl}`;
    }
    return `User-agent: *\nAllow: /\nDisallow: /admin/\nDisallow: /api/\nSitemap: ${sitemapUrl}`;
  }

  async canonicalForPage(landingPageId: string, slug?: string) {
    const page = await this.prisma.landingPage.findUnique({ where: { id: landingPageId }, include: { domainRequest: true } });
    if (!page) throw new NotFoundException('Page not found');
    const domain = page.domainRequest?.status === 'connected' ? page.domainRequest.domain : null;
    if (domain) {
      const path = slug ? `/${slug}` : page.slug ? `/${page.slug}` : '/';
      return `https://${domain}${path === '/' ? '/' : path}`;
    }
    return null;
  }
}
