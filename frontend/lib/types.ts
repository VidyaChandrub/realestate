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
  assignedTemplateIds: string[];
  skippedTemplateIds: string[];
}

// "Template" is a published LandingPage — no free/paid distinction exists
// on that model yet, so the wizard treats every one as free for now.
export interface AdminTemplate {
  id: string;
  name: string;
}

export interface AdminTemplateListResponse {
  data: AdminTemplate[];
  total: number;
  page: number;
  limit: number;
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
  landingPagesCount: null;
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
  admin: {
    firstName: string | null;
    lastName: string | null;
    email: string;
    phoneNumber: string | null;
  } | null;
  userCount: number;
  teamCount: number;
  plan: null;
  landingPagesCount: null;
  landingPagesPublished: null;
  leadsCaptured: null;
  leadsThisMonth: null;
  planValue: null;
  subscriptionRenewsAt: null;
}

export interface OrganisationUserRow {
  firstName: string | null;
  lastName: string | null;
  email: string;
  role: string | null;
  teams: string[];
}

export interface OrganisationActivityRow {
  id: string;
  action: string;
  entity: string | null;
  entityId: string | null;
  createdAt: string;
}

export interface OrganisationTemplateRow {
  name: string;
  category: string;
  thumbnail: string | null;
  status: string;
  assignedAt: string;
}