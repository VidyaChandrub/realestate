import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

vi.mock('@/api/services', () => ({
  eventsApi: {
    list: vi.fn(),
    getById: vi.fn(),
    getCategories: vi.fn(),
    getAllLocations: vi.fn(),
    getAllSkills: vi.fn(),
    getAllExperienceLevels: vi.fn(),
    getAllEducationLevels: vi.fn(),
    searchTags: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    publish: vi.fn(),
    approve: vi.fn(),
    cancel: vi.fn(),
  },
  masterDataApi: {},
  jobsApi: {},
}));

import { eventsApi } from '@/api/services';
import {
  useEvents,
  useEvent,
  useEventCategories,
  useSearchEventTags,
  useCreateEvent,
  useUpdateEvent,
  usePublishEvent,
  useApproveEvent,
  useCancelEvent,
} from './useEvents';

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

// ── Query hooks ────────────────────────────────────────────────────────────────

describe('useEvents', () => {
  it('calls eventsApi.list with the default page and limit', async () => {
    vi.mocked(eventsApi.list).mockResolvedValue({ success: true, data: [], total: 0, page: 1, limit: 10 });

    const { result } = renderHook(() => useEvents(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(eventsApi.list).toHaveBeenCalledWith({ page: 1, limit: 10, status: undefined });
  });

  it('passes custom page, limit, and status', async () => {
    vi.mocked(eventsApi.list).mockResolvedValue({ success: true, data: [], total: 0, page: 2, limit: 5 });

    const { result } = renderHook(() => useEvents(2, 5, 'PUBLISHED'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(eventsApi.list).toHaveBeenCalledWith({ page: 2, limit: 5, status: 'PUBLISHED' });
  });
});

describe('useEvent', () => {
  it('fetches a single event by id', async () => {
    const mockEvent = { id: 'evt-1', title: 'Test Event' };
    vi.mocked(eventsApi.getById).mockResolvedValue(mockEvent as any);

    const { result } = renderHook(() => useEvent('evt-1'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(eventsApi.getById).toHaveBeenCalledWith('evt-1');
    expect(result.current.data).toEqual(mockEvent);
  });

  it('does not fetch when id is an empty string', () => {
    const { result } = renderHook(() => useEvent(''), { wrapper: createWrapper() });

    expect(result.current.isFetching).toBe(false);
    expect(eventsApi.getById).not.toHaveBeenCalled();
  });
});

describe('useEventCategories', () => {
  it('fetches event categories', async () => {
    const categories = [{ id: 'cat-1', value: 'Tech' }];
    vi.mocked(eventsApi.getCategories).mockResolvedValue(categories as any);

    const { result } = renderHook(() => useEventCategories(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(categories);
  });
});

describe('useSearchEventTags', () => {
  it('fetches tags when the search value is non-empty', async () => {
    vi.mocked(eventsApi.searchTags).mockResolvedValue([]);

    const { result } = renderHook(() => useSearchEventTags('react'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(eventsApi.searchTags).toHaveBeenCalledWith('react');
  });

  it('does not fetch when the search value is empty', () => {
    const { result } = renderHook(() => useSearchEventTags(''), { wrapper: createWrapper() });

    expect(result.current.isFetching).toBe(false);
    expect(eventsApi.searchTags).not.toHaveBeenCalled();
  });

  it('does not fetch when the search value is only whitespace', () => {
    const { result } = renderHook(() => useSearchEventTags('   '), { wrapper: createWrapper() });

    expect(result.current.isFetching).toBe(false);
  });
});

// ── Mutation hooks ─────────────────────────────────────────────────────────────

describe('useCreateEvent', () => {
  it('calls eventsApi.create with organizationId and data', async () => {
    vi.mocked(eventsApi.create).mockResolvedValue({ id: 'new-evt' } as any);

    const { result } = renderHook(() => useCreateEvent(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.mutate({ organizationId: 'org-1', title: 'New Event' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(eventsApi.create).toHaveBeenCalledWith('org-1', { title: 'New Event' });
  });
});

describe('useUpdateEvent', () => {
  it('calls eventsApi.update with the event id and payload', async () => {
    vi.mocked(eventsApi.update).mockResolvedValue({ id: 'evt-1' } as any);

    const { result } = renderHook(() => useUpdateEvent(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.mutate({ id: 'evt-1', title: 'Updated Title' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(eventsApi.update).toHaveBeenCalledWith('evt-1', { title: 'Updated Title' });
  });
});

describe('usePublishEvent', () => {
  it('calls eventsApi.publish with the event id', async () => {
    vi.mocked(eventsApi.publish).mockResolvedValue({} as any);

    const { result } = renderHook(() => usePublishEvent(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.mutate('evt-1');
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(eventsApi.publish).toHaveBeenCalledWith('evt-1');
  });
});

describe('useApproveEvent', () => {
  it('calls eventsApi.approve with the event id', async () => {
    vi.mocked(eventsApi.approve).mockResolvedValue({} as any);

    const { result } = renderHook(() => useApproveEvent(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.mutate('evt-1');
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(eventsApi.approve).toHaveBeenCalledWith('evt-1');
  });
});

describe('useCancelEvent', () => {
  it('calls eventsApi.cancel with the event id', async () => {
    vi.mocked(eventsApi.cancel).mockResolvedValue({} as any);

    const { result } = renderHook(() => useCancelEvent(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.mutate('evt-2');
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(eventsApi.cancel).toHaveBeenCalledWith('evt-2');
  });
});
