import { MasterDataReferenceService } from '../services/master-data-reference.service';

describe('MasterDataReferenceService', () => {
  it('aggregates counts from all domain modules using masterDataId', async () => {
    const jobsService = { countByMasterDataId: jest.fn().mockResolvedValue(2) };
    const eventsService = { countByMasterDataId: jest.fn().mockResolvedValue(3) };
    const adsService = { countByMasterDataId: jest.fn().mockResolvedValue(4) };
    const userService = { countByMasterDataId: jest.fn().mockResolvedValue(1) };

    const service = new MasterDataReferenceService(
      jobsService as any,
      eventsService as any,
      adsService as any,
      userService as any,
    );

    const total = await service.countActiveReferences('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');

    expect(total).toBe(10);
    expect(jobsService.countByMasterDataId).toHaveBeenCalledWith('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
    expect(eventsService.countByMasterDataId).toHaveBeenCalledWith('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
    expect(adsService.countByMasterDataId).toHaveBeenCalledWith('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
    expect(userService.countByMasterDataId).toHaveBeenCalledWith('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
  });
});
