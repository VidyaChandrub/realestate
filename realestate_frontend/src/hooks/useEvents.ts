import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { eventsApi } from '@/api/services';
import type { Event, MasterDataItem } from '@/types';

// Query hooks
export const useEvents = (page: number = 1, limit: number = 10, status?: string) => {
  return useQuery({
    queryKey: ['events', page, limit, status],
    queryFn: () => eventsApi.list({ page, limit, status }),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useEvent = (id: string) => {
  return useQuery({
    queryKey: ['events', id],
    queryFn: () => eventsApi.getById(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
};

export const useEventCategories = () => {
  return useQuery({
    queryKey: ['event-categories'],
    queryFn: () => eventsApi.getCategories(),
    staleTime: 30 * 60 * 1000, // 30 minutes
  });
};

export const useEventLocations = () => {
  return useQuery({
    queryKey: ['event-locations-all'],
    queryFn: () => eventsApi.getAllLocations(),
    staleTime: 30 * 60 * 1000,
  });
};

export const useEventSkills = () => {
  return useQuery({
    queryKey: ['event-skills-all'],
    queryFn: () => eventsApi.getAllSkills(),
    staleTime: 30 * 60 * 1000,
  });
};

export const useEventExperienceLevels = () => {
  return useQuery({
    queryKey: ['event-experience-levels-all'],
    queryFn: () => eventsApi.getAllExperienceLevels(),
    staleTime: 30 * 60 * 1000,
  });
};

export const useEventEducation = () => {
  return useQuery({
    queryKey: ['event-education-all'],
    queryFn: () => eventsApi.getAllEducationLevels(),
    staleTime: 30 * 60 * 1000,
  });
};

export const useSearchEventTags = (value: string) => {
  return useQuery({
    queryKey: ['event-tags-search', value],
    queryFn: () => eventsApi.searchTags(value),
    enabled: value.trim().length > 0,
    staleTime: 5 * 60 * 1000,
  });
};

// Mutation hooks
export const useCreateEvent = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { organizationId: string } & Record<string, unknown>) => {
      const { organizationId, ...data } = payload;
      return eventsApi.create(organizationId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });
};

export const useUpdateEvent = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { id: string } & Record<string, unknown>) => {
      const { id, ...data } = payload;
      return eventsApi.update(id, data);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['events', variables.id] });
    },
  });
};

export const usePublishEvent = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => eventsApi.publish(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['events', id] });
    },
  });
};

export const useApproveEvent = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => eventsApi.approve(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });
};

export const useCancelEvent = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => eventsApi.cancel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });
};
