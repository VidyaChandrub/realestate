import { listLeadAssignableUsers } from './lead-assignee.util';

type Row = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  userRoles: Array<{ role: { key: string; name: string; status: string } }>;
};

function makePrisma(opts: {
  users: Row[];
  roleCrm?: Array<{ orgId: string; canView: boolean; role: { key: string } }>;
  userCrm?: Array<{ userId: string; canView: boolean | null }>;
}) {
  return {
    user: { findMany: jest.fn().mockResolvedValue(opts.users) },
    roleModulePermission: {
      findMany: jest.fn().mockResolvedValue(opts.roleCrm ?? []),
    },
    userModulePermission: {
      findMany: jest.fn().mockResolvedValue(opts.userCrm ?? []),
    },
  } as never;
}

const role = (key: string, name = key) => ({
  role: { key, name, status: 'active' },
});

describe('listLeadAssignableUsers — one rule for "who can hold a lead"', () => {
  it('includes system roles that grant crm:view by default (sales, telecaller)', async () => {
    const prisma = makePrisma({
      users: [
        { id: 's', firstName: 'S', lastName: null, email: 's@x', userRoles: [role('sales')] },
        { id: 't', firstName: 'T', lastName: null, email: 't@x', userRoles: [role('telecaller')] },
      ],
    });
    const out = await listLeadAssignableUsers(prisma, 'org-1');
    expect(out.map((u) => u.id).sort()).toEqual(['s', 't']);
  });

  it('excludes admins, super_admins and managers outright', async () => {
    const prisma = makePrisma({
      users: [
        { id: 'a', firstName: null, lastName: null, email: 'a@x', userRoles: [role('admin')] },
        { id: 'sa', firstName: null, lastName: null, email: 'sa@x', userRoles: [role('super_admin')] },
        { id: 'm', firstName: null, lastName: null, email: 'm@x', userRoles: [role('manager')] },
      ],
    });
    expect(await listLeadAssignableUsers(prisma, 'org-1')).toEqual([]);
  });

  it('excludes a multi-role user who is ALSO a manager, even though sales would qualify', async () => {
    const prisma = makePrisma({
      users: [
        {
          id: 'ms',
          firstName: 'Meera',
          lastName: 'Rao',
          email: 'ms@x',
          userRoles: [role('manager'), role('sales')],
        },
      ],
    });
    expect(await listLeadAssignableUsers(prisma, 'org-1')).toEqual([]);
  });

  it('a custom role is eligible only with an explicit crm:view grant', async () => {
    const users: Row[] = [
      { id: 'c1', firstName: 'C1', lastName: null, email: 'c1@x', userRoles: [role('regional_head')] },
      { id: 'c2', firstName: 'C2', lastName: null, email: 'c2@x', userRoles: [role('deal_desk')] },
    ];
    const prisma = makePrisma({
      users,
      roleCrm: [
        { orgId: 'org-1', canView: true, role: { key: 'regional_head' } },
        { orgId: 'org-1', canView: false, role: { key: 'deal_desk' } },
      ],
    });
    expect((await listLeadAssignableUsers(prisma, 'org-1')).map((u) => u.id)).toEqual(['c1']);
  });

  it('a per-user crm override wins over the role', async () => {
    const prisma = makePrisma({
      users: [
        { id: 'blocked', firstName: 'B', lastName: null, email: 'b@x', userRoles: [role('sales')] },
        { id: 'granted', firstName: 'G', lastName: null, email: 'g@x', userRoles: [role('regional_head')] },
      ],
      userCrm: [
        { userId: 'blocked', canView: false },
        { userId: 'granted', canView: true },
      ],
    });
    expect((await listLeadAssignableUsers(prisma, 'org-1')).map((u) => u.id)).toEqual(['granted']);
  });
});
