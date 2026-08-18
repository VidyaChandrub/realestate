// Auth
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  roles: string[];
  organization?: {
    id: string;
    name: string;
  } | null;
}

export interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isLoggingOut: boolean;
  token: string | null;
  refreshToken: string | null;
  idToken: string | null;
  setUser: (user: AuthUser | null) => void;
  setToken: (token: string | null) => void;
  setTokens: (token: string | null, refreshToken: string | null, idToken: string | null) => void;
  setLoading: (loading: boolean) => void;
  startLogout: () => void;
  logout: () => void;
}

// Generic API wrapper
export interface ApiResponse<T> {
  success: boolean;
  data: T;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface AdminListResponse<T> {
  success: boolean;
  data: T[];
  total?: number;
  page?: number;
  limit?: number;
}

export interface MasterDataPaginatedResponse {
  items: MasterDataItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface OthersSpecializationReport {
  value: string;
  type: string;
  slug: string;
  parent: string;
  parentId: string | null;
  usageCount: number;
}

export interface PaginatedOthersSpecializationReport {
  items: OthersSpecializationReport[];
  page: number;
  limit: number;
  total: number;
}

export interface OthersSpecializationsSyncStatus {
  lastSyncDate?: string | null;
  lastSyncUpdatedCount: number;
}

export interface PaginationParams {
  page: number;
  limit: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Users (matches real API)
export interface User {
  id: string;
  userId: string;
  email: string;
  fullName: string;
  firstName: string;
  lastName: string;
  phoneNumber: string | null;
  mobileNumber: string | null;
  gender: string | null;
  dateOfBirth: string | null;
  bio: string | null;
  avatarUrl: string | null;
  userType: string;
  companyName: string | null;
  jobTitle: string | null;
  organizationId?: string | null;
  organizationName?: string | null;
  organizationEmail?: string | null;
  organizationPhone?: string | null;
  website?: string | null;
  industry?: string | null;
  companySize?: string | null;
  location?: string | null;
  status?: string | null;
  profileComplete: boolean;
  profileCompletionPercentage: number;
  currentJobTitle?: string | null;
  currentCompanyName?: string | null;
  totalExperienceMonths?: number | null;
  preferredWorkMode?: 'ONSITE' | 'REMOTE' | 'HYBRID' | string | null;
  availableJoiningDate?: string | null;
  shiftPreference?: 'DAY' | 'NIGHT' | string | null;
  skills?: Array<{ masterDataId?: string | null; name?: string | null; value?: string | null; label?: string | null }> | string[] | null;
  education?: unknown[] | null;
  experience?: unknown[] | null;
  documents?: unknown[] | null;
  currentCityId?: string | null;
  stateId?: string | null;
  countryId?: string | null;
  highestQualificationId?: string | null;
  currentCity?: string | null;
  state?: string | null;
  country?: string | null;
  preferredLocations?: Array<{
    locationId: string;
    location: string;
  }>;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
  notificationSettings: { push: boolean; email: boolean };
  preferences: {
    realm?: string;
    roles?: string[];
    tokenIssuedAt?: number;
    tokenExpiresAt?: number;
    [key: string]: any;
  } | null;
}

// Employers (matches real API)
export interface Employer {
  id: string;
  name: string;
  description: string | null;
  industry: string | null;
  logoUrl: string | null;
  website: string | null;
  foundedYear: number | null;
  companySize: string | null;
  type: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  country: string | null;
  state: string | null;
  city: string | null;
  address: string | null;
  postalCode: string | null;
  // Contact details of the employer user who created this organization (OWNER membership).
  creatorEmail?: string | null;
  creatorMobileNumber?: string | null;
  creatorName?: string | null;
  verificationStatus: string;
  isFeatured: boolean;
  isApproved: boolean;
  isSuspended: boolean;
  isDeleted: boolean;
  jobsCount: number;
  employeesCount: number;
  benefits: string[];
  createdAt: string;
  updatedAt: string;
  _count?: { users: number; jobs: number };
}

// Jobs (matches real API)
export interface Job {
  id: string;
  organizationId: string;
  title: string;
  description: string;
  summary: string | null;
  categoryId: string | null;
  locationId: string | null;
  workMode: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  employmentTypeId: string | null;
  status: string;
  jobType: string;
  externalUrl?: string | null;
  publishedAt: string | null;
  expiresAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
  backgroundImage: string | null;
  organization?: { id: string; name: string };
  externalClickCount?: number;
  _count?: { applications: number };
}

// Applications
export interface UpdateUserProfileRequest {
  firstName: string;
  lastName: string;
  phoneNumber: string;
}

export interface Application {
  id: string;
  jobId: string;
  userId: string;
  status: string;
  appliedAt: string;
  job?: { title: string };
  user?: {
    fullName?: string;
    email?: string;
    mobileNumber?: string | null;
    currentCityId?: string | null;
    stateId?: string | null;
    countryId?: string | null;
    experienceLevelId?: string | null;
    highestQualificationId?: string | null;
    skills?: { masterDataId: string | null }[];
    education?: { yearOfPassing: number }[];
  };
}

// Events (matches real API)
export interface EventTag {
  id: string;
  value: string;
}

export interface Event {
  id: string;
  organizationId: string;
  title: string;
  description: string;
  categoryId: string | null;
  mode: string;
  locationId: string | null;
  meetingUrl: string | null;
  isMeetingUrlPublished: boolean;
  registrationType: string;
  externalRegistrationUrl: string | null;
  capacity: number | null;
  registeredCount?: number;
  externalClickCount?: number;
  startDate: string;
  endDate: string;
  status: string;
  bannerImage: string | null;
  tags?: EventTag[];
  tagIds?: string[];
  tags_ids?: string[];
  isFree: boolean;
  price: string | null;
  isSponsored: boolean;
  sponsorCampaignId: string | null;
  boostScore: number;
  createdAt: string;
  updatedAt: string;
}

export interface EventRegistration {
  id: string;
  userId: string;
  status: string;
  registeredAt: string;
  user?: {
    id: string;
    fullName: string;
    email: string;
  };
}

export interface EventRegistrationsResponse {
  success?: boolean;
  data: EventRegistration[];
  total?: number;
  page?: number;
  limit?: number;
}

export interface ExternalClickRow {
  id: string;
  clickedAt: string;
  user: { fullName: string | null; email: string | null } | null;
}

// Advertisements (matches real API)
export enum AdPlacement {
  DASHBOARD_BANNER = 'DASHBOARD_BANNER',
  JOB_LISTING = 'JOB_LISTING',
  SIDEBAR = 'SIDEBAR',
  OTHER = 'OTHER',
}

export enum AdStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  EXPIRED = 'EXPIRED',
  COMPLETED = 'COMPLETED',
  DRAFT = 'DRAFT',
}

export enum AdDisplayType {
  BANNER = 'BANNER',
  CARD = 'CARD',
}

export enum AdCtaButtonStyle {
  FILLED = 'FILLED',
  OUTLINE = 'OUTLINE',
  GHOST = 'GHOST',
  TEXT = 'TEXT',
}

export enum AdCtaButtonSize {
  SMALL = 'SMALL',
  MEDIUM = 'MEDIUM',
  LARGE = 'LARGE',
}

export enum AdCtaButtonPlacement {
  BOTTOM_LEFT = 'BOTTOM_LEFT',
  BOTTOM_CENTER = 'BOTTOM_CENTER',
  BOTTOM_RIGHT = 'BOTTOM_RIGHT',
  TOP_LEFT = 'TOP_LEFT',
  TOP_CENTER = 'TOP_CENTER',
  TOP_RIGHT = 'TOP_RIGHT',
}

export interface AdvertisementMedia {
  id: string;
  advertisementId: string;
  mediaUrl: string;
  mediaType: 'IMAGE' | 'VIDEO' | 'HTML';
  order: number;
  thumbnailUrl: string | null;
  altText: string | null;
}

export interface Advertisement {
  id: string;
  title: string;
  description: string | null;
  media?: AdvertisementMedia[];
  redirectUrl: string | null;
  ctaText: string | null;
  ctaTextColor: string | null;
  ctaBackgroundColor: string | null;
  ctaButtonStyle: AdCtaButtonStyle | null;
  ctaButtonSize: AdCtaButtonSize | null;
  ctaButtonPlacement: AdCtaButtonPlacement | null;
  startDateTime: string;
  endDateTime: string;
  placement: AdPlacement;
  priority: number;
  status: AdStatus;
  displayType: AdDisplayType;
  clickCount: number;
  _count?: {
    clicks: number;
  };
  countryIds?: string[];
  stateIds?: string[];
  cityIds?: string[];
  skillIds?: string[];
  experienceLevelIds?: string[];
  educationLevelIds?: string[];
  yearOfPassing?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdvertisementClick {
  id: string;
  advertisementId: string;
  userId: string;
  userName: string;
  email: string;
  mobileNumber: string | null;
  locationId: string | null;
  skillIds: string[];
  experienceLevelId: string | null;
  educationLevelId: string | null;
  clickedAt: string;
  metadata: any;
  user?: User;
}

// Campaigns (matches real API)
export interface Campaign {
  id: string;
  organizationId: string;
  name: string;
  type: string;
  entityType: string;
  entityId: string;
  pricingModel: string;
  status: string;
  budgetTotal: string;
  budgetSpent: string;
  costPerClick: string | null;
  costPerThousandImpressions: string | null;
  flatFee: string | null;
  dailyLimit: string | null;
  startDate: string;
  endDate: string;
  boostScore: number;
  isArchived: boolean;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
}

// Master Data (matches real API)
export interface MasterDataItem {
  id: string;
  type: string;
  value: string;
  slug: string;
  description: string | null;
  parentId: string | null;
  status?: string;
  isActive: boolean;
  sortOrder: number;
  metadata: Record<string, any> | null;
  createdAt: string;
  updatedAt: string;
}

export interface ContentPage {
  title: string;
  body: string;
}

// Dashboard Overview (matches real API)
export interface DashboardOverview {
  users: { total: number; active: number; newThisMonth: number };
  organizations: { total: number; approved: number; suspended: number; pendingApproval: number };
  jobs: { total: number; active: number; draft: number; closed: number };
  applications: { total: number; thisMonth: number };
  campaigns: { total: number; active: number; pendingApproval: number };
  events: { total: number; active: number; cancelled: number };
}

// Feed Health
export interface FeedHealth {
  status: string;
  timestamp: string;
  feedServiceReachable: boolean;
}

// Notifications
export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
  userId?: string;
  read: boolean;
  createdAt: string;
}

// Dashboard chart data
export interface ChartDataPoint {
  name: string;
  value: number;
  secondaryValue?: number;
}

// Analytics (kept for analytics page)
export interface PlatformSummary {
  totalUsers: number;
  activeJobs: number;
  activeEvents: number;
  activeCampaigns: number;
  totalRevenue: number;
  totalApplications: number;
  totalRegistrations: number;
  userGrowth: number;
  jobGrowth: number;
  revenueGrowth: number;
}

export interface MenuApiChildItem {
  id: string;
  label: string;
  to: string;
  icon?: string;
}

export interface MenuApiItem {
  id: string;
  label: string;
  to: string;
  icon: string;
  children?: MenuApiChildItem[];
}

export interface MenuApiGroup {
  label: string;
  items: MenuApiItem[];
}

export interface MenuApiResponse {
  groups: MenuApiGroup[];
}
