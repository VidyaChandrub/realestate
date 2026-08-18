import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/api/services', () => ({
  jobsApi: {
    list: vi.fn(),
    approve: vi.fn(),
    reject: vi.fn(),
    publish: vi.fn(),
    delete: vi.fn(),
  },
  eventsApi: {},
  masterDataApi: {},
}));

import { jobsApi } from '@/api/services';
import { toast } from 'sonner';
import { useJobs, useJobActions } from './useJobs';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ── useJobs ───────────────────────────────────────────────────────────────────

describe('useJobs', () => {
  it('fetches the jobs list with default options', async () => {
    vi.mocked(jobsApi.list).mockResolvedValue({ success: true, data: [], total: 0, page: 1, limit: 100 });

    const { result } = renderHook(() => useJobs(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(jobsApi.list).toHaveBeenCalledWith({ page: 1, limit: 100, organizationId: undefined });
    expect(result.current.jobs).toEqual([]);
    expect(result.current.total).toBe(0);
  });

  it('passes organizationId to the API when provided', async () => {
    vi.mocked(jobsApi.list).mockResolvedValue({ success: true, data: [], total: 0, page: 1, limit: 100 });

    const { result } = renderHook(() => useJobs({ organizationId: 'org-1' }), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(jobsApi.list).toHaveBeenCalledWith({ page: 1, limit: 100, organizationId: 'org-1' });
  });

  it('returns jobs and total from the API response', async () => {
    const mockJobs = [{ id: 'job-1', title: 'Developer' }];
    vi.mocked(jobsApi.list).mockResolvedValue({ success: true, data: mockJobs as any, total: 1, page: 1, limit: 100 });

    const { result } = renderHook(() => useJobs(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.jobs).toEqual(mockJobs);
    expect(result.current.total).toBe(1);
  });

  it('does not fetch when enabled is false', () => {
    const { result } = renderHook(() => useJobs({ enabled: false }), { wrapper: createWrapper() });

    expect(result.current.isLoading).toBe(false);
    expect(jobsApi.list).not.toHaveBeenCalled();
  });

  it('exposes a setPage function that triggers a new fetch', async () => {
    vi.mocked(jobsApi.list).mockResolvedValue({ success: true, data: [], total: 0, page: 1, limit: 100 });

    const { result } = renderHook(() => useJobs(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.setPage(2);
    });

    expect(result.current.page).toBe(2);
  });
});

// ── useJobActions ─────────────────────────────────────────────────────────────

describe('useJobActions', () => {
  it('approveMutation calls jobsApi.approve and shows a success toast', async () => {
    vi.mocked(jobsApi.approve).mockResolvedValue({} as any);

    const { result } = renderHook(() => useJobActions(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.approveMutation.mutate('job-1');
    });

    await waitFor(() => expect(result.current.approveMutation.isSuccess).toBe(true));
    expect(jobsApi.approve).toHaveBeenCalledWith('job-1');
    expect(toast.success).toHaveBeenCalledWith('Job approved.');
  });

  it('rejectMutation calls jobsApi.reject with a reason and shows a success toast', async () => {
    vi.mocked(jobsApi.reject).mockResolvedValue({} as any);

    const { result } = renderHook(() => useJobActions(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.rejectMutation.mutate('job-2');
    });

    await waitFor(() => expect(result.current.rejectMutation.isSuccess).toBe(true));
    expect(jobsApi.reject).toHaveBeenCalledWith('job-2', 'Rejected by admin');
    expect(toast.success).toHaveBeenCalledWith('Job rejected.');
  });

  it('publishMutation calls jobsApi.publish and shows a success toast', async () => {
    vi.mocked(jobsApi.publish).mockResolvedValue({} as any);

    const { result } = renderHook(() => useJobActions(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.publishMutation.mutate('job-3');
    });

    await waitFor(() => expect(result.current.publishMutation.isSuccess).toBe(true));
    expect(jobsApi.publish).toHaveBeenCalledWith('job-3');
    expect(toast.success).toHaveBeenCalledWith('Job published.');
  });

  it('deleteMutation calls jobsApi.delete and shows a success toast', async () => {
    vi.mocked(jobsApi.delete).mockResolvedValue({} as any);

    const { result } = renderHook(() => useJobActions(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.deleteMutation.mutate('job-4');
    });

    await waitFor(() => expect(result.current.deleteMutation.isSuccess).toBe(true));
    expect(jobsApi.delete).toHaveBeenCalledWith('job-4');
    expect(toast.success).toHaveBeenCalledWith('Job deleted.');
  });

  it('approveMutation shows an error toast on failure', async () => {
    vi.mocked(jobsApi.approve).mockRejectedValue(new Error('Server error'));

    const { result } = renderHook(() => useJobActions(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.approveMutation.mutate('job-5');
    });

    await waitFor(() => expect(result.current.approveMutation.isError).toBe(true));
    expect(toast.error).toHaveBeenCalledWith('Failed to approve job.');
  });

  it('isAnyActionPending is false when no mutation is running', () => {
    const { result } = renderHook(() => useJobActions(), { wrapper: createWrapper() });
    expect(result.current.isAnyActionPending).toBe(false);
  });
});
