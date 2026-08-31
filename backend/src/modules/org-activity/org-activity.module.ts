import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { OrgAdminGuard } from '../../common/guards/org-admin.guard';
import { OrgApprovedGuard } from '../../common/guards/org-approved.guard';
import { OrgActivityController } from './org-activity.controller';
import { OrgActivityService } from './org-activity.service';

@Module({
  imports: [AuthModule],
  controllers: [OrgActivityController],
  providers: [OrgActivityService, OrgAdminGuard, OrgApprovedGuard],
})
export class OrgActivityModule {}
