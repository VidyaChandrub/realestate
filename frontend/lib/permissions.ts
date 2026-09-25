import type { PermissionAction, Permissions, UserRole } from "./types";

export const MODULES = {
  dashboard: "dashboard",
  organisations: "organisations",
  users: "users",
  sales_agents: "sales_agents",
  crm: "crm",
  forms: "forms",
  projects: "projects",
  websites: "websites",
  domains: "domains",
  calling: "calling",
  whatsapp: "whatsapp",
  teams: "teams",
  reports: "reports",
  billing: "billing",
  integrations: "integrations",
  settings: "settings",
  modules: "modules",
  templates: "templates",
  properties: "properties",
  notifications: "notifications",
  organisation: "organisation",
  team: "team",
  landing: "landing",
  profile: "profile",
} as const;

export type ModuleKey = keyof typeof MODULES;

// Pills stored in a spare action column — mirrors PROJECT_UNIT_ACTIONS /
// SETTINGS_ACTIONS / SUPPORT_ACTIONS in the backend's permissions.util.ts, so
// call sites read as the button they gate.
export const PROJECT_UNIT_ACTIONS = {
  add: "approve",
  edit: "activate",
  delete: "deactivate",
} as const satisfies Record<string, PermissionAction>;

/** Projects > Add lead — mirrors PROJECT_LEAD_ACTION in the backend. */
export const PROJECT_LEAD_ACTION = "add_lead" satisfies PermissionAction;

export const SETTINGS_ACTIONS = {
  editProfile: "edit",
  editEmail: "approve",
  editPipeline: "activate",
} as const satisfies Record<string, PermissionAction>;

export const SUPPORT_ACTIONS = {
  raiseTicket: "add",
  reply: "edit",
} as const satisfies Record<string, PermissionAction>;

export function allPermissions(): Permissions {
  const perms: Permissions = {};
  for (const mod of Object.values(MODULES)) {
    perms[mod] = { view: true, add: true, edit: true, delete: true };
  }
  return perms;
}

export function can(
  permissions: Permissions | undefined,
  module: string,
  action: PermissionAction = "view",
) {
  if (!permissions) return false;
  return permissions[module]?.[action] === true;
}

export function hasAny(permissions: Permissions | undefined, module: string) {
  if (!permissions) return false;
  const perms = permissions[module];
  if (!perms) return false;
  return (
    perms.view === true ||
    perms.add === true ||
    perms.edit === true ||
    perms.delete === true
  );
}

export function roleForScope(scope: "platform" | "organisation" | "team"): UserRole {
  if (scope === "platform") return "super_admin";
  if (scope === "organisation") return "organisation_admin";
  return "team_member";
}