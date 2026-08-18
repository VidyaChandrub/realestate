import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AdsService } from '../ads/services/ads.service';
import { AnalyticsService } from '../analytics/services/analytics.service';
import { EventsService } from '../events/services/events.service';
import { JobsService } from '../jobs/services/jobs.service';
import { UserService } from '../user/user.service';
import {
  FeedResponseDto,
  FeedItemType,
  FeedItemDto,
} from './dto/feed-item.dto';
import { GetFeedQueryDto } from './dto/get-feed-query.dto';
import { FeedImpressionItemDto } from './dto/mark-feed-impressions.dto';
import { BlendingService } from './blending/blending.service';
import {
  FeedUserProfile,
  FeedJobCandidate,
  FeedEventCandidate,
  RankedFeedCandidate,
} from './interfaces/feed-candidate.interface';
import { EventMatcher } from './ranking/event.matcher';
import { JobMatcher } from './ranking/job.matcher';


type FeedCursor = {
  jobOffset: number;
  eventOffset: number;
};

function encodeCursor(cursor: FeedCursor): string {
  return Buffer.from(JSON.stringify(cursor)).toString('base64url');
}

function decodeCursor(cursor: string): FeedCursor {
  try {
    const parsed = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));
    return {
      jobOffset: Number(parsed.jobOffset) || 0,
      eventOffset: Number(parsed.eventOffset) || 0,
    };
  } catch {
    return { jobOffset: 0, eventOffset: 0 };
  }
}

@Injectable()
export class FeedService {
  private readonly logger = new Logger(FeedService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly userService: UserService,
    private readonly jobsService: JobsService,
    private readonly eventsService: EventsService,
    private readonly adsService: AdsService,
    private readonly analyticsService: AnalyticsService,
    private readonly blendingService: BlendingService,
    private readonly eventEmitter: EventEmitter2,
    private readonly jobMatcher: JobMatcher,
    private readonly eventMatcher: EventMatcher,
  ) {}

  async getFeed(
    keycloakUser: Record<string, unknown>,
    query: GetFeedQueryDto,
  ): Promise<FeedResponseDto> {
    // Separate toggles so seen-feed exclusion can be disabled for one type without
    // affecting the other (e.g. while events are still thin in a given market).
    const hideSeenJobs = this.configService.get<string>('HIDE_SEEN_JOBS') === 'true';
    const hideSeenEvents = this.configService.get<string>('HIDE_SEEN_EVENTS') === 'true';
    // Minimum matchScore (0-100, a rescaled embedding similarity) a job must have to
    // be shown at all (0 = disabled). Applied per-job to the already-fetched window,
    // never inferred from page position.
    const minMatchScore = parseInt(this.configService.get<string>('MIN_MATCH_SCORE') ?? '0', 10);
    const jobFetchLimit = parseInt(this.configService.get<string>('FEED_JOB_FETCH_LIMIT') ?? '20', 10);
    const eventFetchLimit = parseInt(this.configService.get<string>('FEED_EVENT_FETCH_LIMIT') ?? '4', 10);
    const jobBlockSize = parseInt(this.configService.get<string>('FEED_JOB_BLOCK_SIZE') ?? '4', 10);
    const organicFeedLimit = parseInt(this.configService.get<string>('FEED_ORGANIC_LIMIT') ?? '20', 10);
    const adInterval = parseInt(this.configService.get<string>('FEED_AD_INTERVAL') ?? '5', 10);

    const now = new Date();
    const profileRaw = await this.userService.findOrCreateProfile(keycloakUser);
    const highestQualificationValue = profileRaw.highestQualificationId
      ? await this.userService.getQualificationValue(profileRaw.highestQualificationId)
      : null;
    const profile = this.toFeedProfile(profileRaw, highestQualificationValue);

    const { jobOffset, eventOffset } = query.cursor
      ? decodeCursor(query.cursor)
      : { jobOffset: 0, eventOffset: 0 };

    let [jobResult, events] = await Promise.all([
      this.jobsService.getRelevantJobs(keycloakUser, {
        limit: jobFetchLimit,
        offset: jobOffset,
        hideSeenFeeds: hideSeenJobs,
      }),
      this.eventsService.getRelevantEvents(keycloakUser, {
        limit: eventFetchLimit,
        offset: eventOffset,
        hideSeenFeeds: hideSeenEvents,
      }),
    ]);

    // rawJobCount tracks the unfiltered fetch size (for hasMore/pagination — a page
    // shouldn't look "exhausted" just because this window's jobs mostly failed the
    // score filter; that's a quality signal, not a depletion signal).
    let rawJobCount = jobResult.jobs.length;
    let rankedJobs = this.rankAndFilterJobs(jobResult.jobs, profile, minMatchScore);

    if (hideSeenJobs || hideSeenEvents) {
      // Reset only when genuinely exhausted: rankedJobs/events here were already fetched
      // with hideSeenFeeds:true (per-type), so they're exactly "unseen AND eligible
      // (matchScore >= minMatchScore)" for this window. As long as that set is non-empty,
      // there is more for the user to page through, so seen-history must be preserved.
      // Resetting based on a ratio against the fetch limit (totalUsable / jobFetchLimit)
      // was wrong: for a profile where only a small fraction of any fetch window ever
      // clears minMatchScore, that ratio is permanently low regardless of how much
      // seen-history exists, which triggered a reset on every single request and made
      // pagination never progress past page 1. Exhaustion is a count-is-zero question,
      // not a percentage question.
      const totalUsable = rankedJobs.length + events.length;
      const shouldReset = totalUsable === 0;

      if (shouldReset) {
        this.logger.log(`[Feed] Resetting seen feeds for user ${profile.userId} (0 unseen eligible jobs/events remaining)`);
        // Only clear/refetch the type(s) actually being seen-filtered — if e.g.
        // hideSeenEvents is off, events were never excluded in the first place, so
        // there's nothing to reset and no need to refetch them again.
        await Promise.all([
          hideSeenJobs
            ? this.analyticsService.clearUserSeenFeeds(profile.userId, 'JOB').then(async () => {
                jobResult = await this.jobsService.getRelevantJobs(keycloakUser, {
                  limit: jobFetchLimit,
                  offset: 0,
                  hideSeenFeeds: false,
                });
              })
            : Promise.resolve(),
          hideSeenEvents
            ? this.analyticsService.clearUserSeenFeeds(profile.userId, 'EVENT').then(async () => {
                events = await this.eventsService.getRelevantEvents(keycloakUser, {
                  limit: eventFetchLimit,
                  offset: 0,
                  hideSeenFeeds: false,
                });
              })
            : Promise.resolve(),
        ]);
        rawJobCount = jobResult.jobs.length;
        rankedJobs = this.rankAndFilterJobs(jobResult.jobs, profile, minMatchScore);
      }
    }

    this.logger.debug(
      `[${profile.userId}] ranked ${rankedJobs.length}/${rawJobCount} jobs ` +
      `(minMatchScore=${minMatchScore}): ` +
      rankedJobs
        .map((j) => `"${(j.payload as any).title ?? j.id}" score=${j.matchScore}`)
        .join(' | '),
    );

    const eventEngagement = events.length > 0
      ? await this.analyticsService.getEventEngagementMap(events.map((e) => e.id))
      : {};

    const rankedEvents: RankedFeedCandidate[] = events.map((event) => {
      const engagement = eventEngagement[event.id] ?? 0;
      return {
        type: 'EVENT' as const,
        id: event.id,
        createdAt: event.createdAt,
        matchScore: this.eventMatcher.score(event as unknown as FeedEventCandidate, profile, engagement),
        engagementScore: engagement,
        payload: event as unknown as FeedEventCandidate,
      };
    });

    const { items: interleaved, jobsConsumed, eventsConsumed } =
      this.interleaveJobsAndEvents(rankedJobs, rankedEvents, organicFeedLimit, jobBlockSize);

    const adCandidates = await this.adsService.getFeedEligibleAds({
      profile,
      now,
      limit: Math.ceil(organicFeedLimit / adInterval) + 2,
    });
    const adEngagement = await this.analyticsService.getCampaignEngagementMap(
      adCandidates.map((ad) => ad.id),
    );

    const blendLimit = organicFeedLimit + Math.ceil(organicFeedLimit / adInterval);
    const blended = this.blendingService.blend({
      rankedItems: interleaved,
      ads: adCandidates,
      adInterval,
      limit: blendLimit,
      adEngagementMap: adEngagement,
    });

    const items = await Promise.all(
      blended.map((item) => this.toFeedItemDto(item)),
    );

    this.eventEmitter.emit('feed.view', {
      userId: profile.userId,
      count: items.length,
      generatedAt: now.toISOString(),
    });

    items.forEach((item, index) => {
      this.eventEmitter.emit('feed.item.view', {
        userId: profile.userId,
        itemId: item.id,
        itemType: item.type,
        position: index,
        matchScore: item.matchScore,
      });
    });

    const organicShown = blended
      .filter((item) => item.type !== 'AD')
      .map((item) => ({ entityId: item.id, entityType: item.type }));

    void this.analyticsService
      .markFeedItemsServed(profile.userId, organicShown)
      .catch((err) =>
        this.logger.warn(`markFeedItemsServed failed: ${String(err)}`),
      );

    const hasMore =
      rawJobCount >= jobFetchLimit || rankedEvents.length >= eventFetchLimit;
    const nextCursor =
      hasMore && items.length > 0
        ? encodeCursor({
            jobOffset: jobOffset + jobsConsumed,
            eventOffset: eventOffset + eventsConsumed,
          })
        : null;

    return { items, nextCursor };
  }

  // Records a genuine impression — the client confirmed these items actually crossed
  // a visibility threshold, as opposed to markFeedItemsServed which fires for every
  // item in a response regardless of whether the user ever saw it. This is what
  // hideSeenFeeds exclusion is keyed on.
  async markImpressions(userId: string, items: FeedImpressionItemDto[]): Promise<void> {
    await this.analyticsService.markFeedItemsViewed(
      userId,
      items.map((item) => ({ entityId: item.entityId, entityType: item.entityType })),
    );
  }

  private toFeedProfile(profileRaw: any, highestQualificationValue: string | null = null): FeedUserProfile {
    return {
      id: profileRaw.id,
      userId: profileRaw.userId,
      currentCityId: profileRaw.currentCityId,
      stateId: profileRaw.stateId,
      countryId: profileRaw.countryId,
      highestQualificationId: profileRaw.highestQualificationId,
      highestQualificationValue,
      experienceLevelId: profileRaw.experienceLevelId,
      preferredEmploymentTypeId: profileRaw.preferredEmploymentTypeId ?? [],
      preferredWorkMode: profileRaw.preferredWorkMode ?? [],
      totalExperienceMonths: profileRaw.totalExperienceMonths,
      preferredCategoryIds: profileRaw.preferredCategoryIds ?? [],
      preferredInterestIds: profileRaw.preferredInterestIds ?? [],
      skills: (profileRaw.skills ?? []).map((skill: any) => ({
        masterDataId: skill.masterDataId,
      })),
      preferredLocations: profileRaw.preferredLocations ?? [],
    };
  }

  // Scores every fetched job, sorts by matchScore descending, then drops anything
  // below minMatchScore (0 = keep everything, same "0 = off" convention used
  // elsewhere in this file). Jobs arrive from JobsService.getRelevantJobs ordered by
  // similarity DESC, but matchScore also factors in qualification (10% weight, see
  // JobMatcher) which isn't monotonic with similarity — so a re-sort is needed here,
  // unlike when matchScore was purely a rescale of similarity.
  private rankAndFilterJobs(
    jobs: any[],
    profile: FeedUserProfile,
    minMatchScore: number,
  ): RankedFeedCandidate[] {
    const mapped = jobs.map((job) => ({
      ...job,
      employmentType: (job as any).employmentTypeName ?? null,
    }));

    const ranked: RankedFeedCandidate[] = mapped
      .map((job) => ({
        type: 'JOB' as const,
        id: job.id,
        createdAt: job.createdAt,
        matchScore: this.jobMatcher.score(job as unknown as FeedJobCandidate, profile),
        engagementScore: 0,
        payload: job as unknown as FeedJobCandidate,
      }))
      .sort((a, b) => b.matchScore - a.matchScore);

    return minMatchScore > 0 ? ranked.filter((job) => job.matchScore >= minMatchScore) : ranked;
  }

  private interleaveJobsAndEvents(
    jobs: RankedFeedCandidate[],
    events: RankedFeedCandidate[],
    organicFeedLimit: number,
    jobBlockSize: number,
  ): { items: RankedFeedCandidate[]; jobsConsumed: number; eventsConsumed: number } {
    const result: RankedFeedCandidate[] = [];
    let j = 0;
    let e = 0;

    while (result.length < organicFeedLimit && (j < jobs.length || e < events.length)) {
      for (let i = 0; i < jobBlockSize && j < jobs.length && result.length < organicFeedLimit; i++) {
        result.push(jobs[j++]);
      }
      if (e < events.length && result.length < organicFeedLimit) {
        result.push(events[e++]);
      } else if (j < jobs.length && result.length < organicFeedLimit) {
        result.push(jobs[j++]);
      }
    }

    return { items: result, jobsConsumed: j, eventsConsumed: e };
  }

  private async toFeedItemDto(item: RankedFeedCandidate): Promise<FeedItemDto> {
    const payload =
      item.type === 'EVENT'
        ? await this.eventsService.attachTagsToEvent(item.payload as Record<string, unknown>)
        : (item.payload as Record<string, unknown>);

    return {
      type: item.type as FeedItemType,
      id: item.id,
      matchScore: item.type === 'AD' ? null : item.matchScore,
      createdAt: item.createdAt.toISOString(),
      payload: payload as Record<string, unknown>,
    };
  }
}
