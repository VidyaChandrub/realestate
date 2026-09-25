import { ForbiddenException } from '@nestjs/common';
import { OrgUsersService } from './org-users.service';
import { assertCanAssignRole } from '../../common/utils/org-users.util';
import type { JwtPayload } from '../../common/types/jwt-payload.interface';

const manager: JwtPayload = { sub: 'm1', orgId: 'org1', roles: ['manager'] };
const admin: JwtPayload = { sub: 'a1', orgId: 'org1', roles: ['admin'] };

describe('assertCanAssignRole', () => {
  it('only lets an org admin assign the Admin role', () => {
    expect(() => assertCanAssignRole(manager, 'admin')).toThrow(
      ForbiddenException,
    );
    expect(() => assertCanAssignRole(admin, 'admin')).not.toThrow();
    expect(() => assertCanAssignRole(manager, 'sales')).not.toThrow();
    expect(() => assertCanAssignRole(manager, undefined)).not.toThrow();
  });
});

describe('OrgUsersService', () => {
  function makeService(usersRow: Record<string, boolean>) {
    const prisma: any = {
      user: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'm1',
          orgId: 'org1',
          userRoles: [{ role: { key: 'manager' } }],
        }),
      },
      role: {
        findMany: jest.fn().mockResolvedValue([
          { key: 'admin', name: 'Admin' },
          { key: 'manager', name: 'Manager' },
        ]),
      },
      roleModulePermission: {
        findMany: jest.fn().mockResolvedValue([
          { orgId: 'org1', moduleKey: 'users', ...usersRow },
        ]),
      },
      userModulePermission: { findMany: jest.fn().mockResolvedValue([]) },
    };
    return new OrgUsersService(prisma);
  }

  it('marks Admin unassignable for non-admins', async () => {
    const roles = await makeService({}).roles('org1', manager);
    expect(roles).toEqual([
      { key: 'admin', name: 'Admin', assignable: false },
      { key: 'manager', name: 'Manager', assignable: true },
    ]);
  });

  it('blocks a non-admin from promoting a user to Admin', () => {
    expect(() =>
      makeService({}).update('org1', manager, 'u2', { role: 'admin' }),
    ).toThrow(ForbiddenException);
  });

  it('blocks changing your own role', () => {
    expect(() =>
      makeService({}).update('org1', manager, 'm1', { role: 'sales' }),
    ).toThrow(ForbiddenException);
  });

  it('requires Users > Deactivate to disable a member via status', async () => {
    const service = makeService({ canView: true, canEdit: true });
    await expect(
      service.updateStatus('org1', manager, 'u2', { status: 'disabled' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('requires Users > Activate to re-enable a member via status', async () => {
    const service = makeService({ canView: true, canDeactivate: true });
    await expect(
      service.updateStatus('org1', manager, 'u2', { status: 'active' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
