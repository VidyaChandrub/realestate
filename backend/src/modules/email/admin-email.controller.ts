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
import { SuperAdminGuard } from '../../common/guards/super-admin.guard';
import { EmailService } from './email.service';
import {
  UpdateEmailConfigDto,
  SendTestEmailDto,
  ListEmailLogsDto,
} from './dto/email.dto';

@UseGuards(JwtAuthGuard, SuperAdminGuard)
@Controller('admin/email')
export class AdminEmailController {
  constructor(private readonly emailService: EmailService) {}

  @Get('config')
  getConfig() {
    return this.emailService.getConfig();
  }

  @Put('config')
  updateConfig(@Body() dto: UpdateEmailConfigDto) {
    return this.emailService.updateConfig(dto);
  }

  @Post('test')
  sendTestEmail(@Body() dto: SendTestEmailDto) {
    return this.emailService.sendTestEmail(dto);
  }

  @Get('logs')
  listLogs(@Query() query: ListEmailLogsDto) {
    return this.emailService.listLogs(query);
  }

  @Get('stats')
  getStats() {
    return this.emailService.getStats();
  }
}
