import apiClient from './client';
import qs from 'qs';
import type { Notification } from '@/types';

const BASE_URL = '/api/v1/notifications';

export interface NotificationListResponse {
  notifications: Notification[];
  total: number;
  unreadCount: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const notificationsApi = {
  /**
   * List notifications for the current user, newest first. Includes unreadCount.
   */
  list: (params?: { page?: number; limit?: number; metadataTypes?: string[] }) =>
    apiClient
      .get<NotificationListResponse>(BASE_URL, {
        params,
        paramsSerializer: (p) => qs.stringify(p, { arrayFormat: 'repeat' }),
      })
      .then((r) => r.data),

  /**
   * Mark all notifications as read for the current user
   */
  markAllRead: (params?: { metadataTypes?: string[] }) =>
    apiClient
      .patch(`${BASE_URL}/mark-all-read`, undefined, {
        params,
        paramsSerializer: (p) => qs.stringify(p, { arrayFormat: 'repeat' }),
      })
      .then((r) => r.data),
};
