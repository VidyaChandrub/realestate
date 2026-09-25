import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OrgApprovedGuard } from '../../common/guards/org-approved.guard';
import {
  PermissionGuard,
  assertAnyOrgPermission,
} from '../../common/guards/permission.guard';
import { PrismaService } from '../../database/prisma.service';
import { SUPPORT_ACTIONS } from '../../common/utils/permissions.util';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/types/jwt-payload.interface';
import { SupportService } from './support.service';
import { CreateSupportTicketDto } from './dto/create-support-ticket.dto';
import { CreateSupportMessageDto } from './dto/create-support-message.dto';
import { ListSupportTicketsQueryDto } from './dto/list-support-tickets-query.dto';
import { CreateSupportUploadUrlDto } from './dto/create-support-upload-url.dto';

// Org-facing Support & Help: raise a ticket, see this org's tickets, and chat
// with the Platform Team on one. Every query/mutation is scoped to the
// caller's own orgId (from the JWT) — one org can never see or reply to
// another's tickets. The Support Management console counterpart is
// admin/support.controller.ts. Routes map to the Support pills (View, Raise
// ticket, Reply) and hold the org admin to what Super Admin granted.
const ENFORCE = { enforceForOrgAdmin: true } as const;

@UseGuards(JwtAuthGuard, OrgApprovedGuard, PermissionGuard)
@Controller('org/support')
export class SupportController {
  constructor(
    private readonly service: SupportService,
    private readonly prisma: PrismaService,
  ) {}

  // Attachments go on a new ticket or on a reply, so either pill allows it.
  @RequirePermission('support', 'view', ENFORCE)
  @Post('upload-url')
  async createUploadUrl(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateSupportUploadUrlDto,
  ) {
    await assertAnyOrgPermission(
      this.prisma,
      user,
      'support',
      [SUPPORT_ACTIONS.raiseTicket, SUPPORT_ACTIONS.reply],
      true,
    );
    return this.service.createUploadUrl(user.orgId as string, dto);
  }

  // Support > Raise ticket.
  @RequirePermission('support', SUPPORT_ACTIONS.raiseTicket, ENFORCE)
  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateSupportTicketDto) {
    return this.service.createTicket(user.orgId as string, user, dto);
  }

  @RequirePermission('support', 'view', ENFORCE)
  @Get()
  list(@CurrentUser() user: JwtPayload, @Query() query: ListSupportTicketsQueryDto) {
    return this.service.listForOrg(user.orgId as string, user, query);
  }

  @RequirePermission('support', 'view', ENFORCE)
  @Get(':id')
  getById(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.service.getForOrg(user.orgId as string, user, id);
  }

  // Support > Reply.
  @RequirePermission('support', SUPPORT_ACTIONS.reply, ENFORCE)
  @Post(':id/messages')
  addMessage(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: CreateSupportMessageDto,
  ) {
    return this.service.addOrgMessage(user.orgId as string, user, id, dto);
  }
}
