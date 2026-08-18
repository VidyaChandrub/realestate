import { JobsService } from '../services/jobs.service';

describe('JobsService master data references', () => {
  it('counts active references by masterDataId using UUID columns', async () => {
    const jobsRepository = {} as any;
    const jobExternalClicksRepository = {} as any;
    const prisma = {
      job: { count: jest.fn().mockResolvedValue(2) },
      jobSkill: { count: jest.fn().mockResolvedValue(3) },
      employerUser: { findFirst: jest.fn() },
    } as any;

    const userService = { findOrCreateProfile: jest.fn() } as any;
    const eventEmitter = { emit: jest.fn() } as any;
    const service = new JobsService(jobsRepository, jobExternalClicksRepository, prisma, userService, eventEmitter);
    const total = await service.countByMasterDataId('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');

    expect(total).toBe(5);
    expect(prisma.job.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            { categoryId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' },
            { locationId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' },
          ]),
        }),
      }),
    );
    expect(prisma.jobSkill.count).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ masterDataId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' }) }),
    );
  });
});
