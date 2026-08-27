import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class PublicSiteService {
  constructor(private readonly prisma: PrismaService) {}

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
