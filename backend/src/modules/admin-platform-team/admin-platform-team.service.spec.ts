import { AdminPlatformTeamService } from './admin-platform-team.service';

jest.mock('bcrypt', () => ({
  hash: jest.fn(async (v: string) => `hashed:${v}`),
  compare: jest.fn(async () => true),
}));

const memberRow = (over: Record<string, unknown> = {}) => ({
  id: 'm1',
  firstName: 'Plat',
  lastName: 'Member',
  email: 'member@ipixxel.test',
  phoneNumber: null,
  status: 'active',
  createdAt: new Date('2026-01-01T00:00:00Z'),
  userRoles: [{ role: { key: 'super_admin', name: 'Super Admin', scope: 'platform' } }],
  ...over,
});

type Txn = {
  user: { create: jest.Mock; update: jest.Mock };
  userRole: { createMany: jest.Mock; deleteMany: jest.Mock };
  refreshToken: { updateMany: jest.Mock };
};

function makeService() {
  const txn: Txn = {
    user: {
      create: jest.fn(async ({ data }: any) => ({ id: 'm1', ...data })),
      update: jest.fn(async ({ where, data }: any) => ({ id: where.id, ...data })),
    },
    userRole: {
      createMany: jest.fn().mockResolvedValue({ count: 1 }),
      deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    refreshToken: { updateMany: jest.fn().mockResolvedValue({ count: 0 }) },
  };

  const prisma: any = {
    user: {
      findUnique: jest.fn().mockResolvedValue(null),
      findFirst: jest.fn().mockResolvedValue(memberRow()),
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(1),
      delete: jest.fn().mockResolvedValue({}),
    },
    role: {
      findFirst: jest.fn().mockResolvedValue({
        id: 'role-1',
        key: 'super_admin',
        name: 'Super Admin',
        scope: 'platform',
        status: 'active',
      }),
      findMany: jest.fn().mockResolvedValue([]),
    },
    userRole: { findFirst: jest.fn().mockResolvedValue(null), ...txn.userRole },
    refreshToken: txn.refreshToken,
    $transaction: jest.fn(async (cb: (tx: Txn) => unknown) => cb(txn)),
  };

  const email = {
    sendInviteEmail: jest.fn().mockResolvedValue({ success: true }),
    sendUserAccountStatusEmail: jest.fn().mockResolvedValue({ success: true }),
  };
  const service = new AdminPlatformTeamService(prisma, email as any);
  return { service, prisma, txn, email };
}

beforeEach(() => jest.clearAllMocks());

describe('AdminPlatformTeamService.create', () => {
  it('forces a first-login password change for the new member', async () => {
    const { service, txn } = makeService();

    await service.create({
      firstName: 'Plat',
      lastName: 'Member',
      email: 'New@ipixxel.test',
      role: 'super_admin',
    } as any);

    expect(txn.user.create).toHaveBeenCalledTimes(1);
    const data = txn.user.create.mock.calls[0][0].data;
    expect(data.mustChangePassword).toBe(true);
    expect(data.status).toBe('active');
    expect(String(data.passwordHash)).toContain('hashed:');
  });
});

describe('AdminPlatformTeamService.update — disable / re-enable', () => {
  it('stamps tokenInvalidBefore, revokes refresh tokens and emails on disable', async () => {
    const { service, prisma, txn, email } = makeService();
    prisma.user.findFirst.mockResolvedValue(
      memberRow({ userRoles: [{ role: { key: 'ops', name: 'Ops', scope: 'platform' } }] }),
    );

    await service.update('m1', 'actor-1', { status: 'disabled' } as any);

    const data = txn.user.update.mock.calls[0][0].data;
    expect(data.status).toBe('disabled');
    expect(data.tokenInvalidBefore).toBeInstanceOf(Date);
    expect(txn.refreshToken.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'm1', revokedAt: null } }),
    );
    expect(email.sendUserAccountStatusEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'member@ipixxel.test', status: 'deactivated' }),
    );
  });

  it('does NOT stamp tokenInvalidBefore when re-enabling, and emails "activated"', async () => {
    const { service, prisma, txn, email } = makeService();
    prisma.user.findFirst.mockResolvedValue(
      memberRow({ status: 'disabled', userRoles: [{ role: { key: 'ops', name: 'Ops', scope: 'platform' } }] }),
    );

    await service.update('m1', 'actor-1', { status: 'active' } as any);

    const data = txn.user.update.mock.calls[0][0].data;
    expect(data.status).toBe('active');
    expect(data.tokenInvalidBefore).toBeUndefined();
    expect(txn.refreshToken.updateMany).not.toHaveBeenCalled();
    expect(email.sendUserAccountStatusEmail).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'activated' }),
    );
  });

  it('leaves sessions untouched and sends no status email for a plain profile edit', async () => {
    const { service, prisma, txn, email } = makeService();
    prisma.user.findFirst.mockResolvedValue(
      memberRow({ userRoles: [{ role: { key: 'ops', name: 'Ops', scope: 'platform' } }] }),
    );

    await service.update('m1', 'actor-1', { firstName: 'Renamed' } as any);

    const data = txn.user.update.mock.calls[0][0].data;
    expect(data.tokenInvalidBefore).toBeUndefined();
    expect(txn.refreshToken.updateMany).not.toHaveBeenCalled();
    expect(email.sendUserAccountStatusEmail).not.toHaveBeenCalled();
  });

  it('does not email when the status is unchanged', async () => {
    const { service, prisma, email } = makeService();
    prisma.user.findFirst.mockResolvedValue(
      memberRow({ status: 'active', userRoles: [{ role: { key: 'ops', name: 'Ops', scope: 'platform' } }] }),
    );

    await service.update('m1', 'actor-1', { status: 'active' } as any);

    expect(email.sendUserAccountStatusEmail).not.toHaveBeenCalled();
  });
});
