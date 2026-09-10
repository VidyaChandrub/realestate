import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SuperAdminGuard } from '../../common/guards/super-admin.guard';
import { AdminAuditLogsController } from './admin-audit-logs.controller';
import { AdminAuditLogsService } from './admin-audit-logs.service';

@Module({
  imports: [AuthModule],
  controllers: [AdminAuditLogsController],
  providers: [AdminAuditLogsService, SuperAdminGuard],
})
export class AdminAuditLogsModule {}