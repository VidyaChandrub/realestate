import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { OrgApprovedGuard } from '../../common/guards/org-approved.guard';
import { PermissionGuard } from '../../common/guards/permission.guard';
import { OrgProjectTypesController } from './org-project-types.controller';
import { OrgProjectTypesService } from './org-project-types.service';

@Module({
  imports: [AuthModule],
  controllers: [OrgProjectTypesController],
  providers: [OrgProjectTypesService, OrgApprovedGuard, PermissionGuard],
})
export class OrgProjectTypesModule {}
