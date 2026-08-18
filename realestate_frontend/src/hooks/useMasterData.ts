import { useQuery } from '@tanstack/react-query';
import { masterDataApi } from '@/api/services';

export function useMasterData(type: string) {
  return useQuery({
    queryKey: ['master-data', type],
    queryFn: () => masterDataApi.getByType(type),
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled: !!type,
  });
}
