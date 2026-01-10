import { describe, it, expect, vi, beforeEach } from 'vitest';
import { waitFor } from '@testing-library/react';
import {
  renderHookWithQuery,
  createMockSupabaseClient,
  mockSupabaseSuccess,
  mockSupabaseError,
  createMockJob,
} from '@/tests/hooks-setup';

// Mock the Supabase client
vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(),
}));

import { createClient } from '@/lib/supabase/client';
import { useJobs, useInfiniteJobs, type JobFilters } from './use-jobs';

const mockCreateClient = createClient as ReturnType<typeof vi.fn>;

describe('useJobs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return loading state initially', () => {
    const mockClient = createMockSupabaseClient({
      jobs: { data: null, error: null },
    });
    // Make the query never resolve
    mockClient.from = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue(new Promise(() => {})),
          }),
        }),
      }),
    });
    mockCreateClient.mockReturnValue(mockClient);

    const { result } = renderHookWithQuery(() => useJobs());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeUndefined();
  });

  it('should fetch jobs successfully', async () => {
    const mockJobs = [
      { ...createMockJob({ id: 'job-1', title: 'Electrician Needed' }), users: { first_name: 'John', last_name: 'Doe' } },
      { ...createMockJob({ id: 'job-2', title: 'Plumber Wanted' }), users: { first_name: 'Jane', last_name: 'Smith' } },
    ];

    const mockClient = createMockSupabaseClient();
    mockClient.from = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: mockJobs, error: null }),
          }),
        }),
      }),
    });
    mockCreateClient.mockReturnValue(mockClient);

    const { result } = renderHookWithQuery(() => useJobs());

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toHaveLength(2);
    expect(result.current.data?.[0].employer_name).toBe('John Doe');
    expect(result.current.data?.[1].employer_name).toBe('Jane Smith');
  });

  it('should handle empty results', async () => {
    const mockClient = createMockSupabaseClient();
    mockClient.from = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
      }),
    });
    mockCreateClient.mockReturnValue(mockClient);

    const { result } = renderHookWithQuery(() => useJobs());

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual([]);
  });

  it('should handle error state', async () => {
    const mockClient = createMockSupabaseClient();
    mockClient.from = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database error', code: 'PGRST001' },
            }),
          }),
        }),
      }),
    });
    mockCreateClient.mockReturnValue(mockClient);

    const { result } = renderHookWithQuery(() => useJobs());

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBeDefined();
  });

  it('should apply trade filter', async () => {
    const mockJobs = [
      { ...createMockJob({ trades: ['Electricians'] }), users: { first_name: 'John', last_name: 'Doe' } },
    ];

    const mockContains = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ data: mockJobs, error: null }),
    });

    const mockClient = createMockSupabaseClient();
    mockClient.from = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            contains: mockContains,
          }),
        }),
      }),
    });
    mockCreateClient.mockReturnValue(mockClient);

    const filters: JobFilters = { trade: 'Electricians' };
    const { result } = renderHookWithQuery(() => useJobs(filters));

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockContains).toHaveBeenCalledWith('trades', ['Electricians']);
  });

  it('should apply job type filter', async () => {
    const mockJobs = [
      { ...createMockJob({ job_type: 'full-time' }), users: { first_name: 'John', last_name: 'Doe' } },
    ];

    const mockEq = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ data: mockJobs, error: null }),
    });

    const mockClient = createMockSupabaseClient();
    mockClient.from = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            eq: mockEq,
          }),
        }),
      }),
    });
    mockCreateClient.mockReturnValue(mockClient);

    const filters: JobFilters = { jobType: 'full-time' };
    const { result } = renderHookWithQuery(() => useJobs(filters));

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockEq).toHaveBeenCalledWith('job_type', 'full-time');
  });

  it('should apply minPay filter', async () => {
    const mockJobs = [
      { ...createMockJob({ pay_min: 30 }), users: { first_name: 'John', last_name: 'Doe' } },
    ];

    const mockGte = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ data: mockJobs, error: null }),
    });

    const mockClient = createMockSupabaseClient();
    mockClient.from = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            gte: mockGte,
          }),
        }),
      }),
    });
    mockCreateClient.mockReturnValue(mockClient);

    const filters: JobFilters = { minPay: 25 };
    const { result } = renderHookWithQuery(() => useJobs(filters));

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockGte).toHaveBeenCalledWith('pay_min', 25);
  });

  it('should apply custom status filter', async () => {
    const mockJobs = [
      { ...createMockJob({ status: 'closed' }), users: { first_name: 'John', last_name: 'Doe' } },
    ];

    const mockEq = vi.fn().mockResolvedValue({ data: mockJobs, error: null });

    const mockClient = createMockSupabaseClient();
    mockClient.from = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            eq: mockEq,
          }),
        }),
      }),
    });
    mockCreateClient.mockReturnValue(mockClient);

    const filters: JobFilters = { status: 'closed' };
    const { result } = renderHookWithQuery(() => useJobs(filters));

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockEq).toHaveBeenCalledWith('status', 'closed');
  });

  it('should apply employer filter', async () => {
    const mockJobs = [
      { ...createMockJob({ employer_id: 'emp-123' }), users: { first_name: 'John', last_name: 'Doe' } },
    ];

    const mockEq = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ data: mockJobs, error: null }),
    });

    const mockClient = createMockSupabaseClient();
    mockClient.from = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: mockEq,
            }),
          }),
        }),
      }),
    });
    mockCreateClient.mockReturnValue(mockClient);

    const filters: JobFilters = { employerId: 'emp-123' };
    const { result } = renderHookWithQuery(() => useJobs(filters));

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockEq).toHaveBeenCalledWith('employer_id', 'emp-123');
  });

  it('should handle missing user data gracefully', async () => {
    const mockJobs = [
      { ...createMockJob({ id: 'job-1' }), users: null },
    ];

    const mockClient = createMockSupabaseClient();
    mockClient.from = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: mockJobs, error: null }),
          }),
        }),
      }),
    });
    mockCreateClient.mockReturnValue(mockClient);

    const { result } = renderHookWithQuery(() => useJobs());

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.[0].employer_name).toBe('Unknown Employer');
  });
});

describe('useInfiniteJobs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch first page of jobs', async () => {
    const mockJobs = [
      { ...createMockJob({ id: 'job-1' }), users: { first_name: 'John', last_name: 'Doe' } },
    ];

    const mockClient = createMockSupabaseClient();
    mockClient.from = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          range: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: mockJobs, error: null, count: 1 }),
          }),
        }),
      }),
    });
    mockCreateClient.mockReturnValue(mockClient);

    const { result } = renderHookWithQuery(() => useInfiniteJobs());

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.pages[0].jobs).toHaveLength(1);
    expect(result.current.data?.pages[0].totalCount).toBe(1);
  });

  it('should indicate when there are more pages', async () => {
    const mockJobs = Array(20).fill(null).map((_, i) => ({
      ...createMockJob({ id: `job-${i}` }),
      users: { first_name: 'John', last_name: 'Doe' },
    }));

    const mockClient = createMockSupabaseClient();
    mockClient.from = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          range: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: mockJobs, error: null, count: 50 }),
          }),
        }),
      }),
    });
    mockCreateClient.mockReturnValue(mockClient);

    const { result } = renderHookWithQuery(() => useInfiniteJobs());

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.pages[0].nextPage).toBe(1);
    expect(result.current.hasNextPage).toBe(true);
  });

  it('should indicate no more pages when all loaded', async () => {
    const mockJobs = [
      { ...createMockJob({ id: 'job-1' }), users: { first_name: 'John', last_name: 'Doe' } },
    ];

    const mockClient = createMockSupabaseClient();
    mockClient.from = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          range: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: mockJobs, error: null, count: 1 }),
          }),
        }),
      }),
    });
    mockCreateClient.mockReturnValue(mockClient);

    const { result } = renderHookWithQuery(() => useInfiniteJobs());

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.pages[0].nextPage).toBeUndefined();
    expect(result.current.hasNextPage).toBe(false);
  });

  it('should handle error state', async () => {
    const mockClient = createMockSupabaseClient();
    mockClient.from = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          range: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database error' },
              count: null,
            }),
          }),
        }),
      }),
    });
    mockCreateClient.mockReturnValue(mockClient);

    const { result } = renderHookWithQuery(() => useInfiniteJobs());

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });

  it('should apply filters to infinite query', async () => {
    const mockJobs = [
      { ...createMockJob({ trades: ['Electricians'] }), users: { first_name: 'John', last_name: 'Doe' } },
    ];

    const mockContains = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ data: mockJobs, error: null, count: 1 }),
    });

    const mockClient = createMockSupabaseClient();
    mockClient.from = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          range: vi.fn().mockReturnValue({
            contains: mockContains,
          }),
        }),
      }),
    });
    mockCreateClient.mockReturnValue(mockClient);

    const filters: JobFilters = { trade: 'Electricians' };
    const { result } = renderHookWithQuery(() => useInfiniteJobs(filters));

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockContains).toHaveBeenCalledWith('trades', ['Electricians']);
  });
});
