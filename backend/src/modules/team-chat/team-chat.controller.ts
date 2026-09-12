import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OrgApprovedGuard } from '../../common/guards/org-approved.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/types/jwt-payload.interface';
import { TeamChatService } from './team-chat.service';
import { CreateChannelDto } from './dto/create-channel.dto';
import { CreateDmDto } from './dto/create-dm.dto';
import { CreateMessageDto } from './dto/create-message.dto';

// Any approved organisation member can chat — like the mock design, where any
// teammate starts a thread. Deliberately NOT OrgAdminGuard: unlike team
// *management*, reading/writing your own team's chat is an everyday member
// action. (Org-teams itself stays admin-only — chat management is separate.)
// Every route still derives orgId from the JWT, never a client param, so one
// org can never see or touch another org's channels.
@UseGuards(JwtAuthGuard, OrgApprovedGuard)
@Controller('org/team-chat')
export class TeamChatController {
  constructor(private readonly service: TeamChatService) {}

  @Get()
  overview(@CurrentUser() user: JwtPayload) {
    return this.service.overview(user.orgId as string, user.sub);
  }

  @Post('channels')
  createChannel(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateChannelDto,
  ) {
    return this.service.createChannel(user.orgId as string, user.sub, dto);
  }

  @Post('dms')
  createDm(@CurrentUser() user: JwtPayload, @Body() dto: CreateDmDto) {
    return this.service.createDm(user.orgId as string, user.sub, dto);
  }

  @Get('channels/:id')
  getChannel(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.service.getChannel(user.orgId as string, user.sub, id);
  }

  @Post('channels/:id/messages')
  addMessage(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: CreateMessageDto,
  ) {
    return this.service.addMessage(user.orgId as string, user.sub, id, dto);
  }
}