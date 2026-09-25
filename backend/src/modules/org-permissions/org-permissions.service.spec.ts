import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { OrgPermissionsService } from './org-permissions.service';
import type { JwtPayload } from '../../common/types/jwt-payload.interface';
import type { UpdateRolePermissionsDto } from './dto/update-role-permissions.dto';

const ROLES = [
  { id: 'r-admin', key: 'admin', name: 'Admin', scope: 'organisation', sortOrder: 1, orgId: null },
  { id: 'r-manager', key: 'manager', name: 'Manager', scope: 'organisation', sortOrder: 2, orgId: null },
  { id: 'r-sales', key: 'sales', name: 'Sales', scope: 'organisation', sortOrder: 3, orgId: null },
];

function row(moduleKey: string, grants: Partial<Record<string, boolean>> = {}) {
  return {
    moduleKey,
    canView: false,
    canAdd: false,
    canEdit: false,
    canDelete: false,
    canApprove: false,
    canActivate: false,
    canDeactivate: false,
    ...grants,
  };
}

function dto(...permissions: ReturnType<typeof row>[]): UpdateRolePermissionsDto {
  return { permissions } as UpdateRolePermissionsDto;
}

/** Actor with the given role; no saved permission rows (role defaults apply). */
function makeService(actorRole: string) {
  const prisma: any = {
    role: {
      findFirst: jest.fn(({ where }: { where: { key: string } }) =>
        Promise.resolve(ROLES.find((r) => r.key === where.key) ?? null),
      ),
      findMany: jest.fn().mockResolvedValue(ROLES),
    },
    user: {
      findFirst: jest.fn().mockResolvedValue({
        userRoles: [{ role: { key: actorRole } }],
      }),
    },
    roleModulePermission: {
      findMany: jest.fn().mockResolvedValue([]),
      upsert: jest.fn(),
      deleteMany: jest.fn(),
    },
    userModulePermission: { findMany: jest.fn().mockResolvedValue([]) },
    $transaction: jest.fn().mockResolvedValue(undefined),
  };
  return { service: new OrgPermissionsService(prisma), prisma };
}

const actor = (role: string): JwtPayload => ({ sub: 'u1', orgId: 'org1', roles: [role] });

describe('OrgPermissionsService.updateRole safety rules', () => {
  it('never lets anyone change the Admin role here', async () => {
    const { service } = makeService('admin');
    await expect(
      service.updateRole('org1', actor('admin'), 'admin', dto(row('crm', { canView: true }))),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('blocks a member from changing a role they hold', async () => {
    const { service, prisma } = makeService('manager');
    await expect(
      service.updateRole('org1', actor('manager'), 'manager', dto(row('crm', { canView: true }))),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('blocks a member from granting an action they lack', async () => {
    const { service, prisma } = makeService('manager');
    // Manager defaults have Landing Pages view only — not Publish.
    await expect(
      service.updateRole(
        'org1',
        actor('manager'),
        'sales',
        dto(row('landing_pages', { canView: true, canActivate: true })),
      ),
    ).rejects.toThrow(/Landing Pages › Publish/);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('lets a member grant actions they hold themselves', async () => {
    const { service, prisma } = makeService('manager');
    await service.updateRole(
      'org1',
      actor('manager'),
      'sales',
      dto(row('crm', { canView: true, canAdd: true, canEdit: true })),
    );
    expect(prisma.$transaction).toHaveBeenCalled();
  });

  it('exempts the org admin (Super Admin governs their access)', async () => {
    const { service, prisma } = makeService('admin');
    await service.updateRole(
      'org1',
      actor('admin'),
      'sales',
      dto(row('landing_pages', { canView: true, canActivate: true })),
    );
    expect(prisma.$transaction).toHaveBeenCalled();
  });
});
