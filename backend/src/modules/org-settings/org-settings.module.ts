import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { OrgAdminGuard } from '../../common/guards/org-admin.guard';
import { OrgSettingsController } from './org-settings.controller';
import { OrgSettingsService } from './org-settings.service';

@Module({
  imports: [AuthModule],
  controllers: [OrgSettingsController],
  providers: [OrgSettingsService, OrgAdminGuard],
})
export class OrgSettingsModule {}
