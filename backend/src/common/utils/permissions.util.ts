import { ForbiddenException } from '@nestjs/common';
import type { RoleScope } from '@prisma/client';
import type { PrismaService } from '../../database/prisma.service';

// ---------------------------------------------------------------------------
// The org permission catalog — the single source of truth both for the
// org-admin UI's "page x action" matrix (GET /org/permissions/modules) and
// for the PermissionGuard's runtime checks. Keep the set small and aligned
// with the real org pages so the matrix on the frontend matches enforcement
// exactly.
// ---------------------------------------------------------------------------

export const PERMISSION_ACTIONS = [
  'view',
  'add',
  'edit',
  'delete',
  'approve',
] as const;
export type PermissionAction = (typeof PERMISSION_ACTIONS)[number];

export interface ModuleDefinition {
  key: string;
  label: string;
  description: string;
}

// Label/description map for every gated page. `label` is shown in the admin
// UI; `description` explains what granting it unlocks.
export const PERMISSION_MODULES: ModuleDefinition[] = [
  { key: 'dashboard', label: 'Dashboard', description: 'Org overview & analytics' },
  { key: 'users', label: 'Users', description: 'Invite, manage and assign org members' },
  { key: 'sales_agents', label: 'Sales Agents', description: 'Agent dashboards & team performance' },
  { key: 'crm', label: 'Leads / CRM', description: 'Lead inbox, notes, stages and assignment' },
  { key: 'projects', label: 'Projects', description: 'Projects, unit types and unit inventory' },
  { key: 'websites', label: 'Websites', description: 'Landing pages, templates and publish' },
  { key: 'domains', label: 'Domains', description: 'Subdomain & custom-domain management' },
  { key: 'calling', label: 'Calling', description: 'Calls, queues, numbers and automation' },
  { key: 'whatsapp', label: 'WhatsApp', description: 'WhatsApp inbox and broadcasts' },
  { key: 'teams', label: 'Teams', description: 'Organising members into teams' },
  { key: 'reports', label: 'Reports', description: 'Reports and analytics' },
  { key: 'integrations', label: 'Integrations', description: 'Connected apps and channels' },
  { key: 'billing', label: 'Billing', description: 'Plan, subscription and invoices' },
  { key: 'settings', label: 'Settings', description: 'Organisation settings and profile' },
];

export type PermissionModuleKey = (typeof PERMISSION_MODULES)[number]['key'];

export const PERMISSION_MODULE_KEYS = PERMISSION_MODULES.map((m) => m.key);

/** A single module's permission row as stored/returned by the API. */
export interface ModulePermission {
  moduleKey: string;
  canView: boolean;
  canAdd: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canApprove: boolean;
}

/** Map of moduleKey -> { action -> boolean }, the shape the frontend's
 *  `Permissions` type consumes. */
export type EffectivePermissions = Record<
  string,
  Partial<Record<PermissionAction, boolean>>
>;

// Roles that are never restricted by this system — the org-wide admin and the
// platform super admin always have every permission regardless of what rows
// exist. Only the team roles (manager/sales) are gated.
const UNRESTRICTED_ROLES: ReadonlySet<string> = new Set([
  'super_admin',
  'admin',
]);

/** Defaults applied when an org has not yet customised a role for a module. */
const DEFAULT_BY_KEY: Record<
  string,
  Record<string, Partial<Record<PermissionAction, boolean>>>
> = {
  manager: {
    dashboard: { view: true },
    crm: { view: true, add: true, edit: true },
    projects: { view: true, add: true, edit: true },
    sales_agents: { view: true },
    websites: { view: true },
    calling: { view: true, add: true, edit: true },
    whatsapp: { view: true, add: true, edit: true },
    reports: { view: true },
  },
  sales: {
    dashboard: { view: true },
    crm: { view: true, add: true, edit: true },
    calling: { view: true, add: true, edit: true },
    whatsapp: { view: true, add: true, edit: true },
  },
  telecaller: {
    dashboard: { view: true },
    crm: { view: true, add: true, edit: true },
    calling: { view: true, add: true, edit: true },
    whatsapp: { view: true, add: true, edit: true },
  },
};

/** The baked-in defaults for a role key (empty for custom roles). */
export function roleDefaults(
  roleKey: string,
): Record<string, Partial<Record<PermissionAction, boolean>>> {
  return DEFAULT_BY_KEY[roleKey] ?? {};
}

const EMPTY: Partial<Record<PermissionAction, boolean>> = {};

/** The actions a module row supports, used to normalise input from the API. */
export function emptyModulePermission(moduleKey: string): ModulePermission {
  return {
    moduleKey,
    canView: false,
    canAdd: false,
    canEdit: false,
    canDelete: false,
    canApprove: false,
  };
}

/** Converts a stored module row (or role default) into the flat shape. */
export function dtoToModulePermission(
  moduleKey: string,
  source:
    | { canView: boolean; canAdd: boolean; canEdit: boolean; canDelete: boolean; canApprove: boolean }
    | Partial<Record<PermissionAction, boolean>>,
): ModulePermission {
  const isFull = 'canView' in source;
  const get = (action: PermissionAction) =>
    (isFull
      ? (source as { canView: boolean; canAdd: boolean; canEdit: boolean; canDelete: boolean; canApprove: boolean })[
          ('can' + action[0].toUpperCase() + action.slice(1)) as
            | 'canView'
            | 'canAdd'
            | 'canEdit'
            | 'canDelete'
            | 'canApprove'
        ]
      : (source as Partial<Record<PermissionAction, boolean>>)[action]) ?? false;
  return {
    moduleKey,
    canView: get('view'),
    canAdd: get('add'),
    canEdit: get('edit'),
    canDelete: get('delete'),
    canApprove: get('approve'),
  };
}

function actionToColumn(action: PermissionAction) {
  return ('can' + action[0].toUpperCase() + action.slice(1)) as
    | 'canView'
    | 'canAdd'
    | 'canEdit'
    | 'canDelete'
    | 'canApprove';
}

/** The actions + which columns map to them, for building Prisma update data. */
export const ACTION_TO_COLUMN: Record<PermissionAction, string> = {
  view: 'canView',
  add: 'canAdd',
  edit: 'canEdit',
  delete: 'canDelete',
  approve: 'canApprove',
};

// ---------------------------------------------------------------------------
// Effective-permission computation.
//   - super_admin / admin (org-wide) => everything, always.
//   - otherwise => role's configured rows for each module, overridden by any
//     per-user override rows that set a non-null column for that module.
//   - modules with no configured row fall back to DEFAULT_ROLE_PERMISSIONS.
// ---------------------------------------------------------------------------

export interface PermissionSource {
  roleKeys: string[];
  rolePermissions: Array<{
    role: { key: string };
    moduleKey: string;
    canView: boolean;
    canAdd: boolean;
    canEdit: boolean;
    canDelete: boolean;
    canApprove: boolean;
  }>;
  userOverrides: Array<{
    moduleKey: string;
    canView: boolean | null;
    canAdd: boolean | null;
    canEdit: boolean | null;
    canDelete: boolean | null;
    canApprove: boolean | null;
  }>;
}

export function isUnrestrictedRole(roleKeys: string[]): boolean {
  return roleKeys.some((key) => UNRESTRICTED_ROLES.has(key));
}

/**
 * Computes the effective permissions for a user given their role rows and any
 * per-user override rows. Returns the flat `Record<moduleKey, ModulePermission>`
 * shape and a `has(page, action)` predicate for guard-style checks.
 */
export function computeEffectivePermissions(
  source: PermissionSource,
): { byModule: Record<string, ModulePermission>; has: (module: string, action: PermissionAction) => boolean } {
  const byModule: Record<string, ModulePermission> = {};

  // Unrestricted roles get every module/action.
  if (isUnrestrictedRole(source.roleKeys)) {
    for (const def of PERMISSION_MODULES) {
      byModule[def.key] = { ...emptyModulePermission(def.key), canView: true, canAdd: true, canEdit: true, canDelete: true, canApprove: true };
    }
    const has = () => true;
    return { byModule, has };
  }

  const primaryRoleKey = source.roleKeys[0];
  const defaultsForRole = primaryRoleKey ? roleDefaults(primaryRoleKey) : {};

  const roleByModule = new Map<string, ModulePermission>();
  for (const row of source.rolePermissions) {
    roleByModule.set(row.moduleKey, {
      moduleKey: row.moduleKey,
      canView: row.canView,
      canAdd: row.canAdd,
      canEdit: row.canEdit,
      canDelete: row.canDelete,
      canApprove: row.canApprove,
    });
  }

  const overrideByModule = new Map<string, PermissionSource['userOverrides'][number]>();
  for (const row of source.userOverrides) {
    overrideByModule.set(row.moduleKey, row);
  }

  for (const def of PERMISSION_MODULES) {
    const roleRow = roleByModule.get(def.key);
    const overrideRow = overrideByModule.get(def.key);
    if (roleRow && overrideRow) {
      // Explicit override values (including false) win; null keeps the role grant.
      byModule[def.key] = {
        moduleKey: def.key,
        canView: overrideRow.canView ?? roleRow.canView,
        canAdd: overrideRow.canAdd ?? roleRow.canAdd,
        canEdit: overrideRow.canEdit ?? roleRow.canEdit,
        canDelete: overrideRow.canDelete ?? roleRow.canDelete,
        canApprove: overrideRow.canApprove ?? roleRow.canApprove,
      };
    } else if (overrideRow) {
      byModule[def.key] = {
        moduleKey: def.key,
        canView: overrideRow.canView ?? false,
        canAdd: overrideRow.canAdd ?? false,
        canEdit: overrideRow.canEdit ?? false,
        canDelete: overrideRow.canDelete ?? false,
        canApprove: overrideRow.canApprove ?? false,
      };
    } else if (roleRow) {
      byModule[def.key] = roleRow;
    } else {
      // No configured rows — fall back to the role's baked-in default.
      const defaults = defaultsForRole[def.key] ?? EMPTY;
      byModule[def.key] = {
        moduleKey: def.key,
        canView: defaults.view ?? false,
        canAdd: defaults.add ?? false,
        canEdit: defaults.edit ?? false,
        canDelete: defaults.delete ?? false,
        canApprove: defaults.approve ?? false,
      };
    }
  }

  const has = (module: string, action: PermissionAction): boolean =>
    byModule[module]?.[actionToColumn(action)] === true;

  return { byModule, has };
}

/** Shape for the caller when only the boolean check is needed. */
export function hasPermission(
  effective: { has: (module: string, action: PermissionAction) => boolean },
  module: string,
  action: PermissionAction,
): boolean {
  return effective.has(module, action);
}

/** Throws a 403 unless the user's effective permissions allow (module, action). */
export function assertPermission(
  effective: { has: (module: string, action: PermissionAction) => boolean },
  module: string,
  action: PermissionAction,
): void {
  if (!effective.has(module, action)) {
    throw new ForbiddenException(
      `You do not have permission to ${action} on ${module}`,
    );
  }
}

// ---------------------------------------------------------------------------
// Persistence helpers used by the org-permissions service. These live here so
// both the service and (optionally) the seed share the same row → shape logic.
// ---------------------------------------------------------------------------

export interface RolePermissionRow {
  roleKey: string;
  roleName: string;
  roleId: string;
  scope: RoleScope;
  restricted: boolean;
  permissions: ModulePermission[];
}

export type PermissionsPrisma = Pick<
  PrismaService,
  'role' | 'roleModulePermission' | 'userModulePermission' | 'user'
>;

export const SYSTEM_ORG_ID = 'system';

export function mergeRolePermissions<T extends { orgId?: string; moduleKey: string }>(rows: T[]): T[] {
  const map = new Map<string, T>();
  for (const row of rows) {
    if (row.orgId === SYSTEM_ORG_ID) {
      map.set(row.moduleKey, row);
    }
  }
  for (const row of rows) {
    if (row.orgId !== SYSTEM_ORG_ID) {
      map.set(row.moduleKey, row);
    }
  }
  return Array.from(map.values());
}

export async function loadRolePermissions(
  prisma: PermissionsPrisma,
  orgId: string,
  roleKeys?: string[],
): Promise<RolePermissionRow[]> {
  const roles = await prisma.role.findMany({
    where: roleKeys?.length
      ? { key: { in: roleKeys } }
      : {
          status: 'active',
          scope: { in: ['organisation', 'team'] },
          OR: [{ orgId: null }, { orgId }],
        },
    orderBy: { sortOrder: 'asc' },
  });

  const [orgRows, systemRows] = await Promise.all([
    prisma.roleModulePermission.findMany({
      where: { orgId, roleId: { in: roles.map((r) => r.id) } },
      orderBy: { moduleKey: 'asc' },
    }),
    prisma.roleModulePermission.findMany({
      where: { orgId: SYSTEM_ORG_ID, roleId: { in: roles.map((r) => r.id) } },
      orderBy: { moduleKey: 'asc' },
    }),
  ]);

  const byRole = new Map<string, Map<string, ModulePermission>>();
  const systemByRole = new Map<string, Map<string, ModulePermission>>();

  for (const row of systemRows) {
    if (!systemByRole.has(row.roleId)) systemByRole.set(row.roleId, new Map());
    systemByRole.get(row.roleId)!.set(row.moduleKey, dtoToModulePermission(row.moduleKey, row));
  }

  for (const row of orgRows) {
    if (!byRole.has(row.roleId)) byRole.set(row.roleId, new Map());
    byRole.get(row.roleId)!.set(row.moduleKey, dtoToModulePermission(row.moduleKey, row));
  }

  return roles.map((role) => {
    const orgMap = byRole.get(role.id) ?? new Map<string, ModulePermission>();
    const systemMap = systemByRole.get(role.id) ?? new Map<string, ModulePermission>();
    const unrestricted = UNRESTRICTED_ROLES.has(role.key);
    const permissions = PERMISSION_MODULES.map((def) => {
      if (unrestricted) {
        return {
          ...emptyModulePermission(def.key),
          canView: true,
          canAdd: true,
          canEdit: true,
          canDelete: true,
          canApprove: true,
        };
      }
      // 1. Org-specific customization
      const orgPerm = orgMap.get(def.key);
      if (orgPerm) return orgPerm;
      // 2. Superadmin-configured system default
      const systemPerm = systemMap.get(def.key);
      if (systemPerm) return systemPerm;
      // 3. Built-in hardcoded fallback
      return dtoToModulePermission(def.key, defaultForRole(role.key, def.key));
    });

    return {
      roleKey: role.key,
      roleName: role.name,
      roleId: role.id,
      scope: role.scope,
      restricted: !unrestricted,
      permissions,
    };
  });
}

export function defaultForRole(
  roleKey: string,
  moduleKey: string,
): Partial<Record<PermissionAction, boolean>> {
  return roleDefaults(roleKey)[moduleKey] ?? EMPTY;
}

/** Builds the full row set of Prisma column updates for one module. */
export function modulePermissionUpsertData(perm: ModulePermission) {
  return {
    canView: perm.canView,
    canAdd: perm.canAdd,
    canEdit: perm.canEdit,
    canDelete: perm.canDelete,
    canApprove: perm.canApprove,
  };
}
