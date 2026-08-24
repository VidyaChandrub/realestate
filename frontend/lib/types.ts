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
  city: string;
  status: string;
  created_at: string;
  timezone: string;
  currency: string;
  default_language: string;
  logo_url: string | null;
  favicon_url: string | null;
  brand_colour: string | null;
  website: string | null;
  address_line1: string | null;
  address_line2: string | null;
  state: string | null;
  postal_code: string | null;
  country: string | null;
}

export interface UpdateOrganisationSettingsInput {
  name?: string;
  city?: string;
  timezone?: string;
  currency?: string;
  defaultLanguage?: string;
  logoUrl?: string;
  faviconUrl?: string;
  brandColour?: string;
  website?: string;
  addressLine1?: string;
  addressLine2?: string;
  state?: string;
  postalCode?: string;
  country?: string;
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
  city: string;
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

export type SendViaChannel = "email" | "whatsapp" | "sms";

export interface OnboardCompanyInput {
  company_name: string;
  city: string;
}

export interface OnboardCompanyResponse {
  orgId: string;
  slug: string;
}

export interface OnboardAdminInput {
  first_name: string;
  last_name: string;
  work_email: string;
  phone_number: string;
  force_password_change: boolean;
  send_via: SendViaChannel[];
}

export interface ActivateOrganisationResponse {
  organisation: SafeOrganisation;
  admin: SafeUser;
}

export interface OrganisationListRow {
  id: string;
  name: string;
  slug: string;
  city: string;
  adminEmail: string | null;
  status: "active" | "disabled";
  createdAt: string;
  userCount: number;
  plan: null;
  mrr: null;
}

export interface OrganisationListResponse {
  data: OrganisationListRow[];
  total: number;
  page: number;
  limit: number;
}

export interface OrganisationSummary {
  total: number;
  active: number;
  onTrial: null;
  suspended: null;
}

export interface OrganisationDetail {
  id: string;
  name: string;
  slug: string;
  city: string;
  status: "active" | "disabled";
  createdAt: string;
  timezone: string;
  currency: string;
  defaultLanguage: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  brandColour: string | null;
  website: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
  admin: {
    firstName: string | null;
    lastName: string | null;
    email: string;
    phoneNumber: string | null;
  } | null;
  userCount: number;
  teamCount: number;
  plan: null;
  planValue: null;
  subscriptionRenewsAt: null;
}

export type OrgUserAssignableRole = "admin" | "manager" | "sales";
export type OrgUserStatus = "active" | "disabled";

export interface OrgUserRole {
  key: OrgUserAssignableRole;
  name: string;
}

export interface OrgUser {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  phoneNumber: string | null;
  role: OrgUserRole | null;
  status: OrgUserStatus;
  createdAt: string;
  mustChangePassword: boolean;
  // Always false today — Teams have no creation/membership UI yet.
  hasTeam: boolean;
}

export interface OrgUsersListResponse {
  data: OrgUser[];
  total: number;
  page: number;
  limit: number;
}

export interface CreateOrgUserInput {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  role: OrgUserAssignableRole;
}

export interface UpdateOrgUserInput {
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  role?: OrgUserAssignableRole;
}

export interface OrganisationActivityRow {
  id: string;
  action: string;
  entity: string | null;
  entityId: string | null;
  createdAt: string;
}