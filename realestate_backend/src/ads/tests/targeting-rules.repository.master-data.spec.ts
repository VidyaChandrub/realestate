import { TargetingRulesRepository } from '../repositories/targeting-rules.repository';

describe('TargetingRulesRepository master data references', () => {
  it('counts active campaigns by UUID array containment', async () => {
    const db = {
      campaign: { count: jest.fn().mockResolvedValue(4) },
      targetingRule: { upsert: jest.fn(), findUnique: jest.fn() },
    } as any;

    const repo = new TargetingRulesRepository(db);
    const total = await repo.countActiveCampaignsByMasterDataId('cccccccc-cccc-cccc-cccc-cccccccccccc');

    expect(total).toBe(4);
    expect(db.campaign.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          targetingRule: expect.objectContaining({
            OR: expect.arrayContaining([
              { countryIds: { has: 'cccccccc-cccc-cccc-cccc-cccccccccccc' } },
              { stateIds: { has: 'cccccccc-cccc-cccc-cccc-cccccccccccc' } },
              { cityIds: { has: 'cccccccc-cccc-cccc-cccc-cccccccccccc' } },
              { interestIds: { has: 'cccccccc-cccc-cccc-cccc-cccccccccccc' } },
            ]),
          }),
        }),
      }),
    );
  });
});
