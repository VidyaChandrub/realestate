import { JobStatus, JobWorkMode } from '@prisma/client';
import { JobsRepository } from '../repositories/jobs.repository';

describe('JobsRepository', () => {
  it('applies experience-month range and active expiration filters for feed pre-filtering', async () => {
    const prisma = {
      job: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
    } as any;

    const repository = new JobsRepository(prisma);

    await repository.findAll({
      status: JobStatus.ACTIVE,
      workMode: JobWorkMode.HYBRID,
      experienceMonths: 36,
      asOf: '2026-02-24T00:00:00.000Z',
      page: 1,
      limit: 20,
    });

    expect(prisma.job.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        include: { skills: true },
        where: {
          AND: expect.arrayContaining([
            { status: JobStatus.ACTIVE },
            { workMode: JobWorkMode.HYBRID },
            {
              AND: [
                {
                  OR: [
                    { minExperienceMonths: null },
                    { minExperienceMonths: { lte: 36 } },
                  ],
                },
                {
                  OR: [
                    { maxExperienceMonths: null },
                    { maxExperienceMonths: { gte: 36 } },
                  ],
                },
              ],
            },
            {
              OR: [
                { expiresAt: null },
                { expiresAt: { gt: new Date('2026-02-24T00:00:00.000Z') } },
              ],
            },
          ]),
        },
      }),
    );
  });
});
