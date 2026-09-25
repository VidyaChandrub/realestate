import {
  Body,
  Controller,
  Get,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OrgApprovedGuard } from '../../common/guards/org-approved.guard';
import { PermissionGuard } from '../../common/guards/permission.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { SETTINGS_ACTIONS } from '../../common/utils/permissions.util';
import type { JwtPayload } from '../../common/types/jwt-payload.interface';
import { EmailService } from './email.service';
import {
  ListEmailLogsDto,
  SendTestEmailDto,
  UpdateEmailConfigDto,
} from './dto/email.dto';

// Settings > Email & SMTP — saving / testing needs "Edit email & SMTP".
const ENFORCE = { enforceForOrgAdmin: true } as const;

@UseGuards(JwtAuthGuard, OrgApprovedGuard, PermissionGuard)
@Controller('org/email')
export class OrgEmailController {
  constructor(private readonly emailService: EmailService) {}

  @RequirePermission('settings', 'view', ENFORCE)
  @Get('config')
  getConfig(@CurrentUser() actor: JwtPayload) {
    return this.emailService.getConfig(actor.orgId as string);
  }

  @RequirePermission('settings', SETTINGS_ACTIONS.editEmail, ENFORCE)
  @Put('config')
  updateConfig(
    @CurrentUser() actor: JwtPayload,
    @Body() dto: UpdateEmailConfigDto,
  ) {
    return this.emailService.updateConfig(dto, actor.orgId as string);
  }

  @RequirePermission('settings', SETTINGS_ACTIONS.editEmail, ENFORCE)
  @Post('test')
  sendTestEmail(
    @CurrentUser() actor: JwtPayload,
    @Body() dto: SendTestEmailDto,
  ) {
    return this.emailService.sendTestEmail(dto, actor.orgId as string);
  }

  @RequirePermission('settings', 'view', ENFORCE)
  @Get('logs')
  listLogs(
    @CurrentUser() actor: JwtPayload,
    @Query() query: ListEmailLogsDto,
  ) {
    return this.emailService.listLogs(query, actor.orgId as string);
  }

  @RequirePermission('settings', 'view', ENFORCE)
  @Get('stats')
  getStats(@CurrentUser() actor: JwtPayload) {
    return this.emailService.getStats(actor.orgId as string);
  }
}
