import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { OrgAdminGuard } from '../../common/guards/org-admin.guard';
import { OrgApprovedGuard } from '../../common/guards/org-approved.guard';
import { PermissionGuard } from '../../common/guards/permission.guard';
import { OrgUsersController } from './org-users.controller';
import { OrgUsersService } from './org-users.service';

@Module({
  imports: [AuthModule],
  controllers: [OrgUsersController],
  providers: [OrgUsersService, OrgAdminGuard, OrgApprovedGuard, PermissionGuard],
})
export class OrgUsersModule {}
