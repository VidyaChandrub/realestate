import { Injectable } from '@nestjs/common';
import {
  FeedEventCandidate,
  FeedJobCandidate,
  FeedUserProfile,
  RankedFeedCandidate,
} from '../interfaces/feed-candidate.interface';
import { EventMatcher } from './event.matcher';
import { JobMatcher } from './job.matcher';

@Injectable()
export class MatchScoreService {
  constructor(
    private readonly jobMatcher: JobMatcher,
    private readonly eventMatcher: EventMatcher,
  ) {}

  rankJobs(
    jobs: FeedJobCandidate[],
    profile: FeedUserProfile,
    engagementMap: Record<string, number>,
  ): RankedFeedCandidate[] {
    return jobs.map((job) => ({
      type: 'JOB',
      id: job.id,
      createdAt: job.createdAt,
      matchScore: this.jobMatcher.score(job, profile),
      engagementScore: engagementMap[job.id] ?? 0,
      payload: job,
    }));
  }

  rankEvents(
    events: FeedEventCandidate[],
    profile: FeedUserProfile,
    engagementMap: Record<string, number>,
  ): RankedFeedCandidate[] {
    return events.map((event) => {
      const engagement = engagementMap[event.id] ?? 0;
      return {
        type: 'EVENT' as const,
        id: event.id,
        createdAt: event.createdAt,
        matchScore: this.eventMatcher.score(event, profile, engagement),
        engagementScore: engagement,
        payload: event,
      };
    });
  }
}
