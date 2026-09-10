import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SuperAdminGuard } from '../../common/guards/super-admin.guard';
import { AdminLeadsController } from './admin-leads.controller';
import { AdminLeadsService } from './admin-leads.service';

@Module({
  imports: [AuthModule],
  controllers: [AdminLeadsController],
  providers: [AdminLeadsService, SuperAdminGuard],
})
export class AdminLeadsModule {}
