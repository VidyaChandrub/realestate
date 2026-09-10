import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { SuperAdminGuard } from '../../common/guards/super-admin.guard';
import { AdminAuditLogsService } from './admin-audit-logs.service';
import { ListAuditLogsQueryDto } from './dto/list-audit-logs-query.dto';

@UseGuards(JwtAuthGuard, SuperAdminGuard)
@Controller('admin/audit-logs')
export class AdminAuditLogsController {
  constructor(private readonly auditLogs: AdminAuditLogsService) {}

  @Get()
  list(@Query() query: ListAuditLogsQueryDto) {
    return this.auditLogs.list(query);
  }

  @Get('meta')
  meta() {
    return this.auditLogs.meta();
  }

  @Get('export')
  export(@Query() query: ListAuditLogsQueryDto) {
    return this.auditLogs.export(query);
  }
}