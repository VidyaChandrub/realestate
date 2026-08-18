import { Module } from '@nestjs/common';
import { EmployersModule } from '../employers/employers.module';
import { AnalyticsDbService } from './prisma.service';
import { AnalyticsRepository } from './repositories/analytics.repository';
import { AnalyticsPartitionService } from './services/analytics-partition.service';
import { AnalyticsService } from './services/analytics.service';

@Module({
  imports: [EmployersModule],
  providers: [AnalyticsDbService, AnalyticsRepository, AnalyticsPartitionService, AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
