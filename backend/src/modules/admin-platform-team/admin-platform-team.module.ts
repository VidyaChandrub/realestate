import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SuperAdminGuard } from '../../common/guards/super-admin.guard';
import { AdminPlatformTeamController } from './admin-platform-team.controller';
import { AdminPlatformTeamService } from './admin-platform-team.service';

@Module({
  imports: [AuthModule],
  controllers: [AdminPlatformTeamController],
  providers: [AdminPlatformTeamService, SuperAdminGuard],
})
export class AdminPlatformTeamModule {}
