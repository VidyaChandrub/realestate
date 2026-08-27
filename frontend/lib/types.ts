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

export interface SignupResponse extends Partial<AuthTokens> {
  organisation: SafeOrganisation;
  user: SafeUser;
  pending?: boolean;
  message?: string;
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
  planId?: string;
  billingCycle?: 'monthly' | 'yearly';
  templateIds?: string[];
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
  adminName: string | null;
  adminEmail: string | null;
  adminPhone: string | null;
  status: "active" | "disabled" | "pending";
  createdAt: string;
  userCount: number;
  teamCount: number;
  templatesCount: number;
  plan: { id: string; name: string; slug: string; badge: string; billingCycle?: string; amount?: number } | null;
  mrr: number | null;
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
  pending?: number;
  onTrial: null;
  suspended: null;
}

export interface OrganisationDetail {
  id: string;
  name: string;
  slug: string;
  city: string;
  status: "active" | "disabled" | "pending";
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
  plan: { id: string; name: string; slug: string; badge: string } | null;
  planValue: number | null;
  subscriptionRenewsAt: string | null;
  assignedTemplates?: number;
  subscription?: Subscription | null;
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

// GET /org/templates row — the free-template library card list. No `content`;
// fetch GET /org/templates/:id for the full sections/config to preview one.
export interface OrgTemplateSummary {
  id: string;
  name: string;
  slug: string;
  thumbnail: string | null;
  category: string | null;
  template: string;
  updatedAt: string;
}

export interface OrgTemplatesListResponse {
  data: OrgTemplateSummary[];
  total: number;
  page: number;
  limit: number;
}

// --- Billing: Plans & Subscriptions ---
export interface Plan {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  priceMonthly: number;
  priceYearly: number;
  features: string[];
  limits: { projects: string; users: string; templates: string } | null;
  color: string;
  badge: string;
  isPopular: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Subscription {
  id: string;
  orgId: string;
  planId: string;
  billingCycle: 'monthly' | 'yearly';
  status: 'active' | 'past_due' | 'trial' | 'cancelled' | 'paused';
  amount: number;
  currency: string;
  mrr: number | null;
  renewsAt: string | null;
  startedAt: string;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
  organisation: { id: string; name: string; city: string; slug: string } | null;
  plan: { id: string; name: string; slug: string; priceMonthly: number; priceYearly: number; color: string; badge: string; isPopular: boolean } | null;
}

export interface SubscriptionsListResponse {
  data: Subscription[];
  total: number;
  page: number;
  limit: number;
}

export interface BillingOverview {
  mrr: number;
  arr: number;
  activePlans: number;
  activeSubscriptions: number;
  totalSubscriptions: number;
  churnRate: number;
  distribution: { planId: string; planName: string; badge: string; count: number; pct: number }[];
  mrrHistory: { month: string; mrr: number }[];
}

export interface CreatePlanInput {
  name: string;
  slug?: string;
  description?: string;
  priceMonthly: number;
  priceYearly: number;
  features?: string[];
  limits?: { projects: string; users: string; templates: string };
  color?: string;
  badge?: string;
  isPopular?: boolean;
}

export interface UpdatePlanInput extends Partial<CreatePlanInput> {
  isActive?: boolean;
}

export interface CreateSubscriptionInput {
  orgId: string;
  planId: string;
  billingCycle?: 'monthly' | 'yearly';
  status?: string;
  currency?: string;
  renewsAt?: string;
}

export interface UpdateSubscriptionInput {
  planId?: string;
  billingCycle?: 'monthly' | 'yearly';
  status?: 'active' | 'past_due' | 'trial' | 'cancelled' | 'paused';
  currency?: string;
  renewsAt?: string;
}

// --- Landing pages: org-owned copies made from an assigned template ---
export type LandingPageStatus =
  | 'draft'
  | 'pending_approval'
  | 'approved'
  | 'rejected'
  | 'published'
  | 'unpublished';

export interface LandingPageRow {
  id: string;
  name: string;
  slug: string;
  status: LandingPageStatus;
  thumbnail: string | null;
  pageType: 'landing' | 'thank_you';
  parentId?: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  sourceTemplate: { id: string; name: string } | null;
}

export interface OrgLandingPagesListResponse {
  data: LandingPageRow[];
  total: number;
  page: number;
  limit: number;
}

export interface CreateLandingPageInput {
  templateId: string;
  name: string;
}

export interface AdminLandingPageRow extends LandingPageRow {
  organisation: { id: string; name: string; slug: string };
}

export interface AdminLandingPagesListResponse {
  data: AdminLandingPageRow[];
  total: number;
  page: number;
  limit: number;
}

// GET /org/billing — read-only view over the subscriptions module for the
// org settings screen. No invoices/payment methods exist in the schema, so
// this is deliberately just plan + usage.
export interface OrgBillingPlan {
  id: string;
  name: string;
  slug: string;
  priceMonthly: number;
  priceYearly: number;
  color: string;
  badge: string;
  isPopular: boolean;
  limits: { projects?: string; users?: string; templates?: string } | null;
}

export interface OrgBillingSubscription {
  status: 'active' | 'past_due' | 'trial' | 'cancelled' | 'paused';
  billingCycle: 'monthly' | 'yearly';
  amount: number;
  currency: string;
  startedAt: string;
  renewsAt: string | null;
  cancelledAt: string | null;
}

export interface OrgBillingSummary {
  plan: OrgBillingPlan | null;
  subscription: OrgBillingSubscription | null;
  usage: {
    templatesUsed: number;
    /** null = unlimited when a plan exists; also null when there's no plan
     *  at all — callers branch on `plan === null` first, so this is never
     *  ambiguous in practice. */
    templatesLimit: number | null;
  };
}

// --- Projects & inventory (org-scoped) ---
// All money fields are integer rupees. `landArea` is acres. `possession` is
// deliberately free text ("Dec 2027"); `manager` is a free-text name, not a
// user id.
export type ProjectStatus = "active" | "inactive";
export type UnitStatus = "available" | "booked" | "held";

export interface Amenity {
  name: string;
  /** Always null for now — amenity-icon upload is out of scope (S3). */
  iconUrl: string | null;
}

/** The project's manager, expanded onto every project response so the UI
 *  can show a name without a second request. */
export interface ProjectManager {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  /** "First Last", or the email if no name is set. */
  name: string;
}

export interface Project {
  id: string;
  orgId: string;
  name: string;
  location: string | null;
  reraId: string | null;
  possession: string | null;
  managerId: string | null;
  manager: ProjectManager | null;
  status: ProjectStatus;
  priceMin: number | null;
  priceMax: number | null;
  baseRate: number | null;
  landArea: number | null;
  towerCount: number | null;
  floorsDescription: string | null;
  amenities: Amenity[];
  createdAt: string;
  updatedAt: string;
}

export interface ProjectListRow extends Project {
  unitTypeCount: number;
}

export interface UnitType {
  id: string;
  projectId: string;
  name: string;
  carpetSqft: number | null;
  builtupSqft: number | null;
  price: number | null;
  totalUnits: number;
  floorPlanUrl: string | null;
  brochureUrl: string | null;
  videoUrl: string | null;
  galleryUrls: string[];
  /** Derived live from Unit rows — never stored, so it can't drift. */
  unitCount: number;
  availableUnits: number;
  bookedUnits: number;
  heldUnits: number;
  createdAt: string;
  updatedAt: string;
}

export interface Unit {
  id: string;
  unitTypeId: string;
  unitType: { id: string; name: string };
  unitNo: string;
  /** Optional — null for projects with no tower concept (villas, plots). */
  tower: string | null;
  floor: number | null;
  facing: string | null;
  price: number | null;
  status: UnitStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectDetail extends Project {
  unitTypes: UnitType[];
  rollup: {
    totalUnitsPlanned: number;
    unitsCreated: number;
    unitsAvailable: number;
    unitsBooked: number;
    unitsHeld: number;
  };
}

export interface ProjectsListResponse {
  data: ProjectListRow[];
  total: number;
  page: number;
  limit: number;
}

export interface CreateProjectInput {
  name: string;
  location?: string;
  reraId?: string;
  possession?: string;
  managerId?: string;
  status?: ProjectStatus;
  priceMin?: number;
  priceMax?: number;
  baseRate?: number;
  landArea?: number;
  towerCount?: number;
  floorsDescription?: string;
  amenities?: Amenity[];
}

export type UpdateProjectInput = Partial<
  Omit<CreateProjectInput, "managerId">
> & {
  /** id to (re)assign, or explicit null to unassign. */
  managerId?: string | null;
};

export interface CreateUnitTypeInput {
  name: string;
  carpetSqft?: number;
  builtupSqft?: number;
  price?: number;
  totalUnits?: number;
}

export type UpdateUnitTypeInput = Partial<CreateUnitTypeInput>;

export interface CreateUnitInput {
  unitTypeId: string;
  unitNo: string;
  tower?: string;
  floor?: number;
  facing?: string;
  price?: number;
  status?: UnitStatus;
}

export type UpdateUnitInput = Partial<Omit<CreateUnitInput, "tower">> & {
  /** value to set, or explicit null to clear. */
  tower?: string | null;
};