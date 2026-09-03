import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { LeadsController } from './leads.controller';
import { LeadsService } from './leads.service';
import { OrgAdminGuard } from '../../common/guards/org-admin.guard';
import { OrgApprovedGuard } from '../../common/guards/org-approved.guard';
import { PermissionGuard } from '../../common/guards/permission.guard';

@Module({
  imports: [AuthModule],
  controllers: [LeadsController],
  providers: [LeadsService, OrgAdminGuard, OrgApprovedGuard, PermissionGuard],
})
export class LeadsModule {}
