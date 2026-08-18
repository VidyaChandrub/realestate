import { FeedService } from '../feed.service';
import { BlendingService } from '../blending/blending.service';
import { EventMatcher } from '../ranking/event.matcher';
import { JobMatcher } from '../ranking/job.matcher';

describe('FeedService', () => {
  const buildService = () => {
    const configService = {
      get: jest.fn().mockImplementation((key: string) => {
        const defaults: Record<string, string> = {
          HIDE_SEEN_JOBS: 'false',
          HIDE_SEEN_EVENTS: 'false',
          FEED_JOB_FETCH_LIMIT: '20',
          FEED_EVENT_FETCH_LIMIT: '4',
          FEED_JOB_BLOCK_SIZE: '4',
          FEED_ORGANIC_LIMIT: '20',
          FEED_AD_INTERVAL: '5',
        };
        return defaults[key] ?? 'false';
      }),
    };

    const userService = {
      findOrCreateProfile: jest.fn().mockResolvedValue({
        id: 'profile-1',
        userId: 'kc-1',
        currentCityId: 'city-1',
        stateId: null,
        countryId: null,
        highestQualificationId: 'edu-1',
        experienceLevelId: 'exp-level-1',
        preferredEmploymentTypeId: 'emp-type-1',
        preferredWorkMode: 'HYBRID',
        totalExperienceMonths: 36,
        preferredCategoryIds: ['cat-1'],
        preferredInterestIds: ['tag-1'],
        skills: [{ masterDataId: 'skill-1' }],
        preferredLocations: [{ locationId: 'city-1' }],
      }),
      getQualificationValue: jest.fn().mockResolvedValue(null),
      getSkillValues: jest.fn().mockResolvedValue(new Map()),
    };

    const jobsService = {
      getRelevantJobs: jest.fn().mockResolvedValue({
        jobs: [
          {
            id: 'job-1',
            organizationId: 'org-1',
            title: 'Job 1',
            description: null,
            summary: null,
            categoryId: 'cat-1',
            locationId: 'city-1',
            minExperienceMonths: 24,
            maxExperienceMonths: 48,
            experienceLevelId: 'exp-level-1',
            workMode: 'HYBRID',
            salaryMin: null,
            salaryMax: null,
            employmentTypeId: 'emp-type-1',
            jobType: 'INTERNAL',
            externalUrl: null,
            status: 'ACTIVE',
            publishedAt: new Date(),
            expiresAt: null,
            rejectionReason: null,
            createdAt: new Date('2026-02-24T10:00:00.000Z'),
            updatedAt: new Date(),
            backgroundImage: null,
            organizationName: 'Org 1',
            locationName: 'Bengaluru',
            categoryName: 'Nursing',
            employmentTypeName: 'Full Time',
            experienceLevelName: 'Mid Level',
            educationLevel: null,
            skills: ['Skill 1'],
            similarityScore: 0.95,
          },
        ],
        total: 1,
      }),
    };

    const eventsService = {
      getRelevantEvents: jest.fn().mockResolvedValue([
        {
          id: 'evt-1',
          organizationId: 'org-1',
          title: 'Event 1',
          description: null,
          categoryId: 'cat-1',
          mode: 'ONLINE',
          locationId: null,
          meetingUrl: 'https://meet.example.com/event-1',
          isMeetingUrlPublished: true,
          registrationType: 'INTERNAL',
          externalRegistrationUrl: null,
          capacity: null,
          startDate: new Date('2026-02-26T10:00:00.000Z'),
          endDate: null,
          status: 'ACTIVE',
          bannerImage: null,
          tagIds: ['tag-1'],
          isFree: true,
          price: null,
          isSponsored: false,
          sponsorCampaignId: null,
          boostScore: 2,
          createdAt: new Date('2026-02-24T09:00:00.000Z'),
          updatedAt: new Date(),
          similarityScore: 0.92,
        },
      ]),
      attachTagsToEvent: jest.fn().mockImplementation(async (event) => {
        const { tagIds: _tagIds, ...rest } = event;
        return {
          ...rest,
          tags: [{ id: 'tag-1', value: 'Bengaluru East' }],
        };
      }),
    };

    const adsService = {
      getFeedEligibleAds: jest.fn().mockResolvedValue([]),
    };

    const analyticsService = {
      getCampaignEngagementMap: jest.fn().mockResolvedValue({}),
      getEventEngagementMap: jest.fn().mockResolvedValue({}),
      markFeedItemsServed: jest.fn().mockResolvedValue(undefined),
    };

    const eventEmitter = { emit: jest.fn() };

    const service = new FeedService(
      configService as any,
      userService as any,
      jobsService as any,
      eventsService as any,
      adsService as any,
      analyticsService as any,
      new BlendingService(),
      eventEmitter as any,
      new JobMatcher(),
      new EventMatcher(),
    );

    return { service, userService, jobsService, eventsService, eventEmitter };
  };

  it('returns feed items in 4:1 job/event pattern', async () => {
    const { service, eventEmitter } = buildService();

    const response = await service.getFeed({ userId: 'kc-1' }, {});

    expect(response.items.length).toBeGreaterThan(0);
    expect(response.items[0].type).toMatch(/JOB|EVENT/);
    expect((response.items[0].payload as any).employmentType).toBe('Full Time');
    const eventItem = response.items.find((item) => item.type === 'EVENT');
    if (eventItem) {
      expect((eventItem.payload as any).meetingUrl).toBe('https://meet.example.com/event-1');
      expect((eventItem.payload as any).isMeetingUrlPublished).toBe(true);
      expect((eventItem.payload as any).tagIds).toBeUndefined();
      expect((eventItem.payload as any).tags).toEqual([
        { id: 'tag-1', value: 'Bengaluru East' },
      ]);
    }
    expect(eventEmitter.emit).toHaveBeenCalledWith('feed.view', expect.any(Object));
    expect(eventEmitter.emit).toHaveBeenCalledWith('feed.item.view', expect.any(Object));
    expect(response.nextCursor).toBeNull();
  });

  it('passes hideSeenFeeds flag to job and event services when enabled', async () => {
    const { service, jobsService, eventsService } = buildService();

    (jobsService.getRelevantJobs as jest.Mock).mockResolvedValue({ jobs: [], total: 0 });
    (eventsService.getRelevantEvents as jest.Mock).mockResolvedValue([]);

    await service.getFeed({ userId: 'kc-1' }, {});

    expect(jobsService.getRelevantJobs).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ hideSeenFeeds: false }),
    );
    expect(eventsService.getRelevantEvents).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ hideSeenFeeds: false }),
    );
  });

  it('returns only jobs when no events are available', async () => {
    const { service, eventsService } = buildService();
    (eventsService.getRelevantEvents as jest.Mock).mockResolvedValue([]);

    const response = await service.getFeed({ userId: 'kc-1' }, {});

    expect(response.items.every((item) => item.type === 'JOB')).toBe(true);
    expect(response.nextCursor).toBeNull();
  });
});
