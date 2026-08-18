import { AnalyticsPartitionService } from '../services/analytics-partition.service';

describe('AnalyticsPartitionService', () => {
  const mockPrisma = {
    $executeRawUnsafe: jest.fn(),
    $queryRaw: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  let service: AnalyticsPartitionService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockConfigService.get.mockReturnValue('12');
    service = new AnalyticsPartitionService(mockPrisma as any, mockConfigService as any);
  });

  it('should create current and next month partitions', async () => {
    const now = new Date('2026-02-23T12:00:00.000Z');

    await service.ensureCurrentAndNextPartitions(now);

    expect(mockPrisma.$executeRawUnsafe).toHaveBeenCalledTimes(2);
    expect(mockPrisma.$executeRawUnsafe.mock.calls[0][0]).toContain('analytics_events_2026_02');
    expect(mockPrisma.$executeRawUnsafe.mock.calls[1][0]).toContain('analytics_events_2026_03');
  });

  it('should drop partitions older than retention window', async () => {
    mockPrisma.$queryRaw.mockResolvedValue([
      { tablename: 'analytics_events_2024_12' },
      { tablename: 'analytics_events_2025_02' },
      { tablename: 'analytics_events_2026_02' },
    ]);

    await service.dropExpiredPartitions(new Date('2026-02-10T00:00:00.000Z'));

    expect(mockPrisma.$executeRawUnsafe).toHaveBeenCalledWith(
      'DROP TABLE IF EXISTS analytics.analytics_events_2024_12',
    );
    expect(mockPrisma.$executeRawUnsafe).toHaveBeenCalledWith(
      'DROP TABLE IF EXISTS analytics.analytics_events_2025_02',
    );
    expect(mockPrisma.$executeRawUnsafe).not.toHaveBeenCalledWith(
      'DROP TABLE IF EXISTS analytics.analytics_events_2026_02',
    );
  });
});
