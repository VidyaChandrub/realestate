import { Module } from '@nestjs/common';
import { AdsModule } from '../ads/ads.module';
import { AnalyticsModule } from '../analytics/analytics.module';
import { EventsModule } from '../events/events.module';
import { JobsModule } from '../jobs/jobs.module';
import { UserModule } from '../user/user.module';
import { BlendingService } from './blending/blending.service';
import { FeedService } from './feed.service';
import { EventMatcher } from './ranking/event.matcher';
import { JobMatcher } from './ranking/job.matcher';

@Module({
  imports: [UserModule, JobsModule, EventsModule, AdsModule, AnalyticsModule],
  providers: [FeedService, BlendingService, JobMatcher, EventMatcher],
  exports: [FeedService],
})
export class FeedModule {}
