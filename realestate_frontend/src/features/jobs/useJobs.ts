import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { jobsApi } from '@/api/services';
import { toast } from 'sonner';
import type { Job } from '@/types';

// ─── useJobs ─────────────────────────────────────────────────────────────────

export interface UseJobsOptions {
  organizationId?: string;
  enabled?: boolean;
  limit?: number;
}

export function useJobs({ organizationId, enabled = true, limit = 100 }: UseJobsOptions = {}) {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['jobs', page, limit, organizationId ?? ''],
    queryFn: () =>
      jobsApi.list({
        page,
        limit,
        organizationId: organizationId ?? undefined,
      }),
    enabled,
  });

  return {
    jobs: (data?.data ?? []) as Job[],
    total: data?.total ?? 0,
    page,
    setPage,
    isLoading,
  };
}

// ─── useJobActions ────────────────────────────────────────────────────────────

export function useJobActions() {
  const queryClient = useQueryClient();

  const approveMutation = useMutation({
    mutationFn: (id: string) => jobsApi.approve(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['jobs'] });
      toast.success('Job approved.');
    },
    onError: () => toast.error('Failed to approve job.'),
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) => jobsApi.reject(id, 'Rejected by admin'),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['jobs'] });
      toast.success('Job rejected.');
    },
    onError: () => toast.error('Failed to reject job.'),
  });

  const publishMutation = useMutation({
    mutationFn: (id: string) => jobsApi.publish(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['jobs'] });
      toast.success('Job published.');
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Failed to publish job.';
      toast.error(message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => jobsApi.delete(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['jobs'] });
      toast.success('Job deleted.');
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Failed to delete job.';
      toast.error(message);
    },
  });

  const isAnyActionPending =
    approveMutation.isPending ||
    rejectMutation.isPending ||
    publishMutation.isPending ||
    deleteMutation.isPending;

  return {
    approveMutation,
    rejectMutation,
    publishMutation,
    deleteMutation,
    isAnyActionPending,
  };
}
