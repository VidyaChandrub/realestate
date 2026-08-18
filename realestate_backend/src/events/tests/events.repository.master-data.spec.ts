import { EventsRepository } from '../repositories/events.repository';

describe('EventsRepository master data references', () => {
  it('counts by direct UUID columns and tagIds array', async () => {
    const prisma = {
      event: { count: jest.fn().mockResolvedValue(7) },
      eventRegistration: { count: jest.fn() },
    } as any;

    const repo = new EventsRepository(prisma);
    const total = await repo.countByMasterDataId('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');

    expect(total).toBe(7);
    expect(prisma.event.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            { categoryId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' },
            { tagIds: { has: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' } },
          ]),
        }),
      }),
    );
  });
});
