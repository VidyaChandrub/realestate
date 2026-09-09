import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { OrgAdminGuard } from '../../common/guards/org-admin.guard';
import { OrgApprovedGuard } from '../../common/guards/org-approved.guard';
import { OrgLeadStageDisplayController } from './org-lead-stage-display.controller';
import { OrgLeadStageDisplayService } from './org-lead-stage-display.service';

@Module({
  imports: [AuthModule],
  controllers: [OrgLeadStageDisplayController],
  providers: [OrgLeadStageDisplayService, OrgAdminGuard, OrgApprovedGuard],
})
export class OrgLeadStageDisplayModule {}
