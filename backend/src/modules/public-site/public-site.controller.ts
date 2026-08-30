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
}
