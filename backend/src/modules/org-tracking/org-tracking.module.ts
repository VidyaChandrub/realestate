import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { OrgTrackingService } from './org-tracking.service';
import { OrgTrackingController } from './org-tracking.controller';

@Module({
  imports: [AuthModule],
  controllers: [OrgTrackingController],
  providers: [OrgTrackingService],
})
export class OrgTrackingModule {}
