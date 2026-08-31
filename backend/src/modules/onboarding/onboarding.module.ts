import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { TeamModule } from '../team/team.module';
import { OrgAdminGuard } from '../../common/guards/org-admin.guard';
import { OnboardingController } from './onboarding.controller';
import { OnboardingService } from './onboarding.service';

@Module({
  imports: [AuthModule, TeamModule],
  controllers: [OnboardingController],
  providers: [OnboardingService, OrgAdminGuard],
})
export class OnboardingModule {}
