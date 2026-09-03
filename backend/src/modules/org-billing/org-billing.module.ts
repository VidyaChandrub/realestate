import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { OrgAdminGuard } from '../../common/guards/org-admin.guard';
import { OrgApprovedGuard } from '../../common/guards/org-approved.guard';
import { PermissionGuard } from '../../common/guards/permission.guard';
import { OrgBillingController } from './org-billing.controller';
import { OrgBillingService } from './org-billing.service';

@Module({
  imports: [AuthModule],
  controllers: [OrgBillingController],
  providers: [OrgBillingService, OrgAdminGuard, OrgApprovedGuard, PermissionGuard],
})
export class OrgBillingModule {}
