import type { UserRole } from "./types";
import { decodeAccessToken } from "./session";

const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin",
  admin: "Organisation Admin",
  manager: "Manager",
  sales: "Sales",
  telecaller: "Telecaller",
};

export function labelForRoleKey(roleKey: string | null | undefined): string {
  if (!roleKey) return "Team Member";
  if (ROLE_LABELS[roleKey]) return ROLE_LABELS[roleKey];
  return roleKey
    .replace(/^org_/, "")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function sessionRoleFromKeys(
  roleKeys: string[] | undefined,
  orgId: string | null,
  onboardingStep?: string,
): { role: UserRole; roleLabel: string } {
  const keys = roleKeys ?? [];
  if (keys.includes("super_admin") || (!orgId && onboardingStep === "completed")) {
    return { role: "super_admin", roleLabel: "Super Admin" };
  }
  if (keys.includes("admin")) {
    return { role: "organisation_admin", roleLabel: "Organisation Admin" };
  }
  const primary = keys.find((key) => key !== "super_admin") ?? keys[0] ?? null;
  return { role: "team_member", roleLabel: labelForRoleKey(primary) };
}

export function sessionRoleFromStoredToken(
  orgId: string | null,
  onboardingStep?: string,
): { role: UserRole; roleLabel: string } {
  const decoded = decodeAccessToken();
  return sessionRoleFromKeys(decoded?.roles, orgId, onboardingStep);
}
