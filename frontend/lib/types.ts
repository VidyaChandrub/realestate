export type OnboardingStep =
  | "account"
  | "organisation"
  | "business_details"
  | "modules"
  | "subscription"
  | "templates"
  | "invite"
  | "connect"
  | "completed";

export type OrgIndustry = "developer" | "broker" | "channel" | "mixed";

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
  onboarding_step: OnboardingStep;
  email_verified_at?: string | null;
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
  rera_license_no: string | null;
  gstin: string | null;
  team_size: string | null;
  legal_name: string | null;
  industry: OrgIndustry | null;
  support_email: string | null;
  support_phone: string | null;
  enabled_modules: string[];
  subdomain: string | null;
  subdomain_status: string;
  custom_domain: string | null;
  custom_domain_status: string;
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
  reraLicenseNo?: string;
  gstin?: string;
  legalName?: string;
  industry?: OrgIndustry;
  supportEmail?: string;
  supportPhone?: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
}

export interface LoginResponse extends AuthTokens {
  user: SafeUser;
  roles?: string[];
  onboarding_incomplete?: boolean;
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

// --- Signup wizard (resumable, step-wise) ---

export interface OnboardingAccountInput {
  first_name: string;
  last_name: string;
  work_email: string;
  phone_number: string;
  password: string;
}

export type SignupStep1Response =
  | ({ status: "created" } & AuthTokens & {
        user: SafeUser;
        onboardingStep: OnboardingStep;
        nextStep: OnboardingStep;
        email_verification_required?: boolean;
      })
  | {
      status: "exists_incomplete";
      existingUserId: string;
      firstName: string | null;
      lastName: string | null;
      onboardingStep: OnboardingStep;
    }
  | { status: "exists_completed" };

// "You already started this" popup — resolves an exists_incomplete match by
// either continuing the old draft or restarting it, both with whatever was
// just retyped on Step 1. See AuthService.resumeExistingDraft/restartExistingDraft.
export interface ResolveDraftInput extends OnboardingAccountInput {
  existingUserId: string;
}

export interface ResumeSignupResponse extends AuthTokens {
  user: SafeUser;
  organisation: SafeOrganisation | null;
  onboardingStep: OnboardingStep;
  nextStep: OnboardingStep;
  subscription: { planId: string; billingCycle: string } | null;
  templateIds: string[];
  email_verification_required?: boolean;
}

export interface OnboardingOrganisationInput {
  company_name: string;
  industry?: OrgIndustry;
  teamSize?: string;
  subdomain?: string;
  custom_domain?: string;
  country?: string;
  currency?: string;
  timezone?: string;
}

export interface OrganisationStepResponse extends AuthTokens {
  organisation: SafeOrganisation;
  user: SafeUser;
  onboardingStep: OnboardingStep;
  nextStep: OnboardingStep;
}

export interface OnboardingStepResult {
  onboardingStep: OnboardingStep;
  nextStep: OnboardingStep;
}

// /onboarding/complete has no "next" wizard step — instead it reports
// whether the org is actually usable yet, so the frontend can show a
// holding screen for a still-pending org instead of a dashboard that
// 403s on its first real request (see backend OrgApprovedGuard).
export interface CompleteOnboardingResult {
  onboardingStep: OnboardingStep;
  organisationStatus: string;
}

export interface BusinessDetailsInput {
  city?: string;
  reraLicenseNo?: string;
  gstin?: string;
  brandColour?: string;
  logoUrl?: string;
}

export interface BusinessDetailsStepResponse extends OnboardingStepResult {
  organisation: SafeOrganisation;
}

export interface SubscriptionStepInput {
  planId: string;
  billingCycle?: "monthly" | "yearly";
}

export interface SubscriptionStepResponse extends OnboardingStepResult {
  subscription: { id: string; planId: string; billingCycle: string };
}

export interface TemplatesStepInput {
  templateIds: string[];
}

export interface TemplatesStepResponse extends OnboardingStepResult {
  templateIds: string[];
}

export interface ModulesStepInput {
  enabledModules?: string[];
  skip?: boolean;
}

export interface ModulesStepResponse extends OnboardingStepResult {
  enabledModules: string[];
}

export interface InviteEntry {
  email: string;
  role: string;
}

export interface InviteStepInput {
  invites: InviteEntry[];
}

export interface InviteStepResponse extends OnboardingStepResult {
  sent: unknown[];
  failed: { email: string; reason: string }[];
}

export interface LogoUploadUrlInput {
  filename: string;
  contentType: string;
  size: number;
}

export interface LogoUploadUrlResult {
  uploadUrl: string;
  publicUrl: string;
  key: string;
  expiresIn: number;
}

export interface SignupInput {
  first_name: string;
  last_name: string;
  company_name: string;
  work_email: string;
  phone_number: string;
  city: string;
  country: string;
  currency: string;
  timezone: string;
  password: string;
  planId?: string;
  billingCycle?: "monthly" | "yearly";
  templateIds?: string[];
  subdomain?: string;
  custom_domain?: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export type UserRole = "super_admin" | "organisation_admin" | "team_member";

export type PermissionAction = "view" | "add" | "edit" | "delete" | "approve";

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

/** Shape returned by GET /auth/me — the logged-in user plus their organisation. */
export interface UserProfile {
  user: SafeUser;
  organisation: SafeOrganisation | null;
}

export interface ChangePasswordInput {
  current_password: string;
  new_password: string;
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
  subdomain: string | null;
  subdomainHost: string | null;
  subdomainStatus: string;
  customDomain: string | null;
  customDomainStatus: string;
  adminName: string | null;
  adminEmail: string | null;
  adminPhone: string | null;
  status: "active" | "disabled" | "pending" | "rejected" | "draft";
  rejectionReason?: string | null;
  createdAt: string;
  userCount: number;
  teamCount: number;
  templatesCount: number;
  plan: {
    id: string;
    name: string;
    slug: string;
    badge: string;
    billingCycle?: string;
    amount?: number;
  } | null;
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
  disabled?: number;
  draft?: number;
  onTrial: null;
  suspended: null;
}

export interface OrganisationDetail {
  id: string;
  name: string;
  slug: string;
  city: string;
  subdomain: string | null;
  subdomainHost: string | null;
  subdomainStatus: string;
  customDomain: string | null;
  customDomainStatus: string;
  status: "active" | "disabled" | "pending" | "draft" | "rejected";
  rejectionReason?: string | null;
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

export type OrgUserAssignableRole = string;
export type OrgUserStatus = "active" | "disabled";

export interface OrgUserRole {
  key: string;
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
  role: string;
  password?: string;
}

export interface UpdateOrgUserInput {
  firstName?: string;
  lastName?: string;
  email?: string;
  phoneNumber?: string;
  role?: string;
  password?: string;
}

export interface DynamicRole {
  id: string;
  key: string;
  name: string;
  description: string | null;
  scope: "platform" | "organisation" | "team";
  status: "active" | "inactive";
  sortOrder: number;
  _count?: { userRoles: number };
}

export interface OrgDashboardKpiData {
  role: string;
  period: string;
  kpis: {
    totalLeads: number;
    periodChangePercent: number;
    wonLeads: number;
    wonRevenue: number;
    activePipelineRevenue: number;
    conversionRate: number;
    totalCalls: number;
    connectedCalls: number;
    callConnectRate: number;
    totalTalkTimeSeconds: number;
    siteVisitsBooked: number;
  };
  pipelineBreakdown: { status: string; label: string; count: number }[];
  callOutcomes: { outcome: string; label: string; count: number }[];
  projectMetrics: {
    projectId: string;
    projectName: string;
    leadsCount: number;
    wonCount: number;
    revenue: number;
  }[];
  agentLeaderboard: {
    userId: string;
    name: string;
    email: string;
    role: string;
    leadsCount: number;
    wonCount: number;
    revenue: number;
    callsCount: number;
    conversionRate: number;
  }[];
  recentActivity: {
    id: string;
    type: string;
    text: string;
    createdAt: string;
  }[];
  inventorySummary?: {
    totalProjects: number;
    activeProjects: number;
    totalUnits: number;
    unitsAvailable: number;
    unitsBooked: number;
    unitsHeld: number;
    portfolioOccupancyRate: number;
    inventoryValueAvailable: number;
    inventoryValueSold: number;
    projects: {
      id: string;
      name: string;
      status: string;
      location: string;
      priceMin?: number | null;
      priceMax?: number | null;
      currency: string;
      towerCount?: number | null;
      floorsDescription?: string | null;
      landArea?: number | null;
      possession?: string | null;
      reraId?: string | null;
      coverImageUrl?: string | null;
      totalUnitsPlanned: number;
      unitsCreated: number;
      unitsAvailable: number;
      unitsBooked: number;
      unitsHeld: number;
      occupancyPct: number;
      inventoryValueAvailable: number;
      inventoryValueSold: number;
      unitTypesCount: number;
      configurations: string;
    }[];
  };
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
  billingCycle: "monthly" | "yearly";
  status: "active" | "past_due" | "trial" | "cancelled" | "paused";
  amount: number;
  currency: string;
  mrr: number | null;
  renewsAt: string | null;
  startedAt: string;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
  organisation: { id: string; name: string; city: string; slug: string } | null;
  plan: {
    id: string;
    name: string;
    slug: string;
    priceMonthly: number;
    priceYearly: number;
    color: string;
    badge: string;
    isPopular: boolean;
  } | null;
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
  distribution: {
    planId: string;
    planName: string;
    badge: string;
    count: number;
    pct: number;
  }[];
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
  billingCycle?: "monthly" | "yearly";
  status?: string;
  currency?: string;
  renewsAt?: string;
}

export interface UpdateSubscriptionInput {
  planId?: string;
  billingCycle?: "monthly" | "yearly";
  status?: "active" | "past_due" | "trial" | "cancelled" | "paused";
  currency?: string;
  renewsAt?: string;
}

// --- Landing pages: org-owned copies made from an assigned template ---
export type LandingPageStatus =
  | "draft"
  | "pending_approval"
  | "approved"
  | "rejected"
  | "published"
  | "unpublished";

export interface LandingPageRow {
  id: string;
  name: string;
  slug: string;
  status: LandingPageStatus;
  thumbnail: string | null;
  pageType: "landing" | "thank_you";
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
  status: "active" | "past_due" | "trial" | "cancelled" | "paused";
  billingCycle: "monthly" | "yearly";
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

// POST /org/billing/plan — org-self-service upgrade / downgrade
export interface ChangePlanInput {
  planId: string;
  billingCycle?: "monthly" | "yearly";
}

export interface ChangePlanResult {
  id: string;
  planId: string;
  planName: string;
  billingCycle: "monthly" | "yearly";
  status: string;
  amount: number;
  currency: string;
  renewsAt: string | null;
  startedAt: string;
}

// GET /org/billing/invoices — derived from the active subscription (no payment
// provider exists yet, so invoices are generated from the billing cycle).
export interface InvoiceRow {
  id: string;
  number: string;
  issuedAt: string;
  dueAt: string;
  amount: number;
  currency: string;
  billingCycle: "monthly" | "yearly";
  status: "paid" | "pending";
  planName: string;
}

// --- Projects & inventory (org-scoped) ---
// All money fields are integer rupees. `landArea` is acres. `possession` is
// deliberately free text ("Dec 2027"); `manager` is a free-text name, not a
// user id.
export type ProjectStatus = "active" | "inactive";
export type UnitStatus = "available" | "booked" | "held" | "sold";

export interface Amenity {
  name: string;
  /** Public R2 URL from POST /org/projects/upload-url, or null. */
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
  carpetRange: string | null;
  amenities: Amenity[];
  // --- Onboarding-wizard fields (Steps 3-8). Persisted by the backend as of
  // Piece A; the wizard wires them progressively in Pieces B-E. ---
  bookingAmount: number | null;
  currency: string;
  priceIncludes: string[];
  paymentPlan: string | null;
  offers: string | null;
  addressLine: string | null;
  city: string | null;
  locality: string | null;
  pincode: string | null;
  latitude: number | null;
  longitude: number | null;
  connectivity: string[];
  landmarks: string | null;
  /** Loose preference blob: { flooring, kitchen, doorsWindows, fittings, notes } */
  specifications: Record<string, unknown> | null;
  /** Loose preference blob: ad sources, budgets, lead goal, automation flags */
  marketing: Record<string, unknown> | null;
  requireBookingApproval: boolean;
  visibleToTelecallers: boolean;
  publishedToWebsite: boolean;
  coverImageUrl: string | null;
  galleryUrls: string[];
  brochureUrl: string | null;
  reraCertificateUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EnquiryUnit {
  id: string;
  unitNo: string;
  configuration: string | null;
  variantLabel: string | null;
  carpetSqft: number | null;
  builtupSqft: number | null;
  tower: string | null;
  floor: number | null;
  facing: string | null;
  price: number | null;
  status: string;
}

export interface PublicProject extends Project {
  /** Available units for this project (a unit belongs straight to the project now). */
  units: EnquiryUnit[];
  /** Planned unit mix. */
  unitTypes: Array<{ id: string; name: string }>;
}

export interface ProjectListRow extends Project {
  unitTypeCount: number;
}

/** A sales user assigned to a project (GET/PUT /org/projects/:id/sales-agents). */
export interface ProjectSalesAgent {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  name: string;
  assignedAt: string;
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
  soldUnits: number;
  createdAt: string;
  updatedAt: string;
}

export interface Unit {
  id: string;
  orgId: string;
  /** Null for a standalone unit (no project). */
  projectId: string | null;
  /** A `unit_type` catalog label. Null only on legacy/imported rows. */
  configuration: string | null;
  /** Optional free-text variant label ("Type A"). Not a catalog. */
  variantLabel: string | null;
  unitNo: string;
  carpetSqft: number | null;
  builtupSqft: number | null;
  /** Optional — null for projects with no tower concept (villas, plots). */
  tower: string | null;
  floor: number | null;
  facing: string | null;
  /** Free text as entered on the form ("1 covered", "2 covered", "Open"). */
  parking: string | null;
  price: number | null;
  /** Standalone-listing-only (null for project units). */
  addressLine: string | null;
  ownerName: string | null;
  notes: string | null;
  /** Public R2 URLs. */
  floorPlanUrl: string | null;
  galleryUrls: string[];
  status: UnitStatus;
  createdAt: string;
  updatedAt: string;
}

/** One configuration present on a project's units, with its status breakdown. */
export interface ProjectConfigurationRollup {
  label: string;
  total: number;
  available: number;
  booked: number;
  held: number;
  sold: number;
}

export interface ProjectDetail extends Project {
  unitTypes: UnitType[];
  /** Distinct configurations actually on the project's units (superset of unitTypes names). */
  configurations: ProjectConfigurationRollup[];
  rollup: {
    totalUnitsPlanned: number;
    unitsCreated: number;
    unitsAvailable: number;
    unitsBooked: number;
    unitsHeld: number;
    unitsSold: number;
  };
  /** User ids of the assigned sales agents (full objects via the dedicated endpoint). */
  salesAgentIds: string[];
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
  carpetRange?: string;
  amenities?: Amenity[];
  // Onboarding-wizard fields (Steps 3-8) — all optional; wired progressively
  // by Pieces B-E. `null` is accepted on update to clear a field.
  bookingAmount?: number;
  currency?: "INR" | "AED" | "USD";
  priceIncludes?: string[];
  paymentPlan?: string;
  offers?: string;
  addressLine?: string;
  city?: string;
  locality?: string;
  pincode?: string;
  latitude?: number;
  longitude?: number;
  connectivity?: string[];
  landmarks?: string;
  specifications?: Record<string, unknown>;
  marketing?: Record<string, unknown>;
  requireBookingApproval?: boolean;
  visibleToTelecallers?: boolean;
  publishedToWebsite?: boolean;
  coverImageUrl?: string;
  galleryUrls?: string[];
  brochureUrl?: string;
  reraCertificateUrl?: string;
}

// Every field optional. Nullable columns also accept an explicit `null` to
// clear them (mirrors the backend UpdateProjectDto). Arrays clear with `[]`,
// the JSON blobs with `{}`.
export interface UpdateProjectInput {
  name?: string;
  location?: string | null;
  reraId?: string | null;
  possession?: string | null;
  managerId?: string | null;
  status?: ProjectStatus;
  priceMin?: number | null;
  priceMax?: number | null;
  baseRate?: number | null;
  landArea?: number | null;
  towerCount?: number | null;
  floorsDescription?: string | null;
  carpetRange?: string | null;
  amenities?: Amenity[];
  bookingAmount?: number | null;
  currency?: "INR" | "AED" | "USD";
  priceIncludes?: string[];
  paymentPlan?: string | null;
  offers?: string | null;
  addressLine?: string | null;
  city?: string | null;
  locality?: string | null;
  pincode?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  connectivity?: string[];
  landmarks?: string | null;
  specifications?: Record<string, unknown>;
  marketing?: Record<string, unknown>;
  requireBookingApproval?: boolean;
  visibleToTelecallers?: boolean;
  publishedToWebsite?: boolean;
  coverImageUrl?: string | null;
  galleryUrls?: string[];
  brochureUrl?: string | null;
  reraCertificateUrl?: string | null;
}

// --- Org custom catalogs (project onboarding wizard option lists) ---
// Org-managed, pre-created option lists the project wizard picks from — one
// generic row shape keyed by `category`. Picked values are copied onto a
// project's own fields at creation time; nothing references these rows, so
// editing or deleting one never affects an existing project.
export type OrgCatalogCategory =
  "project_type" | "unit_type" | "connectivity" | "amenity";

export interface OrgCatalogOption {
  id: string;
  orgId: string;
  category: OrgCatalogCategory;
  label: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOrgCatalogOptionInput {
  category: OrgCatalogCategory;
  label: string;
  sortOrder?: number;
}

export interface UpdateOrgCatalogOptionInput {
  label?: string;
  sortOrder?: number;
}

export interface CreateUnitTypeInput {
  name: string;
  carpetSqft?: number;
  builtupSqft?: number;
  price?: number;
  totalUnits?: number;
  floorPlanUrl?: string | null;
  brochureUrl?: string | null;
  videoUrl?: string | null;
  galleryUrls?: string[];
}

export type UpdateUnitTypeInput = Partial<CreateUnitTypeInput>;

export interface CreateUnitInput {
  /** A `unit_type` catalog label — required, validated server-side. */
  configuration: string;
  /** Optional free-text variant label. */
  variantLabel?: string;
  unitNo: string;
  carpetSqft?: number;
  builtupSqft?: number;
  tower?: string;
  floor?: number;
  facing?: string;
  parking?: string;
  price?: number;
  status?: UnitStatus;
  /** Standalone-listing fields. */
  addressLine?: string;
  ownerName?: string;
  notes?: string;
  /** Media — public R2 URLs. */
  floorPlanUrl?: string;
  galleryUrls?: string[];
}

export type UpdateUnitInput = Partial<
  Omit<
    CreateUnitInput,
    | "tower"
    | "parking"
    | "variantLabel"
    | "carpetSqft"
    | "builtupSqft"
    | "facing"
    | "price"
    | "addressLine"
    | "ownerName"
    | "notes"
    | "floorPlanUrl"
  >
> & {
  /** value to set, or explicit null to clear. */
  tower?: string | null;
  parking?: string | null;
  variantLabel?: string | null;
  carpetSqft?: number | null;
  builtupSqft?: number | null;
  facing?: string | null;
  price?: number | null;
  addressLine?: string | null;
  ownerName?: string | null;
  notes?: string | null;
  floorPlanUrl?: string | null;
  galleryUrls?: string[];
};

/** One row of the cross-project "All Units" list (GET /org/units). */
export interface OrgUnitRow {
  id: string;
  unitNo: string;
  configuration: string | null;
  variantLabel: string | null;
  carpetSqft: number | null;
  builtupSqft: number | null;
  tower: string | null;
  floor: number | null;
  facing: string | null;
  parking: string | null;
  price: number | null;
  status: UnitStatus;
  createdAt: string;
  updatedAt: string;
  /** Null for a standalone unit. */
  project: { id: string; name: string; currency: string } | null;
}

export interface OrgUnitsListResponse {
  data: OrgUnitRow[];
  total: number;
  page: number;
  limit: number;
  /** Status breakdown for the current filter set, ignoring pagination. */
  counts: { available: number; booked: number; held: number; sold: number };
}

export interface LeadSubmission {
  /** Landing page id the form belongs to (used server-side to attribute the org). */
  landingPageId?: string;
  /** Project this enquiry is about — lead will be linked to it. */
  projectId?: string;
  /** Specific available unit selected in the project enquiry form. */
  unitId?: string;
  /** Human name of the form (Form Builder "name" field). */
  formName?: string;
  /** Where the submission came from. */
  source?: string;
  /** Captured field values, keyed by field label. */
  fields: Record<string, string>;
}

// --- CRM leads (org-scoped inbox, role-aware) ---
export type CrmLeadStatus =
  | "new"
  | "contacted"
  | "follow_up"
  | "site_visit"
  | "negotiation"
  | "won"
  | "lost";

export interface CrmAssignee {
  id: string;
  name: string;
}

export interface CrmLead {
  id: string;
  orgId?: string;
  landingPageId: string | null;
  projectId: string | null;
  project: { id: string; name: string } | null;
  formName: string | null;
  source: string | null;
  data: Record<string, unknown>;
  status: CrmLeadStatus;
  assignedTo: CrmAssignee | null;
  createdAt: string;
  activities?: Array<{
    id: string;
    type: string;
    text: string;
    createdAt: string;
  }>;
  callLogs?: Array<{
    id: string;
    direction: string;
    outcome: string;
    durationSeconds: number;
    createdAt: string;
  }>;
  nextAction?: {
    type: string;
    scheduledAt: string | null;
    note: string | null;
    reminderAt: string | null;
  } | null;
}

export interface CrmLeadActivity {
  id: string;
  type: string;
  text: string;
  createdAt: string;
}

export interface CrmLeadListResponse {
  data: CrmLead[];
  total: number;
  page?: number;
  limit?: number;
}

export interface GetCrmLeadsParams {
  projectId?: string;
  status?: CrmLeadStatus;
  source?: string;
  assignedToId?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface CrmAssignableUser {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  name: string;
  role: { key: string; name: string } | null;
}

export interface CrmAssignableResponse {
  data: CrmAssignableUser[];
  total: number;
}

export interface AssignLeadInput {
  assignedToId?: string | null;
  status?: CrmLeadStatus;
}

// --- Sales agents (org CRM team dashboard) ---

export interface SalesAgentPipelineStage {
  status: CrmLeadStatus;
  count: number;
}

export interface SalesAgentSource {
  source: string | null;
  count: number;
}

export interface SalesAgentStats {
  leadsAssigned: number;
  activeLeads: number;
  closures: number;
  lost: number;
  conversion: number;
  revenueBooked: number;
  pipeline: SalesAgentPipelineStage[];
  sources: SalesAgentSource[];
}

export interface SalesAgent {
  id: string;
  name: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  phoneNumber: string | null;
  role: { key: string; name: string } | null;
  status: "active" | "disabled";
  online: boolean;
  bridgeMissing: boolean;
  joinedAt: string;
  rank: number;
  stats: SalesAgentStats;
}

export interface SalesAgentsSnapshot {
  agents: number;
  online: number;
  missingPhone: number;
}

export interface SalesAgentsListResponse {
  total: number;
  snapshot: SalesAgentsSnapshot;
  data: SalesAgent[];
}

export interface SalesAgentRecentLead {
  id: string;
  formName: string | null;
  source: string | null;
  status: CrmLeadStatus;
  data: Record<string, unknown>;
  budget: number;
  createdAt: string;
}

export type SalesAgentCallDirection = "outgoing" | "incoming";

export interface SalesAgentComms {
  callsMade: number;
  connected: number;
  connectRate: number;
  talkSeconds: number;
  avgCallSeconds: number;
  whatsappSent: number;
  whatsappRead: number;
  whatsappReadPct: number;
}

export interface SalesAgentCall {
  id: string;
  leadId: string | null;
  leadName: string | null;
  direction: SalesAgentCallDirection;
  outcome:
    "connected" | "booked_visit" | "callback" | "no_answer" | "missed" | "busy";
  durationSeconds: number;
  createdAt: string;
}

export type SalesAgentActivityType =
  | "closed_deal"
  | "site_visit_booked"
  | "call_logged"
  | "whatsapp_sent"
  | "whatsapp_read"
  | "note_added"
  | "status_updated"
  | "logged_in";

export interface SalesAgentActivity {
  id: string;
  type: SalesAgentActivityType;
  text: string;
  createdAt: string;
}

export interface SalesAgentTargets {
  revenueCr: number;
  revenueTargetCr: number;
  closures: number;
  targetClosures: number;
  siteVisits: number;
  siteVisitTarget: number;
  leadsWorked: number;
  leadsWorkedTarget: number;
}

export interface SalesAgentDayBar {
  day: string;
  leads: number;
  calls: number;
}

export interface SalesAgentDetailResponse {
  agent: SalesAgent;
  totalAgents: number;
  recentLeads: SalesAgentRecentLead[];
  comms: SalesAgentComms;
  calls: SalesAgentCall[];
  activity: SalesAgentActivity[];
  targets: SalesAgentTargets;
  activity14: SalesAgentDayBar[];
}

// --- Organisation domain identity (subdomain + custom domain) ---

export type OrgDomainKind = "subdomain" | "custom_domain";
export type OrgDomainRequestStatus =
  "pending" | "approved" | "rejected" | "connected";

export interface OrgDomainRequest {
  id: string;
  kind: OrgDomainKind;
  subdomain: string | null;
  customDomain: string | null;
  landingPageId: string | null;
  landingPage?: { id: string; name: string; slug: string } | null;
  status: OrgDomainRequestStatus;
  requestedAt: string;
  reviewedAt: string | null;
  rejectionReason: string | null;
}

/** A landing page the org can target with its primary custom domain. */
export interface OrgDomainLandingPage {
  id: string;
  name: string;
  slug: string;
  status: string;
  pageType?: string;
  sourceTemplate?: { name: string } | null;
}

/** GET /org/domain — the organisation's own subdomain/custom-domain identity. */
export interface OrgDomainInfo {
  subdomain: string | null;
  subdomainHost: string | null;
  subdomainStatus: string;
  customDomain: string | null;
  customDomainStatus: string;
  customDomainLandingPageId: string | null;
  landingPages: OrgDomainLandingPage[];
  requests: OrgDomainRequest[];
}

export interface RequestCustomDomainInput {
  domain: string;
  /** Which landing page (template) the custom domain should serve. */
  landingPageId?: string;
}

/** A DNS record pair shown to the Super Admin (e.g. the wildcard A record). */
export interface DnsRecordSpec {
  type: string;
  host: string;
  value: string;
  ttl: string;
  purpose: string;
}

/** GET /admin/org-domain-requests row (subdomain or custom-domain request). */
export interface AdminOrgDomainRequest extends OrgDomainRequest {
  subdomainHost?: string | null;
  dnsInstructions?: DnsRecordSpec[] | null;
  organisation: {
    id: string;
    name: string;
    slug: string;
    subdomain: string | null;
    customDomain: string | null;
  };
}

export interface AdminOrgDomainRequestListResponse {
  data: AdminOrgDomainRequest[];
  total: number;
  page: number;
  limit: number;
  baseDomain?: string;
  dnsInstructions?: DnsRecordSpec[];
  dnsMode?: string;
}

export interface ReviewOrgDomainRequestInput {
  action: "approve" | "reject";
  reason?: string;
}

/** GET /admin/platform-config — Super Admin platform subdomain / DNS config. */
export interface PlatformConfig {
  id: string | null;
  subdomainMode: string; // localhost | production
  subdomainBase: string | null; // e.g. "ipixxel.ae"
  dnsMode: string; // a | cname | ns
  infraIp: string | null; // AWS origin IPv4 (for the wildcard A record)
  infraIpv6: string | null;
  infraCname: string | null;
  infraNs1: string | null;
  infraNs2: string | null;
  updatedAt: string | null;
}

export interface UpdatePlatformConfigInput {
  subdomainMode?: "localhost" | "production";
  subdomainBase?: string;
  dnsMode?: "a" | "cname" | "ns";
  infraIp?: string;
  infraIpv6?: string;
  infraCname?: string;
  infraNs1?: string;
  infraNs2?: string;
}

/** GET /admin/org-domain-requests/:id/verify — live DNS + site check for an org subdomain. */
export interface SubdomainVerifyResult {
  id: string;
  subdomain: string;
  host: string;
  baseDomain: string;
  dnsMode: string;
  expectedIp: string | null;
  organisation: {
    id: string;
    name: string;
    slug: string;
    status: string;
    subdomainStatus: string;
  };
  dns: {
    status: "ok" | "mismatch" | "unresolved";
    hostIps: string[];
    baseIps: string[];
    expectedIp: string | null;
  };
  landingPage: {
    id: string;
    slug: string;
    name: string;
    status: string;
  } | null;
  live: boolean;
}

// --- In-app notifications (Super Admin bell) ---

export type NotificationType =
  | "organisation_registration"
  | "subdomain_request"
  | "custom_domain_request"
  | "organisation_approved"
  | "organisation_rejected";

export interface AppNotification {
  id: string;
  orgId: string | null;
  recipientId: string | null;
  type: NotificationType;
  title: string;
  body: string | null;
  entity: string | null;
  entityId: string | null;
  readAt: string | null;
  createdAt: string;
  organisation: {
    id: string;
    name: string;
    slug: string;
    subdomain: string | null;
  } | null;
}

export interface NotificationsListResponse {
  data: AppNotification[];
  total: number;
  page: number;
  limit: number;
}

export interface UnreadNotificationsResponse {
  count: number;
}

/** GET /auth/subdomain-availability — live check for the signup form. */
export interface SubdomainAvailability {
  subdomain: string;
  host: string;
  available: boolean;
  reasons: string[];
  suggestions: string[];
}

// --- Super Admin SMTP Email Configuration & Logs ---

export interface SmtpConfig {
  id: string | null;
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password?: string;
  hasPassword?: boolean;
  fromEmail: string;
  fromName: string;
  replyTo?: string | null;
  isActive: boolean;
  inviteSubject?: string | null;
  inviteBody?: string | null;
  resetSubject?: string | null;
  resetBody?: string | null;
  updatedAt?: string;
}

export interface UpdateSmtpConfigInput {
  host: string;
  port: number;
  secure: boolean;
  user?: string;
  password?: string;
  fromEmail: string;
  fromName: string;
  replyTo?: string;
  isActive?: boolean;
  inviteSubject?: string;
  inviteBody?: string;
  resetSubject?: string;
  resetBody?: string;
}

export interface SendTestEmailInput {
  to: string;
  subject?: string;
}

export interface EmailLogEntry {
  id: string;
  to: string;
  subject: string;
  template: string | null;
  status: "sent" | "failed";
  error: string | null;
  metadata?: any;
  sentAt: string;
}

export interface EmailLogsResponse {
  data: EmailLogEntry[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface EmailStatsResponse {
  totalSent: number;
  totalFailed: number;
  totalDispatched: number;
  lastDispatchedAt: string | null;
}

// --- Super Admin Dashboard Data Types ---

export interface AdminDashboardStats {
  totalOrgs: number;
  activeOrgs: number;
  newOrgsThisMonth: number;
  newOrgsLastMonth: number;
  activeSubscriptions: number;
  paidPercentage: number;
  platformMrr: number;
  platformMrrLakhs: number;
  templatesLive: number;
  templatesTotal: number;
  pendingTemplatesCount: number;
}

export interface AdminDashboardRevenueMonth {
  m: string;
  mrr: number;
  total: number;
  h: string;
  g: string;
}

export interface AdminDashboardOrgRow {
  id: string;
  name: string;
  sm: string;
  av: string;
  tone: string;
  plan: string;
  planTxt: string;
  users: number;
  status: string;
  statusTxt: string;
  joined: string;
}

export interface AdminDashboardPendingRequest {
  id: string;
  name: string;
  amt: string;
  desc: string;
  orgId: string;
  status: string;
}

export interface AdminDashboardResponse {
  stats: AdminDashboardStats;
  revenueTimeline: AdminDashboardRevenueMonth[];
  recentOrganisations: AdminDashboardOrgRow[];
  pendingRequests: AdminDashboardPendingRequest[];
}
