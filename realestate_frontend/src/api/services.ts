import apiClient from './client';
import { isCurrentUserAdmin } from '@/auth/roles';
import qs from 'qs';
import type {
  PaginatedResponse,
  AdminListResponse,
  MasterDataPaginatedResponse,
  ApiResponse,
  User,
  Application,
  Employer,
  Job,
  Event,
  Campaign,
  MasterDataItem,
  ContentPage,
  DashboardOverview,
  FeedHealth,
  EventRegistrationsResponse,
  ExternalClickRow,
  MenuApiResponse,
  PaginatedOthersSpecializationReport,
  OthersSpecializationsSyncStatus,
} from '@/types';

const ADMIN = '/api/v1/admin';
const API_V1 = '/api/v1';
const MASTER = '/api/v1/master-data';

const adminOnlyPath = (path: string) => `${ADMIN}${path}`;
const roleAwarePath = (adminPath: string, sharedPath: string) =>
  isCurrentUserAdmin() ? `${ADMIN}${adminPath}` : `${API_V1}${sharedPath}`;

function normalizeAdminListResponse<T>(
  response: AdminListResponse<T>,
  params?: { page?: number; limit?: number }
) {
  const page = response.page ?? params?.page ?? 1;
  const limit = response.limit ?? params?.limit ?? (response.data.length || 10);
  const total = response.total ?? (page === 1 && response.data.length < limit ? response.data.length : page * limit);

  return {
    success: response.success,
    data: response.data,
    total,
    page,
    limit,
  };
}

// ── Dashboard ──
export const dashboardApi = {
  getOverview: () =>
    apiClient.get<ApiResponse<DashboardOverview>>(roleAwarePath('/dashboard/overview', '/dashboard/overview')).then(r => r.data.data),
  getFeedHealth: () =>
    apiClient.get<ApiResponse<FeedHealth>>(roleAwarePath('/feed/health', '/feed/health')).then(r => r.data.data),
};

// ── Users ──
export const usersApi = {
  getMe: () =>
    apiClient.get<User | ApiResponse<User>>('/api/v1/users/me').then((r) => {
      const payload = r.data;
      return 'data' in payload ? payload.data : payload;
    }),
  list: (params: {
    page?: number;
    limit?: number;
    search?: string;
    isActive?: boolean;
    startDate?: string;
    endDate?: string;
    cityId?: string;
    stateId?: string;
    educationId?: string;
  }) =>
    apiClient.get<PaginatedResponse<User>>(adminOnlyPath('/users'), { params }).then(r => r.data),
  getById: (id: string) =>
    apiClient.get<ApiResponse<User>>(`${API_V1}/users/${id}`).then(r => r.data.data),
  getProfile: () =>
    apiClient.get<ApiResponse<User>>(`${API_V1}/profile`).then(r => r.data),
  updateProfile: (payload: { firstName: string; lastName: string; phoneNumber: string }) =>
    apiClient.patch<ApiResponse<User>>(`${API_V1}/profile`, payload).then(r => r),
  updateStatus: (id: string, isActive: boolean) =>
    apiClient.patch<ApiResponse<User>>(adminOnlyPath(`/users/${id}/status`), { isActive }).then(r => r.data.data),
  bulkActivate: (userIds: string[]) =>
    apiClient.patch(adminOnlyPath('/users/bulk/activate'), { userIds }).then((r) => r.data),
  bulkDeactivate: (userIds: string[]) =>
    apiClient.patch(adminOnlyPath('/users/bulk/deactivate'), { userIds }).then((r) => r.data),
  makeEmployer: (userId: string) =>
    apiClient.patch<ApiResponse<User> | User>(`${API_V1}/users/${userId}/role/employer`).then((r) => {
      const payload = r.data as any;
      return payload?.data ?? payload;
    }),
};

// ── Employers ──
export const employersApi = {
  list: (params?: { page?: number; limit?: number }) =>
    apiClient.get<PaginatedResponse<Employer>>(adminOnlyPath('/employers'), { params }).then(r => r.data),
  listMine: () =>
    apiClient.get<Employer[] | { employers?: Employer[]; data?: Employer[] }>('/api/v1/employers').then((r) => {
      const payload = r.data as any;
      return Array.isArray(payload) ? payload : payload?.employers ?? payload?.data ?? [];
    }),
  getMe: () =>
    apiClient.get('/api/v1/employers/me').then(r => r.data.data),
  getOne: (id: string) =>
    apiClient.get<ApiResponse<Employer> | Employer>(`/api/v1/employers/${id}`).then((r) => {
      const payload = r.data as any;
      return payload?.data ?? payload;
    }),
  create: (payload: Record<string, unknown>) =>
    apiClient.post<Employer>('/api/v1/employers', payload).then(r => r.data),
  update: (id: string, payload: Record<string, unknown>) =>
    apiClient.patch<ApiResponse<Employer> | Employer>(`/api/v1/employers/${id}`, payload).then((r) => {
      const data = r.data as any;
      return data?.data ?? data;
    }),
  /**
   * Upload an organization logo to Cloudflare R2.
   * Returns { url: string }.
   */
  uploadLogo: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient
      .post<{ url: string }>('/api/v1/employers/upload-logo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        skipGlobalErrorHandler: true,
      })
      .then(r => r.data);
  },
  delete: (id: string) =>
    apiClient.delete(`/api/v1/employers/${id}`).then(r => r.data),
  addTeamMember: (id: string, payload: Record<string, unknown>) =>
    apiClient.post(`/api/v1/employers/${id}/users`, payload).then(r => r.data),
  getUsers: (id: string) =>
    apiClient
      .get<User[] | ApiResponse<User[]>>(`/api/v1/employers/${id}/users`)
      .then((r) => {
        const payload = r.data as any;
        return payload?.data ?? payload ?? [];
      }),
  getJobs: (id: string) =>
    apiClient
      .get<{ success: boolean; data: Job[]; total: number }>(`/api/v1/employers/${id}/jobs`)
      .then((r) => {
        const payload = r.data as any;
        return {
          success: payload?.success ?? true,
          data: payload?.data ?? [],
          total: payload?.total ?? 0,
        };
      }),
  getEvents: (id: string) =>
    apiClient
      .get<{ success: boolean; data: Event[]; total: number }>(`/api/v1/employers/${id}/events`)
      .then((r) => {
        const payload = r.data as any;
        return {
          success: payload?.success ?? true,
          data: payload?.data ?? [],
          total: payload?.total ?? 0,
        };
      }),
  approve: (id: string) =>
    apiClient.patch<ApiResponse<Employer>>(adminOnlyPath(`/employers/${id}/approve`)).then(r => r.data.data),
  suspend: (id: string) =>
    apiClient.patch<ApiResponse<Employer>>(adminOnlyPath(`/employers/${id}/suspend`)).then(r => r.data.data),
};

// ── Jobs ──
const JOBS_BASE = '/api/v1/jobs';

export const jobsApi = {
  list: (params?: {
    page?: number;
    limit?: number;
    status?: string;
    jobType?: string;
    q?: string;
    location?: string;
    organizationId?: string;
    startDate?: string;
    endDate?: string;
  }) =>
    apiClient
      .get<PaginatedResponse<Job> | { success?: boolean; jobs: Job[]; total: number; page?: number; limit?: number }>(roleAwarePath('/jobs', '/jobs'), { params })
      .then((r) => {
        const payload = r.data as any;
        return {
          success: payload.success ?? true,
          data: payload.data ?? payload.jobs ?? [],
          total: payload.total ?? 0,
          page: payload.page ?? params?.page ?? 1,
          limit: payload.limit ?? params?.limit ?? 10,
        } as PaginatedResponse<Job>;
      }),
  getOne: (id: string) =>
    apiClient
      .get<ApiResponse<Job> | Job>(`${JOBS_BASE}/${id}`)
      .then((r) => {
        const payload = r.data as any;
        return payload?.data ?? payload;
      }),
  approve: (id: string) =>
    apiClient.patch<ApiResponse<Job>>(adminOnlyPath(`/jobs/${id}/approve`)).then(r => r.data.data),
  reject: (id: string, reason: string) =>
    apiClient.patch<ApiResponse<Job>>(adminOnlyPath(`/jobs/${id}/reject`), { reason }).then(r => r.data.data),

  update: (id: string, payload: Record<string, unknown>) =>
    apiClient.patch(`${JOBS_BASE}/${id}`, payload).then((r) => r.data),

  publish: (id: string) =>
    apiClient.patch(`${JOBS_BASE}/${id}/publish`).then((r) => r.data),

  delete: (id: string) =>
    apiClient.delete(`${JOBS_BASE}/${id}`).then((r) => r.data),

  bulkPublish: (jobIds: string[]) =>
    apiClient.patch(`${JOBS_BASE}/bulk/publish`, { jobIds }).then((r) => r.data),

  bulkReject: (jobIds: string[]) =>
    apiClient.patch(`${JOBS_BASE}/bulk/reject`, { jobIds, reason: 'Rejected by admin' }).then((r) => r.data),

  bulkDelete: (jobIds: string[]) =>
    apiClient.delete(`${JOBS_BASE}/bulk`, { data: { jobIds } }).then((r) => r.data),

  trackExternalClick: (id: string) =>
    apiClient.post(`${JOBS_BASE}/${id}/external-click`).then((r) => r.data),

  getExternalClicks: (jobId: string, params?: Record<string, unknown>) =>
    apiClient
      .get<{ clicks: ExternalClickRow[]; total: number; page: number; limit: number }>(
        `${JOBS_BASE}/${jobId}/external-clicks`,
        { params },
      )
      .then((r) => r.data),

  downloadExternalClicksCsv: (jobId: string) =>
    apiClient
      .get(`${JOBS_BASE}/${jobId}/external-clicks/export`, { responseType: 'blob' })
      .then((r) => r.data as Blob),
};

// ── Campaigns ──
export const campaignsApi = {
  list: (params?: { page?: number; limit?: number; status?: string }) =>
    apiClient.get<PaginatedResponse<Campaign>>(roleAwarePath('/campaigns', '/campaigns'), { params }).then(r => r.data),
  approve: (id: string) =>
    apiClient.patch<ApiResponse<Campaign>>(adminOnlyPath(`/campaigns/${id}/approve`)).then(r => r.data.data),
  reject: (id: string, reason: string) =>
    apiClient.patch<ApiResponse<Campaign>>(adminOnlyPath(`/campaigns/${id}/reject`), { reason }).then(r => r.data.data),
};

// ── Applications ──
export const applicationsApi = {
  list: (params?: { page?: number; limit?: number; status?: string; jobId?: string; organizationId?: string }) =>
    apiClient
      .get<
        PaginatedResponse<Application> |
        { success?: boolean; applications: Application[]; data?: Application[]; total: number; page?: number; limit?: number }
      >(roleAwarePath('/applications', '/applications'), { params })
      .then((r) => {
        const payload = r.data as any;
        return {
          success: payload.success ?? true,
          data: payload.data ?? payload.applications ?? [],
          total: payload.total ?? 0,
          page: payload.page ?? params?.page ?? 1,
          limit: payload.limit ?? params?.limit ?? 10,
        } as PaginatedResponse<Application>;
      }),
  getByJob: (jobId: string, params?: { page?: number; limit?: number }) =>
    apiClient
      .get<
        PaginatedResponse<Application> |
        { success?: boolean; applications: Application[]; data?: Application[]; total: number }
      >(`/api/v1/applications/jobs/${jobId}`, { params })
      .then((r) => {
        const payload = r.data as any;
        return {
          success: payload.success ?? true,
          data: payload.data ?? payload.applications ?? [],
          total: payload.total ?? 0,
          page: payload.page ?? params?.page ?? 1,
          limit: payload.limit ?? params?.limit ?? 10,
        } as PaginatedResponse<Application>;
      }),
  getOne: (id: string) =>
    apiClient
      .get<ApiResponse<Application> | Application>(`/api/v1/applications/${id}`)
      .then((r) => {
        const payload = r.data as any;
        return payload?.data ?? payload;
      }),
  updateStatus: (id: string, status: string) =>
    apiClient
      .patch<ApiResponse<Application>>(`/api/v1/applications/${id}`, { status })
      .then((r) => {
        const payload = r.data as any;
        return payload?.data ?? payload;
      }),
  adminListByJob: (jobId: string, params?: {
    page?: number;
    limit?: number;
    search?: string;
    startDate?: string;
    endDate?: string;
    countryIds?: string[];
    stateIds?: string[];
    cityIds?: string[];
    skillIds?: string[];
    experienceLevelIds?: string[];
    educationLevelIds?: string[];
    years?: string[];
  }) =>
    apiClient
      .get<{ success: boolean; data: Application[]; total: number; page: number; limit: number }>(
        adminOnlyPath('/applications'),
        {
          params: { jobId, ...params },
          paramsSerializer: (p) => qs.stringify(p, { arrayFormat: 'repeat' }),
        }
      )
      .then((r) => r.data),
};

const EVENTS_BASE = '/api/v1/events';

export const eventsApi = {
    list: (params?: {
      page?: number;
      limit?: number;
      status?: string;
      search?: string;
      startDate?: string;
      endDate?: string;
      startDateFrom?: string;
      startDateTo?: string;
      registrationType?: string;
      mode?: string;
      organizationId?: string;
    }) =>
    apiClient
      .get<
        PaginatedResponse<Event> |
        { success?: boolean; events: Event[]; total: number; page?: number; limit?: number; totalPages?: number }
      >(roleAwarePath('/events', '/events'), { params })
      .then((r) => {
        const payload = r.data as any;
        return {
          success: payload.success ?? true,
          data: payload.data ?? payload.events ?? [],
          total: payload.total ?? 0,
          page: payload.page ?? params?.page ?? 1,
          limit: payload.limit ?? params?.limit ?? 10,
        } as PaginatedResponse<Event>;
      }),
  getById: (id: string) =>
    apiClient.get<ApiResponse<Event>>(`${EVENTS_BASE}/${id}`).then((r) => {
      const payload = r.data as any;
      return payload?.data ?? payload;
    }),
  getRegistrations: (eventId: string, params?: Record<string, unknown>) =>
    apiClient
      .get<EventRegistrationsResponse>(`${EVENTS_BASE}/${eventId}/registrations`, {
        params,
        paramsSerializer: (params) =>
          qs.stringify(params, { arrayFormat: 'repeat' }),
      })
      .then((r) => r.data),
  getExternalClicks: (eventId: string, params?: Record<string, unknown>) =>
    apiClient
      .get<{ clicks: ExternalClickRow[]; total: number; page: number; limit: number }>(
        `${EVENTS_BASE}/${eventId}/external-clicks`,
        { params },
      )
      .then((r) => r.data),
  create: (organizationId: string, payload: Record<string, unknown>) =>
    apiClient.post(`${EVENTS_BASE}?organizationId=${organizationId}`, payload).then((r) => r.data),
  update: (id: string, payload: Record<string, unknown>) =>
    apiClient.patch<ApiResponse<Event>>(`${EVENTS_BASE}/${id}`, payload).then(r => r.data.data),
  publish: (id: string) =>
    apiClient.patch<ApiResponse<Event>>(`${EVENTS_BASE}/${id}/publish`).then(r => r.data.data),
  approve: (id: string) =>
    apiClient.patch<ApiResponse<Event>>(adminOnlyPath(`/events/${id}/approve`)).then(r => r.data.data),
  cancel: (id: string) =>
    apiClient.patch<ApiResponse<Event>>(`${EVENTS_BASE}/${id}/cancel`).then(r => r.data.data),
  delete: (id: string) =>
    apiClient.delete(`${EVENTS_BASE}/${id}`).then((r) => r.data),
  
  // Master data methods for events
  getCategories: () =>
    apiClient.get<MasterDataPaginatedResponse>(MASTER, { params: { type: 'EVENT_CATEGORY' } }).then(r => r.data.items),
  getLocations: () =>
    apiClient.get<MasterDataPaginatedResponse>(MASTER, { params: { type: 'LOCATION_CITY' } }).then(r => r.data.items),
  getTags: () =>
    apiClient.get<MasterDataPaginatedResponse>(MASTER, { params: { type: 'SYSTEM_TAG' } }).then(r => r.data.items),
  searchTags: (value: string) =>
    apiClient.get(`${MASTER}/search`, { params: { value } }).then((r) => {
      const payload = r.data as any;
      return payload?.items ?? payload?.data ?? payload ?? [];
    }),
  searchMasterData: (value: string, type?: string, parentId?: string) =>
    apiClient.get(`${MASTER}/search`, { params: { value, ...(type ? { type } : {}), ...(parentId ? { parentId } : {}) } }).then((r) => {
      const payload = r.data as any;
      return payload?.items ?? payload?.data ?? payload ?? [];
    }),
  getMasterDataByType: (type: string) =>
    apiClient.get<MasterDataPaginatedResponse>(MASTER, { params: { type } }).then(r => r.data.items),

  getCountries: () =>
    apiClient
      .get<MasterDataPaginatedResponse | MasterDataItem[]>(`${MASTER}/by-type`, { params: { type: 'LOCATION_COUNTRY' } })
      .then((r) => (r.data as any)?.items ?? r.data ?? []),

  getStatesByCountrySlug: (slug: string) =>
    apiClient
      .get<MasterDataPaginatedResponse | MasterDataItem[]>(`${MASTER}/by-slug/${slug}/children`, { params: { childType: 'LOCATION_STATE' } })
      .then((r) => (r.data as any)?.items ?? r.data ?? []),

  getCitiesByStateSlug: (slug: string) =>
    apiClient
      .get<MasterDataPaginatedResponse | MasterDataItem[]>(`${MASTER}/by-slug/${slug}/children`, { params: { childType: 'LOCATION_CITY' } })
      .then((r) => (r.data as any)?.items ?? r.data ?? []),
  getSpecializationsByEducationId: (educationId: string) =>
  apiClient
    .get(`${MASTER}/children`, {
      params: {
        parentId: educationId,
        type: 'SPECIALIZATION',
      },
    })
    .then((r) => {
      const payload = r.data as any;
      return payload?.items ?? payload?.data ?? payload ?? [];
    }),
  getSkills: () =>
    apiClient
      .get<MasterDataPaginatedResponse | MasterDataItem[]>(`${MASTER}/tree`, { params: { type: 'SKILL' } })
      .then((r) => (r.data as any)?.items ?? r.data ?? []),

  getEducationLevels: () =>
    apiClient
      .get<MasterDataPaginatedResponse | MasterDataItem[]>(`${MASTER}/tree`, { params: { type: 'EDUCATION_LEVEL' } })
      .then((r) => (r.data as any)?.items ?? r.data ?? []),

  getExperienceLevels: () =>
    apiClient
      .get<MasterDataPaginatedResponse | MasterDataItem[]>(`${MASTER}/tree`, { params: { type: 'EXPERIENCE_LEVEL' } })
      .then((r) => (r.data as any)?.items ?? r.data ?? []),

  getEmploymentTypes: () =>
    apiClient
      .get<MasterDataPaginatedResponse | MasterDataItem[]>(`${MASTER}/tree`, { params: { type: 'EMPLOYMENT_TYPE' } })
      .then((r) => (r.data as any)?.items ?? r.data ?? []),

  // New optimized methods for full data
  // In-memory cache to avoid repeated API calls
  _masterDataCache: null as any[] | null,

  getAllMasterData: async () => {
    if (eventsApi._masterDataCache) {
      return eventsApi._masterDataCache;
    }

    const [countries, skills, experienceLevels, educationLevels, employmentTypes] =
      await Promise.all([
        eventsApi.getCountries(),
        eventsApi.getSkills(),
        eventsApi.getExperienceLevels(),
        eventsApi.getEducationLevels(),
        eventsApi.getEmploymentTypes(),
      ]);

    const countrySlugs = countries
      .map((item) => item.slug)
      .filter((slug): slug is string => Boolean(slug));

    const statesByCountry = await Promise.all(
      countrySlugs.map((slug) => eventsApi.getStatesByCountrySlug(slug))
    );
    const states = statesByCountry.flat();

    const stateSlugs = states
      .map((item) => item.slug)
      .filter((slug): slug is string => Boolean(slug));

    const citiesByState = await Promise.all(
      stateSlugs.map((slug) => eventsApi.getCitiesByStateSlug(slug))
    );
    const cities = citiesByState.flat();

    const allItems = [
      ...countries,
      ...states,
      ...cities,
      ...skills,
      ...experienceLevels,
      ...educationLevels,
      ...employmentTypes,
    ];

    eventsApi._masterDataCache = allItems;
    return allItems;
  },

  getAllLocations: async () => {
    const items = await eventsApi.getAllMasterData();
    return items.filter(item => item.type === 'LOCATION_CITY');
  },

  getAllSkills: async () => {
    const items = await eventsApi.getAllMasterData();
    return items.filter(item => item.type === 'SKILL');
  },

  getAllExperienceLevels: async () => {
    const items = await eventsApi.getAllMasterData();
    return items.filter(item => item.type === 'EXPERIENCE_LEVEL');
  },

  getAllEducationLevels: async () => {
    const items = await eventsApi.getAllMasterData();
    return items.filter(item => item.type === 'EDUCATION_LEVEL');
  },
};

// ── Master Data ──
export const masterDataApi = {
  list: (params?: { page?: number; limit?: number; activeOnly?: boolean; type?: string; status?: string; search?: string }) =>
    apiClient.get<MasterDataPaginatedResponse>(MASTER, { params }).then(r => r.data),
  search: (params: { value: string; type?: string }) =>
    apiClient.get('/api/v1/master-data/search', { params }).then(r => r.data),
  create: (data: Partial<MasterDataItem>) =>
    apiClient.post(MASTER, data).then(r => r.data),
  uploadCsv: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient
      .post(`${MASTER}/upload-csv`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then(r => r.data);
  },
  update: (id: string, data: Partial<MasterDataItem>) =>
    apiClient.patch(`${MASTER}/${id}`, data).then(r => r.data),
  delete: (id: string) =>
    apiClient.delete(`${MASTER}/${id}`).then(r => r.data),
  getByType: (type: string) =>
    apiClient.get<MasterDataPaginatedResponse | MasterDataItem[]>(`${MASTER}/by-type`, { params: { type } }).then((r) => {
      const payload = r.data as any;
      return payload?.items ?? payload?.data?.items ?? payload?.data ?? payload ?? [];
    }),
  getById: (id: string) =>
    apiClient.get<ApiResponse<MasterDataItem>>(`${MASTER}/${id}`).then((r) => {
      const payload = r.data as any;
      return (payload?.data ?? payload) as MasterDataItem;
    }),
  searchCities: (value: string) =>
    apiClient.get(`${MASTER}/search/cities`, { params: { value } }).then((r) => {
      const payload = r.data as any;
      return (payload?.items ?? payload?.data ?? payload ?? []) as MasterDataItem[];
    }),
};

export const reportApi = {
  getOthersSpecializations: (params?: { page?: number; limit?: number; search?: string }) =>
    apiClient
      .get<PaginatedOthersSpecializationReport>(`${API_V1}/reports/others-specializations`, { params })
      .then((r) => r.data),
  exportOthersSpecializations: () =>
    apiClient.get(`${API_V1}/reports/others-specializations/export`, { responseType: 'blob' }).then((r) => r.data),
  syncOthersSpecializations: () =>
    apiClient
      .post<{
        success: boolean;
        message: string;
        data: { updatedCount: number };
      }>(`${API_V1}/reports/others-specializations/sync`)
      .then((r) => r.data),
  getOthersSpecializationsSyncStatus: () =>
    apiClient
      .get<ApiResponse<OthersSpecializationsSyncStatus>>(`${API_V1}/reports/others-specializations/sync-status`)
      .then((r) => r.data.data),
};

const CONTENT_BASE = '/api/v1/content';

export const contentApi = {
  get: (slug: string) =>
    apiClient.get<ApiResponse<ContentPage>>(`${CONTENT_BASE}/${slug}`).then(r => r.data.data),
  update: (slug: string, payload: Partial<ContentPage>) =>
    apiClient.patch<ApiResponse<ContentPage>>(`${CONTENT_BASE}/${slug}`, payload).then(r => r.data.data),
};


// ── Menu ──
export const menuApi = {
  getMenu: () =>
    apiClient.get<MenuApiResponse>('/api/v1/menu').then(r => r.data),
};
