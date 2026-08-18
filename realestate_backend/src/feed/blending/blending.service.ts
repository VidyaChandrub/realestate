import { Injectable } from '@nestjs/common';
import { FeedAdCandidate, RankedFeedCandidate } from '../interfaces/feed-candidate.interface';

@Injectable()
export class BlendingService {
  blend(params: {
    rankedItems: RankedFeedCandidate[];
    ads: FeedAdCandidate[];
    adInterval: number;
    limit: number;
    adEngagementMap: Record<string, number>;
  }): RankedFeedCandidate[] {
    const { rankedItems, ads, adInterval, limit, adEngagementMap } = params;
    if (rankedItems.length === 0) {
      return [];
    }

    const result: RankedFeedCandidate[] = [];
    let organicIndex = 0;
    let adIndex = 0;
    const usedCampaigns = new Set<string>();

    while (result.length < limit && organicIndex < rankedItems.length) {
      if (
        adInterval > 0 &&
        result.length > 0 &&
        result.length % adInterval === 0 &&
        adIndex < ads.length
      ) {
        const ad = ads[adIndex];
        adIndex += 1;

        if (usedCampaigns.has(ad.id)) {
          continue;
        }

        usedCampaigns.add(ad.id);
        result.push({
          type: 'AD',
          id: ad.id,
          createdAt: ad.createdAt,
          matchScore: 0,
          engagementScore: adEngagementMap[ad.id] ?? 0,
          payload: ad,
        });

        continue;
      }

      result.push(rankedItems[organicIndex]);
      organicIndex += 1;
    }

    return result;
  }
}
