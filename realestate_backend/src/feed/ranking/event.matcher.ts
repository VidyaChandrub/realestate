import { Injectable } from '@nestjs/common';
import { FeedEventCandidate, FeedUserProfile } from '../interfaces/feed-candidate.interface';

// Location eligibility is enforced as a hard SQL filter upstream in
// EventsService.getRelevantEvents (mode=ONLINE or no location bypasses; otherwise
// must match the user's city/state/country/preferred locations) — every event that
// reaches this matcher already passed that check, so it's not scored here again.
//
// Note: `similarityScore` (tag-embedding cosine similarity, computed in the same
// SQL query) is NOT currently factored into this score either — tagOverlap below is
// still exact-ID-only, unlike JobMatcher which now leans on embedding similarity for
// skill fit. Flagged as a possible follow-up, not addressed in this change.
@Injectable()
export class EventMatcher {
  score(event: FeedEventCandidate, profile: FeedUserProfile, eventEngagement: number): number {
    const category = this.booleanScore(Boolean(event.categoryId && profile.preferredCategoryIds.includes(event.categoryId)));
    const tagOverlap = this.tagScore(event.tagIds, profile.preferredInterestIds);
    const startDateProximity = this.startDateScore(event.startDate);
    const engagement = this.engagementScore(eventEngagement);
    const boost = this.boostScore(event.boostScore);

    const weighted =
      (category * 0.2) +
      (tagOverlap * 0.55) +
      (startDateProximity * 0.1) +
      (engagement * 0.05) +
      (boost * 0.1);

    return Number(weighted.toFixed(2));
  }

  private tagScore(eventTagIds: string[], preferredInterestIds: string[]): number {
    if (eventTagIds.length === 0 || preferredInterestIds.length === 0) {
      return 0;
    }

    const tagSet = new Set(eventTagIds);
    let overlap = 0;
    for (const id of preferredInterestIds) {
      if (tagSet.has(id)) {
        overlap += 1;
      }
    }

    return Math.round((overlap / eventTagIds.length) * 100);
  }

  private startDateScore(startDate: Date | null): number {
    if (!startDate) {
      return 40;
    }

    const diffDays = Math.floor((startDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return 0;
    if (diffDays <= 3) return 100;
    if (diffDays <= 7) return 80;
    if (diffDays <= 14) return 60;
    if (diffDays <= 30) return 40;
    return 20;
  }

  private engagementScore(value: number): number {
    if (value <= 0) {
      return 0;
    }

    return Math.min(100, Math.round((value / 500) * 100));
  }

  private boostScore(boost: number): number {
    return Math.min(100, Math.max(0, boost * 10));
  }

  private booleanScore(match: boolean): number {
    return match ? 100 : 0;
  }
}
