import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OrgAdminGuard } from '../../common/guards/org-admin.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/types/jwt-payload.interface';
import { LeadsService } from './leads.service';
import type { CreateLeadDto } from './dto/create-lead.dto';

@Controller('org/leads')
export class LeadsController {
  constructor(private readonly service: LeadsService) {}

  /**
   * Public lead capture. Intentionally unguarded: the published form is filled
   * by anonymous visitors. orgId is derived from landingPageId server-side.
   */
  @Post()
  createPublic(@Body() dto: CreateLeadDto) {
    return this.service.createFromPublic(dto);
  }

  @UseGuards(JwtAuthGuard, OrgAdminGuard)
  @Get()
  list(@CurrentUser() user: JwtPayload) {
    return this.service.list(user.orgId as string);
  }
}
