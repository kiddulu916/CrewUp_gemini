import { describe, it, expect, vi, beforeEach } from 'vitest';
import { waitFor } from '@testing-library/react';
import { renderHookWithQuery, createMockSupabaseClient, createMockJob } from '@/tests/hooks-setup';

// Mock the Supabase client
vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(),
}));

import { createClient } from '@/lib/supabase/client';
import { useJob } from './use-job';

const mockCreateClient = createClient as ReturnType<typeof vi.fn>;

describe('useJob', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return loading state initially', () => {
    const mockClient = createMockSupabaseClient();
    mockClient.from = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockReturnValue(new Promise(() => {})),
        }),
      }),
    });
    mockCreateClient.mockReturnValue(mockClient);

    const { result } = renderHookWithQuery(() => useJob('job-123'));

    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeUndefined();
  });

  it('should fetch job successfully', async () => {
    const mockJobData = {
      ...createMockJob({ id: 'job-123' }),
      users: {
        first_name: 'John',
        last_name: 'Doe',
        company_name: 'ABC Electric',
      },
    };

    const mockClient = createMockSupabaseClient();
    mockClient.from = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: mockJobData, error: null }),
        }),
      }),
    });
    mockCreateClient.mockReturnValue(mockClient);

    const { result } = renderHookWithQuery(() => useJob('job-123'));

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.id).toBe('job-123');
    expect(result.current.data?.employer_name).toBe('ABC Electric');
  });

  it('should use company_name over full name when available', async () => {
    const mockJobData = {
      ...createMockJob({ id: 'job-456' }),
      users: {
        first_name: 'John',
        last_name: 'Doe',
        company_name: 'Best Contractors LLC',
      },
    };

    const mockClient = createMockSupabaseClient();
    mockClient.from = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: mockJobData, error: null }),
        }),
      }),
    });
    mockCreateClient.mockReturnValue(mockClient);

    const { result } = renderHookWithQuery(() => useJob('job-456'));

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.employer_name).toBe('Best Contractors LLC');
  });

  it('should fall back to full name when company_name is not set', async () => {
    const mockJobData = {
      ...createMockJob({ id: 'job-789' }),
      users: {
        first_name: 'Jane',
        last_name: 'Smith',
        company_name: null,
      },
    };

    const mockClient = createMockSupabaseClient();
    mockClient.from = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: mockJobData, error: null }),
        }),
      }),
    });
    mockCreateClient.mockReturnValue(mockClient);

    const { result } = renderHookWithQuery(() => useJob('job-789'));

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.employer_name).toBe('Jane Smith');
  });

  it('should handle error when job not found', async () => {
    const mockClient = createMockSupabaseClient();
    mockClient.from = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Job not found', code: 'PGRST116' },
          }),
        }),
      }),
    });
    mockCreateClient.mockReturnValue(mockClient);

    const { result } = renderHookWithQuery(() => useJob('nonexistent-job'));

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });

  it('should not fetch when jobId is undefined', () => {
    const mockClient = createMockSupabaseClient();
    const mockFrom = vi.fn();
    mockClient.from = mockFrom;
    mockCreateClient.mockReturnValue(mockClient);

    const { result } = renderHookWithQuery(() => useJob(undefined));

    expect(result.current.fetchStatus).toBe('idle');
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('should not fetch when jobId is empty string', () => {
    const mockClient = createMockSupabaseClient();
    const mockFrom = vi.fn();
    mockClient.from = mockFrom;
    mockCreateClient.mockReturnValue(mockClient);

    const { result } = renderHookWithQuery(() => useJob(''));

    expect(result.current.fetchStatus).toBe('idle');
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('should remove nested users object from returned data', async () => {
    const mockJobData = {
      ...createMockJob({ id: 'job-abc' }),
      users: {
        first_name: 'Test',
        last_name: 'User',
        company_name: 'Test Co',
      },
    };

    const mockClient = createMockSupabaseClient();
    mockClient.from = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: mockJobData, error: null }),
        }),
      }),
    });
    mockCreateClient.mockReturnValue(mockClient);

    const { result } = renderHookWithQuery(() => useJob('job-abc'));

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // Should have employer_name but not the nested users object
    expect(result.current.data?.employer_name).toBe('Test Co');
    expect((result.current.data as any)?.users).toBeUndefined();
  });

  it('should handle employer with missing data', async () => {
    const mockJobData = {
      ...createMockJob({ id: 'job-xyz' }),
      users: null,
    };

    const mockClient = createMockSupabaseClient();
    mockClient.from = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: mockJobData, error: null }),
        }),
      }),
    });
    mockCreateClient.mockReturnValue(mockClient);

    const { result } = renderHookWithQuery(() => useJob('job-xyz'));

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.employer_name).toBe('Unknown Employer');
  });
});
