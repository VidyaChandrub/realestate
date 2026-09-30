import { ForbiddenException } from '@nestjs/common';
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
  auditLog: { create: jest.Mock };
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
    auditLog: { create: jest.fn().mockResolvedValue({}) },
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
    const { service, prisma, txn } = makeService();
    prisma.user.findFirst.mockResolvedValueOnce(null); // mobile number not taken

    await service.create({
      firstName: 'Plat',
      lastName: 'Member',
      email: 'New@ipixxel.test',
      phoneNumber: '9825041200',
      role: 'ops',
    } as any);

    expect(txn.user.create).toHaveBeenCalledTimes(1);
    const data = txn.user.create.mock.calls[0][0].data;
    expect(data.mustChangePassword).toBe(true);
    expect(data.status).toBe('active');
    expect(String(data.passwordHash)).toContain('hashed:');
  });

  it('refuses to create a Super Admin', async () => {
    const { service, txn } = makeService();

    await expect(
      service.create({
        firstName: 'Plat',
        lastName: 'Member',
        email: 'new@ipixxel.test',
        phoneNumber: '9825041200',
        role: 'super_admin',
      } as any),
    ).rejects.toThrow('Super Admin accounts cannot be created');
    expect(txn.user.create).not.toHaveBeenCalled();
  });
});

describe('AdminPlatformTeamService.get', () => {
  it('404s for a user who is not a platform team member', async () => {
    const { service, prisma } = makeService();
    prisma.user.findFirst.mockResolvedValueOnce(null);

    await expect(service.get('org-user-1')).rejects.toThrow(
      'Platform team member not found',
    );
  });

  it('returns the member when they hold a platform role', async () => {
    const { service, prisma } = makeService();
    prisma.user.findFirst
      .mockResolvedValueOnce({ id: 'member-1' })
      .mockResolvedValueOnce(memberRow());

    const result = await service.get('member-1');

    expect(result).toEqual(expect.objectContaining({ email: expect.any(String) }));
  });
});

describe('AdminPlatformTeamService.list', () => {
  it('returns the full array when no page is requested', async () => {
    const { service, prisma } = makeService();
    prisma.user.findMany.mockResolvedValue([memberRow()]);

    const result = await service.list();

    expect(Array.isArray(result)).toBe(true);
    expect(prisma.user.findMany.mock.calls[0][0].skip).toBeUndefined();
  });

  it('paginates 10 per page by default when a page is requested', async () => {
    const { service, prisma } = makeService();
    prisma.user.count.mockResolvedValue(23);
    prisma.user.findMany.mockResolvedValue([memberRow()]);

    const result = await service.list({ page: 3 });

    const args = prisma.user.findMany.mock.calls[0][0];
    expect(args.skip).toBe(20);
    expect(args.take).toBe(10);
    expect(result).toEqual(expect.objectContaining({ total: 23, page: 3, limit: 10 }));
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
    expect(data.passwordHash).toBeUndefined();
    expect(data.mustChangePassword).toBeUndefined();
    expect(txn.refreshToken.updateMany).not.toHaveBeenCalled();
    expect(email.sendUserAccountStatusEmail).not.toHaveBeenCalled();
    expect(email.sendInviteEmail).not.toHaveBeenCalled();
  });

  it('on a password change: forces a change at next login, ends sessions and emails the new password', async () => {
    const { service, prisma, txn, email } = makeService();
    prisma.user.findFirst.mockResolvedValue(
      memberRow({ userRoles: [{ role: { key: 'ops', name: 'Ops', scope: 'platform' } }] }),
    );

    await service.update('m1', 'actor-1', { password: 'NewTemp#123' } as any);

    const data = txn.user.update.mock.calls[0][0].data;
    expect(String(data.passwordHash)).toContain('hashed:');
    expect(data.mustChangePassword).toBe(true);
    expect(data.tokenInvalidBefore).toBeInstanceOf(Date);
    expect(txn.refreshToken.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'm1', revokedAt: null } }),
    );
    expect(email.sendInviteEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'member@ipixxel.test', tempPassword: 'NewTemp#123' }),
    );
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

describe('AdminPlatformTeamService — Super Admin accounts are protected', () => {
  it('update: rejects a non-Super-Admin actor editing a Super Admin target', async () => {
    const { service, prisma } = makeService();
    prisma.user.findFirst.mockResolvedValue(memberRow()); // default row has the super_admin role
    prisma.userRole.findFirst.mockResolvedValue({ id: 'ur1' }); // hasRole('super_admin') -> true

    await expect(
      service.update('m1', 'actor-1', { firstName: 'Hacked' } as any, ['platform_operator']),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('update: allows a Super Admin actor to edit a Super Admin target', async () => {
    const { service, prisma, txn } = makeService();
    prisma.user.findFirst.mockResolvedValue(memberRow());
    prisma.userRole.findFirst.mockResolvedValue({ id: 'ur1' });

    await service.update('m1', 'actor-1', { firstName: 'Renamed' } as any, ['super_admin']);

    expect(txn.user.update).toHaveBeenCalledTimes(1);
  });

  it('update: does not gate editing a non-Super-Admin target on the actor\'s roles', async () => {
    const { service, prisma, txn } = makeService();
    prisma.user.findFirst.mockResolvedValue(
      memberRow({ userRoles: [{ role: { key: 'ops', name: 'Ops', scope: 'platform' } }] }),
    );
    prisma.userRole.findFirst.mockResolvedValue(null); // hasRole('super_admin') -> false

    await service.update('m1', 'actor-1', { firstName: 'Renamed' } as any, ['platform_operator']);

    expect(txn.user.update).toHaveBeenCalledTimes(1);
  });

  it('remove: rejects deleting a Super Admin account outright, even by another Super Admin', async () => {
    const { service, prisma } = makeService();
    prisma.user.findFirst.mockResolvedValue(memberRow());
    prisma.userRole.findFirst.mockResolvedValue({ id: 'ur1' });

    await expect(service.remove('m1', 'actor-1')).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.user.delete).not.toHaveBeenCalled();
  });

  it('remove: allows deleting a non-Super-Admin member', async () => {
    const { service, prisma } = makeService();
    prisma.user.findFirst.mockResolvedValue(
      memberRow({ userRoles: [{ role: { key: 'ops', name: 'Ops', scope: 'platform' } }] }),
    );
    prisma.userRole.findFirst.mockResolvedValue(null);

    await expect(service.remove('m1', 'actor-1')).resolves.toEqual({ ok: true });
    expect(prisma.user.delete).toHaveBeenCalledWith({ where: { id: 'm1' } });
  });
});
