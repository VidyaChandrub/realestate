import apiClient from './client';
import type { PaginatedResponse } from '@/types';
import type { Broadcast, CreateBroadcastPayload } from '@/pages/notifications/types';

const BASE_URL = '/api/v1/admin/broadcasts';

export const broadcastsApi = {
  /**
   * List broadcast history with pagination
   */
  list: (params?: { page?: number; limit?: number; search?: string }) =>
    apiClient
      .get<PaginatedResponse<Broadcast> | { data?: Broadcast[]; items?: Broadcast[]; total?: number }>(BASE_URL, { params })
      .then((r) => {
        const payload = r.data as any;
        return {
          data: (payload?.data ?? payload?.items ?? []) as Broadcast[],
          total: payload?.total ?? 0,
          page: payload?.page ?? params?.page ?? 1,
          limit: payload?.limit ?? params?.limit ?? 10,
        };
      }),

  /**
   * Send a new broadcast
   */
  create: (payload: CreateBroadcastPayload) =>
    apiClient.post<Broadcast>(BASE_URL, payload).then((r) => r.data),

  /**
   * Get a single broadcast by ID
   */
  getById: (id: string) =>
    apiClient.get<Broadcast>(`${BASE_URL}/${id}`).then((r) => {
      const payload = r.data as any;
      return (payload?.data ?? payload) as Broadcast;
    }),
};
