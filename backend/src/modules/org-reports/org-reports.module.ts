import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { OrgReportsController } from './org-reports.controller';
import { AdminReportsController } from './admin-reports.controller';
import { OrgReportsService } from './org-reports.service';

@Module({
  imports: [AuthModule],
  controllers: [OrgReportsController, AdminReportsController],
  providers: [OrgReportsService],
  exports: [OrgReportsService],
})
export class OrgReportsModule {}
