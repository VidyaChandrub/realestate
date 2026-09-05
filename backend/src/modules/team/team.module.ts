import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { OrgApprovedGuard } from '../../common/guards/org-approved.guard';
import { PermissionGuard } from '../../common/guards/permission.guard';
import { TeamService } from './team.service';
import { TeamController } from './team.controller';

@Module({
  imports: [AuthModule],
  controllers: [TeamController],
  providers: [TeamService, OrgApprovedGuard, PermissionGuard],
  // Reused directly by OnboardingModule's Invite-team step — same
  // provisioning logic, no need to duplicate it.
  exports: [TeamService],
})
export class TeamModule {}
