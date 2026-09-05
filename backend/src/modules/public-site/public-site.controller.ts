import { Controller, Get, Param, Header, Res } from '@nestjs/common';
import { PublicSiteService } from './public-site.service';
import type { Response } from 'express';

@Controller('public/site')
export class PublicSiteController {
  constructor(private readonly service: PublicSiteService) {}

  @Get('resolve/:domain')
  resolve(@Param('domain') domain: string) {
    return this.service.resolveByDomain(domain);
  }

  @Get('resolve-org/:host')
  resolveOrg(@Param('host') host: string) {
    return this.service.resolveByHost(host);
  }

  @Get('portal/:host')
  portal(@Param('host') host: string) {
    return this.service.resolvePortal(host);
  }

  @Get('projects/:landingPageId')
  projects(@Param('landingPageId') landingPageId: string) {
    return this.service.projectsForLandingPage(landingPageId);
  }

  @Get('domain/:domain/sitemap.xml')
  @Header('Content-Type', 'application/xml')
  async sitemap(@Param('domain') domain: string) {
    return this.service.sitemapForDomain(domain);
  }

  @Get('domain/:domain/robots.txt')
  @Header('Content-Type', 'text/plain')
  async robots(@Param('domain') domain: string) {
    return this.service.robotsForDomain(domain);
  }

  @Get('canonical/:landingPageId')
  canonical(@Param('landingPageId') id: string) {
    return this.service.canonicalForPage(id);
  }

  @Get('page/:slug')
  resolvePage(@Param('slug') slug: string) {
    return this.service.resolveBySlug(slug);
  }
}
