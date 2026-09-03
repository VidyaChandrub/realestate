import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { OrgAdminGuard } from '../../common/guards/org-admin.guard';
import { OrgApprovedGuard } from '../../common/guards/org-approved.guard';
import { PermissionGuard } from '../../common/guards/permission.guard';
import { OrgPermissionsController } from './org-permissions.controller';
import { OrgPermissionsService } from './org-permissions.service';

@Module({
  imports: [AuthModule],
  controllers: [OrgPermissionsController],
  providers: [OrgPermissionsService, OrgAdminGuard, OrgApprovedGuard, PermissionGuard],
  exports: [OrgPermissionsService],
})
export class OrgPermissionsModule {}
