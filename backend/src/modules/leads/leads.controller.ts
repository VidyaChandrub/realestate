import {
  Body,
  Controller,
  Get,
  HttpCode,
  Ip,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { SuperAdminGuard } from '../../common/guards/super-admin.guard';
import { LeadsService } from './leads.service';
import { CreateLeadDto } from './dto/create-lead.dto';

@Controller()
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  // Public — used by the rendered landing pages (no auth).
  @Post('public/pages/:slug/leads')
  @HttpCode(201)
  capture(
    @Param('slug') slug: string,
    @Body() dto: CreateLeadDto,
    @Req() req: Request,
    @Ip() ip: string,
  ) {
    const rawUrl = req.originalUrl ?? '';
    const query = rawUrl.includes('?') ? rawUrl.split('?')[1] : '';
    return this.leadsService.captureBySlug(slug, dto, {
      utm: query ? new URLSearchParams(query) : undefined,
      ip,
      userAgent: req.headers['user-agent'],
    });
  }

  // Super Admin — lead inbox for a landing page.
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @Get('admin/landing-pages/:pageId/leads')
  listForPage(
    @Param('pageId') pageId: string,
    @Query() query: { page?: string; limit?: string },
  ) {
    return this.leadsService.listForPage(pageId, {
      page: query.page ? Number(query.page) : undefined,
      limit: query.limit ? Number(query.limit) : undefined,
    });
  }
}
