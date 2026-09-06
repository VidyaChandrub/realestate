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
  async resolvePortal(host: string) {
    const normalized = (host ?? '').trim().toLowerCase().replace(/:\d+$/, '').replace(/^www\./, '');
    const subdomain = extractSubdomainFromHost(normalized);
    const org = subdomain
      ? await this.prisma.organisation.findFirst({
          where: { subdomain, subdomainStatus: 'active', status: 'active' },
        })
      : await this.prisma.organisation.findFirst({
          where: { customDomain: normalized, customDomainStatus: 'connected', status: 'active' },
        });
    if (!org) throw new NotFoundException('No organisation for host');
    return {
      id: org.id,
      name: org.name,
      slug: org.slug,
      logoUrl: org.logoUrl,
      brandColour: org.brandColour,
      subdomain: org.subdomain,
      subdomainHost: org.subdomain ? subdomainHost(org.subdomain) : null,
      customDomain: org.customDomain,
      loginPath: '/login',
      sitePath: '/site',
    };
  }

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

    throw new NotFoundException('No site for host');
  }

  private async buildOrgSite(org: any, host: string) {
    // The org's PRIMARY landing page: an explicitly selected one (its custom
    // domain target), else the most recently published page.
    let landingPage: any = null;
    if (org.customDomainLandingPageId) {
      landingPage = await this.prisma.landingPage.findFirst({
        where: { id: org.customDomainLandingPageId, orgId: org.id, status: 'published' },
      }) ?? null;
    }
    if (!landingPage) {
      landingPage = await this.prisma.landingPage.findFirst({
        where: { orgId: org.id, status: 'published' },
        orderBy: { updatedAt: 'desc' },
      }) ?? null;
    }
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
        customDomainLandingPageId: org.customDomainLandingPageId,
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
        // Planned unit mix.
        unitTypes: { orderBy: { createdAt: 'asc' } },
        // A unit now belongs straight to the project, not to a unit type.
        units: {
          where: { status: 'available' },
          orderBy: { unitNo: 'asc' },
          select: {
            id: true,
            unitNo: true,
            configuration: true,
            variantLabel: true,
            carpetSqft: true,
            builtupSqft: true,
            tower: true,
            floor: true,
            facing: true,
            price: true,
            status: true,
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
    const org = await this.prisma.organisation.findFirst({ where: { customDomain: normalized, customDomainStatus: 'connected', status: 'active' } });
    if (!org) throw new NotFoundException('No site for domain');

    const landingPage = org.customDomainLandingPageId
      ? await this.prisma.landingPage.findFirst({ where: { id: org.customDomainLandingPageId, orgId: org.id, status: 'published' } })
      : null;
    const page = landingPage ?? (await this.prisma.landingPage.findFirst({ where: { orgId: org.id, status: 'published' }, orderBy: { updatedAt: 'desc' } }));
    if (!page) throw new NotFoundException('Site not published');
    return { domain: org.customDomain, landingPage: page, organisation: org };
  }

  async sitemapForDomain(domain: string): Promise<string> {
    const site = await this.resolveByDomain(domain);
    const cfg: any = site.landingPage.content;
    const base = `https://${site.domain}`;
    // Includes only published pages for that website - currently single page + children (thank-you) excluded if not published
    const pages = await this.prisma.landingPage.findMany({ where: { orgId: site.landingPage.orgId, status: 'published' } });
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
    const page = await this.prisma.landingPage.findUnique({ where: { id: landingPageId }, select: { id: true, slug: true, orgId: true } });
    if (!page) throw new NotFoundException('Page not found');
    const org = await this.prisma.organisation.findFirst({
      where: {
        id: page.orgId,
        customDomain: { not: null },
        customDomainStatus: 'connected',
        OR: [{ customDomainLandingPageId: page.id }, { customDomainLandingPageId: null }],
      },
    });
    const domain = org?.customDomain ?? null;
    if (domain) {
      const path = slug ? `/${slug}` : page.slug ? `/${page.slug}` : '/';
      return `https://${domain}${path === '/' ? '/' : path}`;
    }
    return null;
  }

  async resolveBySlug(slug: string) {
    const raw = (slug ?? '').trim().toLowerCase();
    const hyphenated = raw.replace(/\s+/g, '-');
    const page = await this.prisma.landingPage.findFirst({
      where: {
        OR: [
          { slug: { equals: raw, mode: 'insensitive' } },
          { slug: { equals: hyphenated, mode: 'insensitive' } },
        ],
        status: 'published',
      },
      include: {
        organisation: {
          select: {
            id: true,
            name: true,
            slug: true,
            logoUrl: true,
            brandColour: true,
            subdomain: true,
            customDomain: true,
          },
        },
        sourceTemplate: {
          select: { id: true, name: true, baseDesignName: true },
        },
      },
    });
    if (!page) {
      const draft = await this.prisma.landingPage.findFirst({
        where: {
          OR: [
            { slug: { equals: raw, mode: 'insensitive' } },
            { slug: { equals: hyphenated, mode: 'insensitive' } },
          ],
        },
        include: {
          organisation: {
            select: {
              id: true,
              name: true,
              slug: true,
              logoUrl: true,
              brandColour: true,
              subdomain: true,
              customDomain: true,
            },
          },
          sourceTemplate: {
            select: { id: true, name: true, baseDesignName: true },
          },
        },
      });
      if (draft) return draft;

      throw new NotFoundException('Landing page not found or not published');
    }
    return page;
  }
}
