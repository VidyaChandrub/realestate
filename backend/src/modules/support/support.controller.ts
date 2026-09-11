import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OrgApprovedGuard } from '../../common/guards/org-approved.guard';
import { PermissionGuard } from '../../common/guards/permission.guard';
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
// admin/support.controller.ts.
@UseGuards(JwtAuthGuard, OrgApprovedGuard, PermissionGuard)
@Controller('org/support')
export class SupportController {
  constructor(private readonly service: SupportService) {}

  @RequirePermission('support', 'add')
  @Post('upload-url')
  createUploadUrl(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateSupportUploadUrlDto,
  ) {
    return this.service.createUploadUrl(user.orgId as string, dto);
  }

  @RequirePermission('support', 'add')
  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateSupportTicketDto) {
    return this.service.createTicket(user.orgId as string, user, dto);
  }

  @RequirePermission('support', 'view')
  @Get()
  list(@CurrentUser() user: JwtPayload, @Query() query: ListSupportTicketsQueryDto) {
    return this.service.listForOrg(user.orgId as string, user, query);
  }

  @RequirePermission('support', 'view')
  @Get(':id')
  getById(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.service.getForOrg(user.orgId as string, user, id);
  }

  @RequirePermission('support', 'add')
  @Post(':id/messages')
  addMessage(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: CreateSupportMessageDto,
  ) {
    return this.service.addOrgMessage(user.orgId as string, user, id, dto);
  }
}
