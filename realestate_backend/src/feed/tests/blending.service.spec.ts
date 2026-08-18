import { BlendingService } from '../blending/blending.service';

describe('BlendingService', () => {
  it('injects ads every N items without duplicate campaign in page', () => {
    const service = new BlendingService();
    const rankedItems = Array.from({ length: 8 }).map((_, i) => ({
      type: 'JOB' as const,
      id: `job-${i}`,
      createdAt: new Date(Date.now() - (i * 1000)),
      matchScore: 90 - i,
      engagementScore: 10,
      payload: { id: `job-${i}` } as any,
    }));

    const ads = [
      {
        id: 'campaign-1',
        organizationId: 'org-1',
        name: 'ad-1',
        type: 'IMAGE',
        entityType: null,
        entityId: null,
        pricingModel: 'CPC',
        status: 'ACTIVE',
        budgetTotal: { toString: () => '100' } as any,
        budgetSpent: { toString: () => '10' } as any,
        costPerClick: null,
        costPerThousandImpressions: null,
        flatFee: null,
        dailyLimit: null,
        startDate: null,
        endDate: null,
        boostScore: 0,
        isArchived: false,
        rejectionReason: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        creatives: [],
        targetingRule: null,
      },
      {
        id: 'campaign-1',
        organizationId: 'org-1',
        name: 'ad-dup',
        type: 'IMAGE',
        entityType: null,
        entityId: null,
        pricingModel: 'CPC',
        status: 'ACTIVE',
        budgetTotal: { toString: () => '100' } as any,
        budgetSpent: { toString: () => '10' } as any,
        costPerClick: null,
        costPerThousandImpressions: null,
        flatFee: null,
        dailyLimit: null,
        startDate: null,
        endDate: null,
        boostScore: 0,
        isArchived: false,
        rejectionReason: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        creatives: [],
        targetingRule: null,
      },
    ] as any;

    const blended = service.blend({
      rankedItems,
      ads,
      adInterval: 3,
      limit: 8,
      adEngagementMap: { 'campaign-1': 20 },
    });

    const adItems = blended.filter((item) => item.type === 'AD');
    expect(adItems.length).toBe(1);
    expect(new Set(adItems.map((item) => item.id)).size).toBe(1);
    expect(blended.length).toBeLessThanOrEqual(8);
  });
});
