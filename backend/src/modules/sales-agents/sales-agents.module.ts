import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SalesAgentsController } from './sales-agents.controller';
import { SalesAgentsService } from './sales-agents.service';
import { OrgAdminGuard } from '../../common/guards/org-admin.guard';
import { OrgApprovedGuard } from '../../common/guards/org-approved.guard';
import { PermissionGuard } from '../../common/guards/permission.guard';

@Module({
  imports: [AuthModule],
  controllers: [SalesAgentsController],
  providers: [SalesAgentsService, OrgAdminGuard, OrgApprovedGuard, PermissionGuard],
  exports: [SalesAgentsService],
})
export class SalesAgentsModule {}
