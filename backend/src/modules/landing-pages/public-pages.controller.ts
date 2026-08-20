import { Controller, Get, Param } from '@nestjs/common';
import { LandingPagesService } from './landing-pages.service';

// Public render endpoint — powers the published landing pages. Only
// returns pages with status = published.
@Controller('public/pages')
export class PublicPagesController {
  constructor(private readonly landingPagesService: LandingPagesService) {}

  @Get(':slug')
  render(@Param('slug') slug: string) {
    return this.landingPagesService.getBySlugForRender(slug);
  }
}
