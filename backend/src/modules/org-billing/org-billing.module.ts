import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { OrgAdminGuard } from '../../common/guards/org-admin.guard';
import { OrgBillingController } from './org-billing.controller';
import { OrgBillingService } from './org-billing.service';

@Module({
  imports: [AuthModule],
  controllers: [OrgBillingController],
  providers: [OrgBillingService, OrgAdminGuard],
})
export class OrgBillingModule {}
