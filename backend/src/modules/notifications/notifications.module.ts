import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { OrgApprovedGuard } from '../../common/guards/org-approved.guard';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { OrgNotificationsController } from './org-notifications.controller';

@Module({
  imports: [AuthModule],
  controllers: [NotificationsController, OrgNotificationsController],
  providers: [NotificationsService, OrgApprovedGuard],
})
export class NotificationsModule {}
