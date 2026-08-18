import apiClient from './client';
import type { 
  Advertisement, 
  ApiResponse, 
  PaginatedResponse 
} from '@/types';

const BASE_URL = '/api/v1/advertisements';

export const advertisementsApi = {
  /**
   * Create a new advertisement
   */
  create: (payload: Partial<Advertisement>) =>
    apiClient.post<Advertisement>(BASE_URL, payload).then(r => r.data),

  /**
   * Upload an advertisement image to Cloudflare R2.
   * Returns { url: string }.
   */
  uploadImage: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient
      .post<{ url: string }>(`${BASE_URL}/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        skipGlobalErrorHandler: true,
      })
      .then(r => r.data);
  },

  /**
   * List all advertisements with pagination and filters
   */
  list: (params?: { 
    page?: number; 
    limit?: number; 
    status?: string; 
    placement?: string;
    search?: string;
    displayType?: string;
    startDate?: string;
    endDate?: string;
    createdAt?: string;
  }) =>
    apiClient.get<PaginatedResponse<Advertisement>>(BASE_URL, { params }).then(r => r.data),

  /**
   * Get visible advertisements for the current user
   */
  getVisible: () =>
    apiClient.get<Advertisement[]>(`${BASE_URL}/visible`).then(r => r.data),

  /**
   * Get a single advertisement by ID
   */
  getOne: (id: string) =>
    apiClient.get<Advertisement>(`${BASE_URL}/${id}`).then(r => r.data),

  /**
   * Update an advertisement
   */
  update: (id: string, payload: Partial<Advertisement>) =>
    apiClient.put<Advertisement>(`${BASE_URL}/${id}`, payload).then(r => r.data),

  /**
   * Delete an advertisement
   */
  delete: (id: string) =>
    apiClient.delete(`${BASE_URL}/${id}`).then(r => r.data),

  /**
   * Update advertisement status
   */
  updateStatus: (id: string, status: string) =>
    apiClient.patch<Advertisement>(`${BASE_URL}/${id}/status`, { status }).then(r => r.data),

  /**
   * Track a click on an advertisement
   */
  trackClick: (id: string, metadata?: Record<string, any>) =>
    apiClient.post(`${BASE_URL}/${id}/click`, metadata).then(r => r.data),

  /**
   * Get click analytics for an advertisement
   */
  getClicks: (id: string, params?: { 
    page?: number; 
    limit?: number;
    startDate?: string;
    endDate?: string;
    locationId?: string;
    experienceLevelId?: string;
    educationLevelId?: string;
  }) =>
    apiClient.get(`${BASE_URL}/${id}/clicks`, { params }).then(r => r.data),

  /**
   * Export click data for an advertisement
   */
  exportClicks: (id: string, params?: any) =>
    apiClient.get(`${BASE_URL}/${id}/clicks/export`, { params, responseType: 'blob' }).then(r => r.data),

  /**
   * Clone an advertisement
   */
  clone: (id: string) =>
    apiClient.get(`${BASE_URL}/${id}/clone`).then(r => r.data),
};
