import { Module } from '@nestjs/common';
import { AdminController } from '../api/admin.controller';
import { AdsModule } from '../ads/ads.module';
import { EventsModule } from '../events/events.module';
import { JobsModule } from '../jobs/jobs.module';
import { EmployersModule } from '../employers/employers.module';
import { AnalyticsModule } from '../analytics/analytics.module';
import { PrismaService } from '../user/prisma.service';
import { AdminService } from './services/admin.service';

@Module({
  imports: [
    AdsModule,
    EventsModule,
    JobsModule,
    EmployersModule,
    AnalyticsModule,
  ],
  controllers: [AdminController],
  providers: [AdminService, PrismaService],
})
export class AdminModule {}
