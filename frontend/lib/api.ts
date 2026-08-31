import type {
  AdminOrgDomainRequestListResponse,
  ApiErrorBody,
  AuthTokens,
  BusinessDetailsInput,
  BusinessDetailsStepResponse,
  ChangePasswordInput,
  ChangePlanInput,
  ChangePlanResult,
  CompleteOnboardingResult,
  InviteStepInput,
  InviteStepResponse,
  InvoiceRow,
  LeadSubmission,
  LogoUploadUrlInput,
  LogoUploadUrlResult,
  ModulesStepInput,
  ModulesStepResponse,
  NotificationsListResponse,
  OnboardingAccountInput,
  OnboardingOrganisationInput,
  OnboardingStepResult,
  OrgDomainInfo,
  OrganisationStepResponse,
  Plan,
  RequestCustomDomainInput,
  ResumeSignupResponse,
  ReviewOrgDomainRequestInput,
  SignupStep1Response,
  SubdomainAvailability,
  SubscriptionStepInput,
  SubscriptionStepResponse,
  TemplatesStepInput,
  TemplatesStepResponse,
  UnreadNotificationsResponse,
  UserProfile,
} from "./types";

const API_BASE = "/api";

const ACCESS_TOKEN_KEY = "be.access_token";
const REFRESH_TOKEN_KEY = "be.refresh_token";
const USER_KEY = "be.user";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body?: ApiErrorBody,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function errorMessage(body: ApiErrorBody | null, status: number): string {
  if (body?.message) {
    return Array.isArray(body.message) ? body.message.join(", ") : body.message;
  }
  if (body?.error) {
    return body.error;
  }
  return `Request failed with status ${status}`;
}

function readTokens(): { accessToken: string | null; refreshToken: string | null } {
  if (typeof window === "undefined") {
    return { accessToken: null, refreshToken: null };
  }
  return {
    accessToken: localStorage.getItem(ACCESS_TOKEN_KEY),
    refreshToken: localStorage.getItem(REFRESH_TOKEN_KEY),
  };
}

let refreshPromise: Promise<boolean> | null = null;

async function tryRefresh(): Promise<boolean> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const { refreshToken } = readTokens();
    if (!refreshToken || refreshToken.startsWith("mock-")) return false;

    try {
      const res = await fetch(`${API_BASE}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
      if (!res.ok) return false;
      const tokens = (await res.json()) as AuthTokens;
      localStorage.setItem(ACCESS_TOKEN_KEY, tokens.access_token);
      localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refresh_token);
      return true;
    } catch {
      return false;
    }
  })();

  try {
    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
}

function clearSession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  retried = false,
): Promise<T> {
  const { accessToken } = readTokens();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> | undefined),
  };
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (res.status === 401 && !retried && !path.startsWith("/auth/")) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      return apiFetch<T>(path, options, true);
    }
    clearSession();
  }

  const contentType = res.headers.get("content-type") ?? "";
  const body = contentType.includes("application/json")
    ? await res.json()
    : null;

  if (!res.ok) {
    throw new ApiError(errorMessage(body, res.status), res.status, body);
  }

  return body as T;
}

export async function getProfile(): Promise<UserProfile> {
  return apiFetch<UserProfile>("/auth/me");
}

export async function changePassword(
  input: ChangePasswordInput,
): Promise<{ success: boolean }> {
  return apiFetch<{ success: boolean }>("/auth/change-password", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function getPlans(): Promise<Plan[]> {
  return apiFetch<Plan[]>("/plans");
}

// --- Signup wizard (resumable, step-wise) ---

export async function signupStep1(
  input: OnboardingAccountInput,
): Promise<SignupStep1Response> {
  return apiFetch<SignupStep1Response>("/auth/signup/step1", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function resumeSignup(email: string): Promise<ResumeSignupResponse> {
  return apiFetch<ResumeSignupResponse>("/auth/resume-signup", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export async function createOrganisationStep(
  input: OnboardingOrganisationInput,
): Promise<OrganisationStepResponse> {
  return apiFetch<OrganisationStepResponse>("/auth/signup/organisation", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function saveBusinessDetailsStep(
  input: BusinessDetailsInput,
): Promise<BusinessDetailsStepResponse> {
  return apiFetch<BusinessDetailsStepResponse>("/onboarding/business-details", {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function getLogoUploadUrl(
  input: LogoUploadUrlInput,
): Promise<LogoUploadUrlResult> {
  return apiFetch<LogoUploadUrlResult>("/onboarding/logo-upload-url", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function saveSubscriptionStep(
  input: SubscriptionStepInput,
): Promise<SubscriptionStepResponse> {
  return apiFetch<SubscriptionStepResponse>("/onboarding/subscription", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function saveTemplatesStep(
  input: TemplatesStepInput,
): Promise<TemplatesStepResponse> {
  return apiFetch<TemplatesStepResponse>("/onboarding/templates", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function saveModulesStep(
  input: ModulesStepInput,
): Promise<ModulesStepResponse> {
  return apiFetch<ModulesStepResponse>("/onboarding/modules", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function saveInviteStep(
  input: InviteStepInput,
): Promise<InviteStepResponse> {
  return apiFetch<InviteStepResponse>("/onboarding/invite", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function completeOnboardingStep(): Promise<CompleteOnboardingResult> {
  return apiFetch<CompleteOnboardingResult>("/onboarding/complete", {
    method: "POST",
  });
}

export async function getInvoices(): Promise<InvoiceRow[]> {
  return apiFetch<InvoiceRow[]>("/org/billing/invoices");
}

export async function changePlan(
  input: ChangePlanInput,
): Promise<ChangePlanResult> {
  return apiFetch<ChangePlanResult>("/org/billing/plan", {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function submitLead(input: LeadSubmission): Promise<void> {
  await apiFetch("/org/leads", {
    method: "POST",
    body: JSON.stringify({
      landingPageId: input.landingPageId,
      formName: input.formName,
      source: input.source,
      data: input.fields,
    }),
  });
}

// --- Organisation domain identity (subdomain + custom domain) ---

export async function checkSubdomainAvailability(
  subdomain: string,
): Promise<SubdomainAvailability> {
  return apiFetch<SubdomainAvailability>(
    `/auth/subdomain-availability?subdomain=${encodeURIComponent(subdomain)}`,
  );
}

export async function getOrgDomainInfo(): Promise<OrgDomainInfo> {
  return apiFetch<OrgDomainInfo>("/org/domain");
}

export async function requestCustomDomain(
  input: RequestCustomDomainInput,
): Promise<OrgDomainInfo["requests"][number]> {
  return apiFetch<OrgDomainInfo["requests"][number]>("/org/domain/custom-domain", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

// --- Super Admin: org subdomain / custom-domain request review ---

export async function getOrgDomainRequests(params?: {
  kind?: string;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}): Promise<AdminOrgDomainRequestListResponse> {
  const q = new URLSearchParams();
  if (params?.kind) q.set("kind", params.kind);
  if (params?.status) q.set("status", params.status);
  if (params?.search) q.set("search", params.search);
  if (params?.page) q.set("page", String(params.page));
  if (params?.limit) q.set("limit", String(params.limit));
  const s = q.toString();
  return apiFetch<AdminOrgDomainRequestListResponse>(
    `/admin/org-domain-requests${s ? `?${s}` : ""}`,
  );
}

export async function reviewOrgDomainRequest(
  id: string,
  input: ReviewOrgDomainRequestInput,
): Promise<{ id: string; status: string }> {
  return apiFetch<{ id: string; status: string }>(
    `/admin/org-domain-requests/${id}/review`,
    { method: "POST", body: JSON.stringify(input) },
  );
}

// --- In-app notifications (Super Admin bell) ---

export async function getNotifications(params?: {
  page?: number;
  limit?: number;
  unreadOnly?: boolean;
}): Promise<NotificationsListResponse> {
  const q = new URLSearchParams();
  if (params?.page) q.set("page", String(params.page));
  if (params?.limit) q.set("limit", String(params.limit));
  if (params?.unreadOnly) q.set("unreadOnly", "true");
  const s = q.toString();
  return apiFetch<NotificationsListResponse>(
    `/admin/notifications${s ? `?${s}` : ""}`,
  );
}

export async function getUnreadNotifications(): Promise<UnreadNotificationsResponse> {
  return apiFetch<UnreadNotificationsResponse>("/admin/notifications/unread-count");
}

export async function markNotificationRead(id: string): Promise<{ id: string }> {
  return apiFetch<{ id: string }>(`/admin/notifications/${id}/read`, {
    method: "PATCH",
  });
}

export async function markAllNotificationsRead(): Promise<{ success: boolean }> {
  return apiFetch<{ success: boolean }>("/admin/notifications/read-all", {
    method: "POST",
  });
}