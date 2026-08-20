import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SuperAdminGuard } from '../../common/guards/super-admin.guard';
import { LeadsService } from './leads.service';
import { LeadsController } from './leads.controller';

@Module({
  imports: [AuthModule],
  controllers: [LeadsController],
  providers: [LeadsService, SuperAdminGuard],
})
export class LeadsModule {}
