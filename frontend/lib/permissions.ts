import type { PermissionAction, Permissions, UserRole } from "./types";

export const MODULES = {
  dashboard: "dashboard",
  organisations: "organisations",
  users: "users",
  modules: "modules",
  templates: "templates",
  domains: "domains",
  properties: "properties",
  crm: "crm",
  reports: "reports",
  billing: "billing",
  integrations: "integrations",
  notifications: "notifications",
  settings: "settings",
  organisation: "organisation",
  team: "team",
  landing: "landing",
  profile: "profile",
} as const;

export type ModuleKey = keyof typeof MODULES;

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