export interface SafeUser {
  id: string;
  org_id: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string;
  phone_number: string | null;
  status: string;
  must_change_password: boolean;
  created_at: string;
}

export interface SafeOrganisation {
  id: string;
  name: string;
  slug: string;
  status: string;
  created_at: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
}

export interface LoginResponse extends AuthTokens {
  user: SafeUser;
}

export interface SignupResponse extends AuthTokens {
  organisation: SafeOrganisation;
  user: SafeUser;
}

export interface ApiErrorBody {
  statusCode?: number;
  message?: string | string[];
  error?: string;
}

export interface SignupInput {
  first_name: string;
  last_name: string;
  company_name: string;
  work_email: string;
  phone_number: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export type UserRole = "super_admin" | "organisation_admin" | "team_member";

export type PermissionAction = "view" | "add" | "edit" | "delete";

export type Permissions = Record<
  string,
  Partial<Record<PermissionAction, boolean>>
>;

export interface SessionUser extends SafeUser {
  role: UserRole;
  roleLabel: string;
  permissions: Permissions;
  organisation: SafeOrganisation | null;
}

export interface OrganisationRegistrationInput {
  organisation_name: string;
  work_email: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  password: string;
}