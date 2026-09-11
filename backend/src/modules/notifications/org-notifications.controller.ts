import { Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OrgApprovedGuard } from '../../common/guards/org-approved.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/types/jwt-payload.interface';
import { NotificationsService } from './notifications.service';

// The org member's own bell — a personal inbox, not gated by any module
// permission (every approved member has one, same as the Super Admin
// console's). Always scoped to the caller's own (orgId, recipientId) so one
// org's notifications never surface for another.
@UseGuards(JwtAuthGuard, OrgApprovedGuard)
@Controller('org/notifications')
export class OrgNotificationsController {
  constructor(private readonly service: NotificationsService) {}

  @Get()
  list(
    @CurrentUser() user: JwtPayload,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('unreadOnly') unreadOnly?: string,
  ) {
    return this.service.listForOrgUser(user.orgId as string, user.sub, {
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      unreadOnly,
    });
  }

  @Get('unread-count')
  unreadCount(@CurrentUser() user: JwtPayload) {
    return this.service.unreadCountForOrgUser(user.orgId as string, user.sub);
  }

  @Patch(':id/read')
  markRead(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.service.markReadForOrgUser(id, user.orgId as string, user.sub);
  }

  @Post('read-all')
  markAllRead(@CurrentUser() user: JwtPayload) {
    return this.service.markAllReadForOrgUser(user.orgId as string, user.sub);
  }
}
