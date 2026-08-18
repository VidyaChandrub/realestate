import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsEntityType, AnalyticsEventType } from '../analytics.constants';
import { AnalyticsRepository } from '../repositories/analytics.repository';
import { AnalyticsPartitionService } from '../services/analytics-partition.service';
import { AnalyticsService } from '../services/analytics.service';
import { EmployerUsersService } from '../../employers/services/employer-users.service';

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  const mockAnalyticsRepository = {
    ingestDomainEvent: jest.fn(),
    getCampaignOrganizationId: jest.fn(),
    getJobOrganizationId: jest.fn(),
    getEventOrganizationId: jest.fn(),
    getCampaignMetrics: jest.fn(),
    getJobMetrics: jest.fn(),
    getEventMetrics: jest.fn(),
    listCampaignEvents: jest.fn(),
    listJobEvents: jest.fn(),
    listEventEvents: jest.fn(),
    getEmployerOverview: jest.fn(),
    getPlatformSummary: jest.fn(),
  };

  const mockEmployerUsersService = {
    getUserRole: jest.fn(),
  };

  const mockPartitionService = {
    maintainPartitions: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        { provide: AnalyticsRepository, useValue: mockAnalyticsRepository },
        { provide: EmployerUsersService, useValue: mockEmployerUsersService },
        { provide: AnalyticsPartitionService, useValue: mockPartitionService },
      ],
    }).compile();

    service = module.get<AnalyticsService>(AnalyticsService);
  });

  it('should ingest ad.click and update campaign/user aggregates', async () => {
    mockAnalyticsRepository.ingestDomainEvent.mockResolvedValue(true);

    await service.handleAdClick({
      campaignId: 'campaign-1',
      userId: 'user-1',
      spend: 12.5,
      idempotencyKey: 'click-1',
    });

    expect(mockAnalyticsRepository.ingestDomainEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: AnalyticsEventType.AD_CLICK,
        entityType: AnalyticsEntityType.AD,
        entityId: 'campaign-1',
        ingestionKey: `${AnalyticsEventType.AD_CLICK}:campaign-1:click-1`,
      }),
    );

    const calledWith = mockAnalyticsRepository.ingestDomainEvent.mock.calls[0][0];
    expect(calledWith.aggregateMutations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: 'campaign', counter: 'clicks', delta: 1, spendDelta: 12.5 }),
        expect.objectContaining({ kind: 'user', userId: 'user-1', clicksDelta: 1 }),
      ]),
    );
  });

  it('should ingest application.submitted and increment job applications', async () => {
    mockAnalyticsRepository.ingestDomainEvent.mockResolvedValue(true);

    await service.handleApplicationSubmitted({
      applicationId: 'application-1',
      jobId: 'job-1',
      organizationId: 'org-1',
      userId: 'user-1',
    });

    const calledWith = mockAnalyticsRepository.ingestDomainEvent.mock.calls[0][0];
    expect(calledWith.eventType).toBe(AnalyticsEventType.APPLICATION_SUBMITTED);
    expect(calledWith.aggregateMutations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: 'job', jobId: 'job-1', counter: 'applications', delta: 1 }),
      ]),
    );
  });

  it('should not throw when repository ingestion fails', async () => {
    mockAnalyticsRepository.ingestDomainEvent.mockRejectedValue(new Error('db down'));

    await expect(
      service.handleAdImpression({
        campaignId: 'campaign-1',
      }),
    ).resolves.toBeUndefined();
  });
});
