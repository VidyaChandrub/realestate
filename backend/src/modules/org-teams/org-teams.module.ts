import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { OrgAdminGuard } from '../../common/guards/org-admin.guard';
import { OrgApprovedGuard } from '../../common/guards/org-approved.guard';
import { OrgTeamsController } from './org-teams.controller';
import { OrgTeamsService } from './org-teams.service';

@Module({
  imports: [AuthModule],
  controllers: [OrgTeamsController],
  providers: [OrgTeamsService, OrgAdminGuard, OrgApprovedGuard],
})
export class OrgTeamsModule {}
