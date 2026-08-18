import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import {
  ANALYTICS_RETENTION_MONTHS_ENV,
  DEFAULT_ANALYTICS_RETENTION_MONTHS,
} from '../analytics.constants';
import { AnalyticsDbService } from '../prisma.service';

@Injectable()
export class AnalyticsPartitionService {
  private readonly logger = new Logger(AnalyticsPartitionService.name);

  constructor(
    private readonly prisma: AnalyticsDbService,
    private readonly configService: ConfigService,
  ) {}

  @Cron('0 10 0 * * *')
  async maintainPartitions(): Promise<void> {
    await this.ensureCurrentAndNextPartitions();
    await this.dropExpiredPartitions();
  }

  async ensureCurrentAndNextPartitions(now = new Date()): Promise<void> {
    await this.createMonthlyPartition(this.startOfMonthUtc(now));
    await this.createMonthlyPartition(this.addMonths(this.startOfMonthUtc(now), 1));
  }

  async dropExpiredPartitions(now = new Date()): Promise<void> {
    const retentionMonths = Math.max(
      Number(this.configService.get<string>(ANALYTICS_RETENTION_MONTHS_ENV) ?? DEFAULT_ANALYTICS_RETENTION_MONTHS),
      1,
    );

    const cutoff = this.addMonths(this.startOfMonthUtc(now), -retentionMonths);

    const partitionRows = await this.prisma.$queryRaw<{ tablename: string }[]>`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'analytics'
        AND tablename ~ '^analytics_events_[0-9]{4}_[0-9]{2}$'
    `;

    for (const row of partitionRows) {
      const partitionStart = this.partitionStartFromName(row.tablename);
      if (!partitionStart) {
        continue;
      }

      if (partitionStart <= cutoff) {
        await this.prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS analytics.${row.tablename}`);
        this.logger.log(`Dropped expired analytics partition analytics.${row.tablename}`);
      }
    }
  }

  async createMonthlyPartition(monthStart: Date): Promise<void> {
    const from = this.startOfMonthUtc(monthStart);
    const to = this.addMonths(from, 1);
    const partitionName = this.partitionNameForDate(from);

    await this.prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS analytics.${partitionName}
      PARTITION OF analytics.analytics_events
      FOR VALUES FROM ('${from.toISOString()}') TO ('${to.toISOString()}')
    `);
  }

  private partitionNameForDate(date: Date): string {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    return `analytics_events_${year}_${month}`;
  }

  private partitionStartFromName(tableName: string): Date | null {
    const match = tableName.match(/^analytics_events_(\d{4})_(\d{2})$/);
    if (!match) {
      return null;
    }

    const year = Number(match[1]);
    const month = Number(match[2]) - 1;
    return new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
  }

  private startOfMonthUtc(date: Date): Date {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1, 0, 0, 0, 0));
  }

  private addMonths(date: Date, months: number): Date {
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth();
    return new Date(Date.UTC(year, month + months, 1, 0, 0, 0, 0));
  }
}
