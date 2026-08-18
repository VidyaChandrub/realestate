import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationsApi } from '@/api/notifications';

export interface UseNotificationsParams {
  page?: number;
  limit?: number;
  metadataTypes?: string[];
}

export const useNotifications = (params: UseNotificationsParams | number = 10) => {
  const { page = 1, limit = 10, metadataTypes } =
    typeof params === 'number' ? { limit: params } : params;

  return useQuery({
    queryKey: ['notifications', 'list', page, limit, metadataTypes],
    queryFn: () => notificationsApi.list({ page, limit, metadataTypes }),
    staleTime: 30 * 1000,
  });
};

export const useMarkAllNotificationsRead = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params?: { metadataTypes?: string[] }) => notificationsApi.markAllRead(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
};
