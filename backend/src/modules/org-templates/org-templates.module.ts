import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { OrgAdminGuard } from '../../common/guards/org-admin.guard';
import { OrgApprovedGuard } from '../../common/guards/org-approved.guard';
import { OrgTemplatesController } from './org-templates.controller';
import { OrgTemplatesService } from './org-templates.service';

@Module({
  imports: [AuthModule],
  controllers: [OrgTemplatesController],
  providers: [OrgTemplatesService, OrgAdminGuard, OrgApprovedGuard],
})
export class OrgTemplatesModule {}
