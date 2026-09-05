import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { OrgApprovedGuard } from '../../common/guards/org-approved.guard';
import { PermissionGuard } from '../../common/guards/permission.guard';
import { OrgTemplatesController } from './org-templates.controller';
import { OrgTemplatesService } from './org-templates.service';

@Module({
  imports: [AuthModule],
  controllers: [OrgTemplatesController],
  providers: [OrgTemplatesService, OrgApprovedGuard, PermissionGuard],
})
export class OrgTemplatesModule {}
