import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { OrgDashboardController } from './org-dashboard.controller';
import { OrgDashboardService } from './org-dashboard.service';

@Module({
  imports: [AuthModule],
  controllers: [OrgDashboardController],
  providers: [OrgDashboardService],
  exports: [OrgDashboardService],
})
export class OrgDashboardModule {}
