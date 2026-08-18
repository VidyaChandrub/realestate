import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

vi.mock('@/api/services', () => ({
  masterDataApi: {
    getByType: vi.fn(),
  },
  eventsApi: {},
  jobsApi: {},
}));

import { masterDataApi } from '@/api/services';
import { useMasterData } from './useMasterData';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useMasterData', () => {
  it('calls masterDataApi.getByType with the provided type', async () => {
    vi.mocked(masterDataApi.getByType).mockResolvedValue([]);

    const { result } = renderHook(() => useMasterData('SKILL'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(masterDataApi.getByType).toHaveBeenCalledWith('SKILL');
  });

  it('returns data from the API', async () => {
    const mockItems = [
      { id: '1', type: 'SKILL', value: 'React', slug: 'react', description: null, parentId: null, isActive: true, sortOrder: 1, metadata: null, createdAt: '', updatedAt: '' },
    ];
    vi.mocked(masterDataApi.getByType).mockResolvedValue(mockItems);

    const { result } = renderHook(() => useMasterData('SKILL'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockItems);
  });

  it('does not fetch when type is an empty string', () => {
    const { result } = renderHook(() => useMasterData(''), { wrapper: createWrapper() });

    expect(result.current.isFetching).toBe(false);
    expect(masterDataApi.getByType).not.toHaveBeenCalled();
  });

  it('exposes an error when the API call fails', async () => {
    vi.mocked(masterDataApi.getByType).mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useMasterData('SKILL'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as Error).message).toBe('Network error');
  });
});
