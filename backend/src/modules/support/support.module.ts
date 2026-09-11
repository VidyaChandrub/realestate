import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { OrgApprovedGuard } from '../../common/guards/org-approved.guard';
import { PermissionGuard } from '../../common/guards/permission.guard';
import { SupportController } from './support.controller';
import { AdminSupportController } from './admin-support.controller';
import { SupportService } from './support.service';

// One service, two controllers: org/support (the org's own tickets, gated by
// the `support` org permission) and admin/support (Support Management —
// every org's tickets, gated by the `admin_support` platform permission via
// SuperAdminGuard). JwtAuthGuard + SuperAdminGuard come from AuthModule's
// exports, same as every other admin/* module.
@Module({
  imports: [AuthModule],
  controllers: [SupportController, AdminSupportController],
  providers: [SupportService, OrgApprovedGuard, PermissionGuard],
})
export class SupportModule {}
