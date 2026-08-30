import type { SessionUser, UserRole } from "../types";
import { allPermissions } from "../permissions";

export const DEMO_ORGANISATION = {
  id: "org-acme-realty",
  name: "Acme Realty Group",
  slug: "acme-realty",
  city: "San Francisco",
  status: "active",
  created_at: "2025-03-14T09:00:00.000Z",
  timezone: "Asia/Kolkata",
  currency: "INR",
  default_language: "en-IN",
  logo_url: null,
  favicon_url: null,
  brand_colour: null,
  website: null,
  address_line1: null,
  address_line2: null,
  state: null,
  postal_code: null,
  country: null,
  subdomain: "acme",
  subdomain_status: "active",
  custom_domain: null,
  custom_domain_status: "none",
};

export interface MockAccount {
  email: string;
  password: string;
  role: UserRole;
  label: string;
  description: string;
  buildUser: () => SessionUser;
}

function baseUser(overrides: Partial<SessionUser>): SessionUser {
  return {
    id: overrides.id ?? "usr-mock",
    org_id: overrides.org_id ?? null,
    first_name: overrides.first_name ?? "Demo",
    last_name: overrides.last_name ?? "User",
    email: overrides.email ?? "demo@bigestate.io",
    phone_number: overrides.phone_number ?? null,
    status: "active",
    must_change_password: false,
    created_at: "2025-03-14T09:00:00.000Z",
    role: overrides.role ?? "organisation_admin",
    roleLabel: overrides.roleLabel ?? "Organisation Admin",
    permissions: overrides.permissions ?? allPermissions(),
    organisation: overrides.organisation ?? null,
  };
}

export const MOCK_ACCOUNTS: MockAccount[] = [
  {
    email: "admin@bigestate.io",
    password: "demo1234",
    role: "super_admin",
    label: "Super Admin",
    description: "Platform-wide access across every organisation and module.",
    buildUser: () =>
      baseUser({
        id: "usr-super-admin",
        first_name: "Jordan",
        last_name: "Reese",
        email: "admin@bigestate.io",
        role: "super_admin",
        roleLabel: "Super Admin",
        permissions: allPermissions(),
        organisation: null,
      }),
  },
  {
    email: "sarah@acmerealty.com",
    password: "demo1234",
    role: "organisation_admin",
    label: "Organisation Admin",
    description: "Full access within the Acme Realty Group tenant.",
    buildUser: () =>
      baseUser({
        id: "usr-org-admin",
        org_id: DEMO_ORGANISATION.id,
        first_name: "Sarah",
        last_name: "Mitchell",
        email: "sarah@acmerealty.com",
        phone_number: "+1 415 555 0120",
        role: "organisation_admin",
        roleLabel: "Organisation Admin",
        permissions: allPermissions(),
        organisation: DEMO_ORGANISATION,
      }),
  },
];

export function findMockAccount(email: string, role: UserRole) {
  return MOCK_ACCOUNTS.find(
    (account) =>
      account.email.toLowerCase() === email.trim().toLowerCase() &&
      account.role === role,
  );
}

export function findMockAccountByEmail(email: string) {
  return MOCK_ACCOUNTS.find(
    (account) => account.email.toLowerCase() === email.trim().toLowerCase(),
  );
}

export function dashboardPathFor(role?: UserRole): string {
  return role === "organisation_admin" ? "/org" : "/admin-console";
}