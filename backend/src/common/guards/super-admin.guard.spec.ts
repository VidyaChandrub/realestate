import { ForbiddenException, type ExecutionContext } from '@nestjs/common';
import { SuperAdminGuard } from './super-admin.guard';
import { USER_INACTIVE_ERROR } from './org-approved.guard';

function ctx(user: unknown): ExecutionContext {
  const req = { user, method: 'GET', path: '/admin/platform-team', url: '/admin/platform-team' };
  return {
    switchToHttp: () => ({ getRequest: () => req }),
  } as unknown as ExecutionContext;
}

function makeGuard(account: Record<string, unknown> | null) {
  const prisma: any = {
    user: { findUnique: jest.fn().mockResolvedValue(account) },
    role: { findMany: jest.fn().mockResolvedValue([]) },
    roleModulePermission: { findMany: jest.fn().mockResolvedValue([]) },
  };
  return { guard: new SuperAdminGuard(prisma), prisma };
}

const activeSuperAdmin = {
  status: 'active',
  tokenInvalidBefore: null,
  mustChangePassword: false,
};

describe('SuperAdminGuard — Platform Team account-status gate', () => {
  const jwt = (over: Record<string, unknown> = {}) => ({
    sub: 'u1',
    orgId: null,
    roles: ['super_admin'],
    iat: Math.floor(Date.now() / 1000),
    ...over,
  });

  it('allows an active platform Super Admin', async () => {
    const { guard } = makeGuard(activeSuperAdmin);
    await expect(guard.canActivate(ctx(jwt()))).resolves.toBe(true);
  });

  it('rejects a disabled member with a USER_INACTIVE tag', async () => {
    const { guard } = makeGuard({ ...activeSuperAdmin, status: 'disabled' });
    await expect(guard.canActivate(ctx(jwt()))).rejects.toMatchObject({
      response: { error: USER_INACTIVE_ERROR },
    });
  });

  it('rejects when the account no longer exists', async () => {
    const { guard } = makeGuard(null);
    await expect(guard.canActivate(ctx(jwt()))).rejects.toMatchObject({
      response: { error: USER_INACTIVE_ERROR },
    });
  });

  it('rejects an access token issued before tokenInvalidBefore', async () => {
    const { guard } = makeGuard({
      ...activeSuperAdmin,
      tokenInvalidBefore: new Date(Date.now() + 60_000),
    });
    await expect(
      guard.canActivate(ctx(jwt({ iat: Math.floor(Date.now() / 1000) - 30 }))),
    ).rejects.toMatchObject({ response: { error: USER_INACTIVE_ERROR } });
  });

  it('blocks a member who still has a pending first-login password change (plain 403)', async () => {
    const { guard } = makeGuard({ ...activeSuperAdmin, mustChangePassword: true });
    await expect(guard.canActivate(ctx(jwt()))).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    await expect(guard.canActivate(ctx(jwt()))).rejects.not.toMatchObject({
      response: { error: USER_INACTIVE_ERROR },
    });
  });
});
