import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AttributionLabelsService } from './attribution-labels.service';
import { AdminAttributionLabelsController } from './admin-attribution-labels.controller';
import { OrgAttributionLabelsController } from './org-attribution-labels.controller';
import { OrgApprovedGuard } from '../../common/guards/org-approved.guard';

@Module({
  imports: [AuthModule],
  controllers: [
    AdminAttributionLabelsController,
    OrgAttributionLabelsController,
  ],
  providers: [AttributionLabelsService, OrgApprovedGuard],
  exports: [AttributionLabelsService],
})
export class AttributionLabelsModule {}
