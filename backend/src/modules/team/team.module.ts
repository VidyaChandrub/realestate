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
})
export class TeamModule {}
