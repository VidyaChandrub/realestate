import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OrgAdminGuard } from '../../common/guards/org-admin.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/types/jwt-payload.interface';
import { OrgTrackingService } from './org-tracking.service';

@UseGuards(JwtAuthGuard, OrgAdminGuard)
@Controller('org/tracking')
export class OrgTrackingController {
  constructor(private readonly service: OrgTrackingService) {}

  @Post('event')
  record(@CurrentUser() user: JwtPayload, @Body() dto: { landingPageId: string; eventType: string; metadata?: any }) {
    return this.service.record(user.orgId as string, dto);
  }

  @Get(':landingPageId')
  list(@CurrentUser() user: JwtPayload, @Param('landingPageId') id: string, @Query('eventType') eventType?: string, @Query('page') page?: string, @Query('limit') limit?: string) {
    return this.service.list(user.orgId as string, id, { eventType, page: page ? parseInt(page, 10) : undefined, limit: limit ? parseInt(limit, 10) : undefined });
  }

  @Get(':landingPageId/stats')
  stats(@CurrentUser() user: JwtPayload, @Param('landingPageId') id: string) {
    return this.service.stats(user.orgId as string, id);
  }
}
