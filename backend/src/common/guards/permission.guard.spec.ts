import { ForbiddenException, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionGuard } from './permission.guard';
import type { RequiredPermission } from '../decorators/require-permission.decorator';
import {
  clampToModuleActions,
  computeEffectivePermissions,
  moduleActions,
  SYSTEM_ORG_ID,
} from '../utils/permissions.util';

const FULL = {
  canView: true,
  canAdd: true,
  canEdit: true,
  canDelete: true,
  canApprove: true,
  canActivate: true,
  canDeactivate: true,
  canAddLead: true,
};

function ctx(): ExecutionContext {
  const req = { user: { sub: 'u1', orgId: 'org1' } };
  return {
    switchToHttp: () => ({ getRequest: () => req }),
    getHandler: () => undefined,
    getClass: () => undefined,
  } as unknown as ExecutionContext;
}

function makeGuard(
  required: RequiredPermission,
  roleKey: string,
  roleRows: Array<Record<string, unknown>> = [],
) {
  const reflector = {
    getAllAndOverride: jest.fn().mockReturnValue(required),
  } as unknown as Reflector;
  const prisma: any = {
    user: {
      findUnique: jest.fn().mockResolvedValue({
        id: 'u1',
        orgId: 'org1',
        userRoles: [{ role: { key: roleKey } }],
      }),
    },
    roleModulePermission: { findMany: jest.fn().mockResolvedValue(roleRows) },
    userModulePermission: { findMany: jest.fn().mockResolvedValue([]) },
  };
  return { guard: new PermissionGuard(reflector, prisma), prisma };
}

describe('dashboard module actions', () => {
  it('is view-only', () => {
    expect(moduleActions('dashboard')).toEqual(['view']);
    expect(moduleActions('crm')).toEqual([
      'view',
      'add',
      'edit',
      'delete',
      'approve',
    ]);
  });

  it('clamps stale add/edit/delete/approve grants off', () => {
    expect(clampToModuleActions({ moduleKey: 'dashboard', ...FULL })).toEqual({
      moduleKey: 'dashboard',
      canView: true,
      canAdd: false,
      canEdit: false,
      canDelete: false,
      canApprove: false,
      canActivate: false,
      canDeactivate: false,
      canAddLead: false,
    });
    expect(clampToModuleActions({ moduleKey: 'crm', ...FULL })).toEqual({
      moduleKey: 'crm',
      ...FULL,
      canActivate: false,
      canDeactivate: false,
      canAddLead: false,
    });
  });

  it('never reports unsupported dashboard actions as effective', () => {
    const effective = computeEffectivePermissions({
      roleKeys: ['manager'],
      rolePermissions: [
        { role: { key: 'manager' }, moduleKey: 'dashboard', ...FULL },
      ],
      userOverrides: [
        {
          moduleKey: 'dashboard',
          canView: null,
          canAdd: true,
          canEdit: null,
          canDelete: null,
          canApprove: null,
        },
      ],
    });
    expect(effective.has('dashboard', 'view')).toBe(true);
    expect(effective.has('dashboard', 'add')).toBe(false);
    expect(effective.has('dashboard', 'edit')).toBe(false);
  });
});

describe('users module actions', () => {
  it('offers activate/deactivate instead of approve', () => {
    expect(moduleActions('users')).toEqual([
      'view',
      'add',
      'edit',
      'delete',
      'activate',
      'deactivate',
    ]);
  });

  it('drops a stale users approve grant', () => {
    const row = clampToModuleActions({ moduleKey: 'users', ...FULL });
    expect(row.canApprove).toBe(false);
    expect(row.canActivate).toBe(true);
    expect(row.canDeactivate).toBe(true);
  });

  it('lets a user override grant activate on top of the role', () => {
    const effective = computeEffectivePermissions({
      roleKeys: ['manager'],
      rolePermissions: [
        {
          role: { key: 'manager' },
          moduleKey: 'users',
          canView: true,
          canAdd: false,
          canEdit: false,
          canDelete: false,
          canApprove: false,
          canActivate: false,
          canDeactivate: false,
        },
      ],
      userOverrides: [{ moduleKey: 'users', canActivate: true }],
    });
    expect(effective.has('users', 'view')).toBe(true);
    expect(effective.has('users', 'activate')).toBe(true);
    expect(effective.has('users', 'deactivate')).toBe(false);
  });
});

describe('PermissionGuard enforceForOrgAdmin', () => {
  const dashboardView: RequiredPermission = {
    module: 'dashboard',
    action: 'view',
    enforceForOrgAdmin: true,
  };

  it('keeps the org admin bypass for routes that do not opt in', async () => {
    const { guard, prisma } = makeGuard(
      { module: 'crm', action: 'delete' },
      'admin',
    );
    await expect(guard.canActivate(ctx())).resolves.toBe(true);
    expect(prisma.roleModulePermission.findMany).not.toHaveBeenCalled();
  });

  it('lets the org admin view the dashboard by default', async () => {
    const { guard } = makeGuard(dashboardView, 'admin');
    await expect(guard.canActivate(ctx())).resolves.toBe(true);
  });

  it('blocks the org admin when Super Admin removed Dashboard > View', async () => {
    const { guard } = makeGuard(dashboardView, 'admin', [
      {
        orgId: SYSTEM_ORG_ID,
        moduleKey: 'dashboard',
        canView: false,
        canAdd: false,
        canEdit: false,
        canDelete: false,
        canApprove: false,
        canActivate: false,
        canDeactivate: false,
      },
    ]);
    await expect(guard.canActivate(ctx())).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('blocks the org admin from deactivating when Super Admin removed it', async () => {
    const { guard } = makeGuard(
      { module: 'users', action: 'deactivate', enforceForOrgAdmin: true },
      'admin',
      [
        {
          orgId: SYSTEM_ORG_ID,
          moduleKey: 'users',
          canView: true,
          canAdd: true,
          canEdit: true,
          canDelete: true,
          canApprove: false,
          canActivate: true,
          canDeactivate: false,
        },
      ],
    );
    await expect(guard.canActivate(ctx())).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('blocks a member whose role lacks Dashboard > View', async () => {
    const { guard } = makeGuard(dashboardView, 'custom_role');
    await expect(guard.canActivate(ctx())).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
});

describe('landing pages & templates modules', () => {
  it('landing pages offer Publish / Pause via activate / deactivate', () => {
    expect(moduleActions('landing_pages')).toEqual([
      'view',
      'add',
      'edit',
      'delete',
      'activate',
      'deactivate',
    ]);
  });

  it('templates have no edit or approve', () => {
    expect(moduleActions('templates')).toEqual(['view', 'add', 'delete']);
    const row = clampToModuleActions({ moduleKey: 'templates', ...FULL });
    expect(row.canEdit).toBe(false);
    expect(row.canApprove).toBe(false);
    expect(row.canDelete).toBe(true);
  });

  it('websites now only covers Media Library view', () => {
    expect(moduleActions('websites')).toEqual(['view']);
  });

  it('manager keeps view access to both by default', () => {
    const effective = computeEffectivePermissions({
      roleKeys: ['manager'],
      rolePermissions: [],
      userOverrides: [],
    });
    expect(effective.has('landing_pages', 'view')).toBe(true);
    expect(effective.has('landing_pages', 'activate')).toBe(false);
    expect(effective.has('templates', 'view')).toBe(true);
    expect(effective.has('templates', 'add')).toBe(false);
  });

  it('blocks the org admin from publishing when Super Admin removed Publish', async () => {
    const { guard } = makeGuard(
      { module: 'landing_pages', action: 'activate', enforceForOrgAdmin: true },
      'admin',
      [
        {
          orgId: SYSTEM_ORG_ID,
          moduleKey: 'landing_pages',
          ...FULL,
          canActivate: false,
        },
      ],
    );
    await expect(guard.canActivate(ctx())).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
});

describe('removed sales_agents module', () => {
  it('is no longer offered and never granted to members', () => {
    const effective = computeEffectivePermissions({
      roleKeys: ['manager'],
      rolePermissions: [
        { role: { key: 'manager' }, moduleKey: 'sales_agents', ...FULL },
      ],
      userOverrides: [{ moduleKey: 'sales_agents', canView: true }],
    });
    expect(effective.byModule.sales_agents).toBeUndefined();
    expect(effective.has('sales_agents', 'view')).toBe(false);
  });
});

describe('projects add_lead pill', () => {
  it('is a Projects action stored in canAddLead', () => {
    expect(moduleActions('projects')).toContain('add_lead');
    expect(clampToModuleActions({ moduleKey: 'projects', ...FULL }).canAddLead).toBe(true);
    expect(clampToModuleActions({ moduleKey: 'crm', ...FULL }).canAddLead).toBe(false);
  });

  it('reads per-user overrides for add_lead', () => {
    const effective = computeEffectivePermissions({
      roleKeys: ['sales'],
      rolePermissions: [],
      userOverrides: [{ moduleKey: 'projects', canView: true, canAddLead: true }],
    });
    expect(effective.has('projects', 'add_lead')).toBe(true);
  });
});
