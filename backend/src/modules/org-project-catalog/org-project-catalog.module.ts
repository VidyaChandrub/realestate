import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { OrgAdminGuard } from '../../common/guards/org-admin.guard';
import { OrgApprovedGuard } from '../../common/guards/org-approved.guard';
import { PermissionGuard } from '../../common/guards/permission.guard';
import { OrgProjectCatalogController } from './org-project-catalog.controller';
import { OrgProjectCatalogService } from './org-project-catalog.service';

@Module({
  imports: [AuthModule],
  controllers: [OrgProjectCatalogController],
  providers: [OrgProjectCatalogService, OrgAdminGuard, OrgApprovedGuard, PermissionGuard],
})
export class OrgProjectCatalogModule {}
