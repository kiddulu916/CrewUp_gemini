import { describe, it, expect, vi, beforeEach } from 'vitest';
import { waitFor } from '@testing-library/react';
import {
  renderHookWithQuery,
  createMockSupabaseClient,
  createMockUser,
} from '@/tests/hooks-setup';

// Mock the Supabase client
vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(),
}));

import { createClient } from '@/lib/supabase/client';
import { usePublicProfile } from './use-public-profile';

const mockCreateClient = createClient as ReturnType<typeof vi.fn>;

describe('usePublicProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const validUserId = '123e4567-e89b-12d3-a456-426614174000';

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

    const { result } = renderHookWithQuery(() => usePublicProfile(validUserId));

    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeUndefined();
  });

  it('should fetch profile successfully', async () => {
    const mockProfile = {
      ...createMockUser({ id: validUserId, role: 'worker' }),
      workers: [{
        trade: 'Electricians',
        sub_trade: 'Inside Wireman',
        years_of_experience: 5,
        has_tools: true,
        tools_owned: ['Multimeter', 'Wire strippers'],
        trade_skills: ['Wiring', 'Troubleshooting'],
      }],
      contractors: null,
    };

    const mockClient = createMockSupabaseClient();
    mockClient.from = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: mockProfile, error: null }),
        }),
      }),
    });
    mockCreateClient.mockReturnValue(mockClient);

    const { result } = renderHookWithQuery(() => usePublicProfile(validUserId));

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.id).toBe(validUserId);
    expect(result.current.data?.trade).toBe('Electricians');
    expect(result.current.data?.sub_trade).toBe('Inside Wireman');
    expect(result.current.data?.years_of_experience).toBe(5);
    expect(result.current.data?.has_tools).toBe(true);
    expect(result.current.data?.tools_owned).toEqual(['Multimeter', 'Wire strippers']);
    expect(result.current.data?.skills).toEqual(['Wiring', 'Troubleshooting']);
  });

  it('should fetch employer profile with contractor data', async () => {
    const mockProfile = {
      ...createMockUser({ id: validUserId, role: 'employer', employer_type: 'contractor' }),
      workers: null,
      contractors: [{
        company_name: 'ABC Electric',
        website: 'https://abcelectric.com',
      }],
    };

    const mockClient = createMockSupabaseClient();
    mockClient.from = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: mockProfile, error: null }),
        }),
      }),
    });
    mockCreateClient.mockReturnValue(mockClient);

    const { result } = renderHookWithQuery(() => usePublicProfile(validUserId));

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.company_name).toBe('ABC Electric');
    expect(result.current.data?.role).toBe('employer');
  });

  it('should handle error state', async () => {
    const mockClient = createMockSupabaseClient();
    mockClient.from = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'User not found', code: 'PGRST116' },
          }),
        }),
      }),
    });
    mockCreateClient.mockReturnValue(mockClient);

    const { result } = renderHookWithQuery(() => usePublicProfile(validUserId));

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBeDefined();
  });

  it('should not fetch with invalid UUID', async () => {
    const mockClient = createMockSupabaseClient();
    const mockFrom = vi.fn();
    mockClient.from = mockFrom;
    mockCreateClient.mockReturnValue(mockClient);

    const { result } = renderHookWithQuery(() => usePublicProfile('invalid-uuid'));

    // Query should not be enabled
    expect(result.current.fetchStatus).toBe('idle');
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('should not fetch with empty userId', async () => {
    const mockClient = createMockSupabaseClient();
    const mockFrom = vi.fn();
    mockClient.from = mockFrom;
    mockCreateClient.mockReturnValue(mockClient);

    const { result } = renderHookWithQuery(() => usePublicProfile(''));

    expect(result.current.fetchStatus).toBe('idle');
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('should handle profile without worker or contractor data', async () => {
    const mockProfile = {
      ...createMockUser({ id: validUserId }),
      workers: [],
      contractors: [],
    };

    const mockClient = createMockSupabaseClient();
    mockClient.from = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: mockProfile, error: null }),
        }),
      }),
    });
    mockCreateClient.mockReturnValue(mockClient);

    const { result } = renderHookWithQuery(() => usePublicProfile(validUserId));

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.trade).toBeUndefined();
    expect(result.current.data?.company_name).toBeUndefined();
  });

  it('should validate UUID format correctly', async () => {
    const mockClient = createMockSupabaseClient();
    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: createMockUser({ id: validUserId }),
            error: null,
          }),
        }),
      }),
    });
    mockClient.from = mockFrom;
    mockCreateClient.mockReturnValue(mockClient);

    // Valid UUID formats
    const validUUIDs = [
      '123e4567-e89b-12d3-a456-426614174000',
      'A23E4567-E89B-12D3-A456-426614174000', // uppercase
      '00000000-0000-0000-0000-000000000000',
    ];

    for (const uuid of validUUIDs) {
      vi.clearAllMocks();
      mockClient.from = mockFrom;
      mockCreateClient.mockReturnValue(mockClient);

      renderHookWithQuery(() => usePublicProfile(uuid));

      await waitFor(() => {
        expect(mockFrom).toHaveBeenCalled();
      });
    }
  });

  it('should reject invalid UUID formats', () => {
    const mockClient = createMockSupabaseClient();
    const mockFrom = vi.fn();
    mockClient.from = mockFrom;
    mockCreateClient.mockReturnValue(mockClient);

    const invalidUUIDs = [
      '123e4567-e89b-12d3-a456', // too short
      '123e4567-e89b-12d3-a456-426614174000-extra', // too long
      '123g4567-e89b-12d3-a456-426614174000', // invalid character
      'not-a-uuid',
    ];

    for (const uuid of invalidUUIDs) {
      vi.clearAllMocks();
      mockClient.from = mockFrom;
      mockCreateClient.mockReturnValue(mockClient);

      renderHookWithQuery(() => usePublicProfile(uuid));

      expect(mockFrom).not.toHaveBeenCalled();
    }
  });
});
