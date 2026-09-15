import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { SuperAdminGuard } from '../../common/guards/super-admin.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/types/jwt-payload.interface';
import { SupportService } from './support.service';
import { CreateSupportMessageDto } from './dto/create-support-message.dto';
import { ListSupportTicketsQueryDto } from './dto/list-support-tickets-query.dto';
import { CreateSupportUploadUrlDto } from './dto/create-support-upload-url.dto';
import { HoldSupportTicketDto } from './dto/hold-support-ticket.dto';
import { AssignSupportTicketDto } from './dto/assign-support-ticket.dto';

// Support Management (Super Admin console): every organisation's tickets in
// one place. SuperAdminGuard derives the required platform permission
// (admin_support) straight from this path, same as every other admin/*
// controller — no @RequirePermission needed here.
@UseGuards(JwtAuthGuard, SuperAdminGuard)
@Controller('admin/support')
export class AdminSupportController {
  constructor(private readonly service: SupportService) {}

  @Post('upload-url')
  createUploadUrl(@Body() dto: CreateSupportUploadUrlDto) {
    // No orgId — a Platform Team reply's attachment is a platform-level
    // upload, not scoped to any one organisation (see SupportService).
    return this.service.createUploadUrl(undefined, dto);
  }

  @Get()
  list(@CurrentUser() user: JwtPayload, @Query() query: ListSupportTicketsQueryDto) {
    return this.service.listForAdmin(user, query);
  }

  @Get(':id')
  getById(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.service.getForAdmin(user, id);
  }

  @Post(':id/messages')
  addMessage(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: CreateSupportMessageDto,
  ) {
    return this.service.addAdminMessage(user, id, dto);
  }

  @Post(':id/hold')
  hold(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: HoldSupportTicketDto,
  ) {
    return this.service.holdTicket(user, id, dto);
  }

  @Post(':id/resume')
  resume(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.service.resumeTicket(user, id);
  }

  @Post(':id/assign')
  assign(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: AssignSupportTicketDto,
  ) {
    return this.service.assignTicket(user, id, dto);
  }

  @Post(':id/close')
  close(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.service.closeTicket(user, id);
  }
}
