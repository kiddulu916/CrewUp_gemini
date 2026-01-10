import { describe, it, expect, vi, beforeEach } from 'vitest';
import { waitFor } from '@testing-library/react';
import { renderHookWithQuery, createMockSupabaseClient, createMockUser } from '@/tests/hooks-setup';

// Mock the Supabase client
vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(),
}));

import { createClient } from '@/lib/supabase/client';
import { useAuth, useIsEmployer, useIsWorker, useHasProSubscription } from './use-auth';

const mockCreateClient = createClient as ReturnType<typeof vi.fn>;

describe('useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return loading state initially', () => {
    const mockClient = createMockSupabaseClient();
    mockClient.auth.getUser = vi.fn().mockReturnValue(new Promise(() => {}));
    mockCreateClient.mockReturnValue(mockClient);

    const { result } = renderHookWithQuery(() => useAuth());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeUndefined();
  });

  it('should return null when not authenticated', async () => {
    const mockClient = createMockSupabaseClient();
    mockClient.auth.getUser = vi.fn().mockResolvedValue({
      data: { user: null },
      error: null,
    });
    mockCreateClient.mockReturnValue(mockClient);

    const { result } = renderHookWithQuery(() => useAuth());

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toBeNull();
  });

  it('should return user and profile when authenticated', async () => {
    const mockUser = { id: 'user-123', email: 'test@example.com', user_metadata: {} };
    const mockUserData = {
      id: 'user-123',
      first_name: 'John',
      last_name: 'Doe',
      email: 'test@example.com',
      role: 'worker',
      location: 'Austin, TX',
      subscription_status: 'free',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      workers: [
        {
          trade: 'Electricians',
          sub_trade: 'Inside Wireman (Commercial)',
          is_profile_boosted: false,
        },
      ],
    };

    const mockClient = createMockSupabaseClient();
    mockClient.auth.getUser = vi.fn().mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });
    mockClient.from = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: mockUserData, error: null }),
        }),
      }),
    });
    mockCreateClient.mockReturnValue(mockClient);

    const { result } = renderHookWithQuery(() => useAuth());

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toBeDefined();
    expect(result.current.data?.user.id).toBe('user-123');
    expect(result.current.data?.profile.name).toBe('John Doe');
    expect(result.current.data?.profile.trade).toBe('Electricians');
    expect(result.current.data?.profile.role).toBe('worker');
  });

  it('should handle auth error', async () => {
    const mockClient = createMockSupabaseClient();
    mockClient.auth.getUser = vi.fn().mockResolvedValue({
      data: { user: null },
      error: { message: 'Session expired' },
    });
    mockCreateClient.mockReturnValue(mockClient);

    const { result } = renderHookWithQuery(() => useAuth());

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });

  it('should handle profile fetch error', async () => {
    const mockUser = { id: 'user-123', email: 'test@example.com', user_metadata: {} };

    const mockClient = createMockSupabaseClient();
    mockClient.auth.getUser = vi.fn().mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });
    mockClient.from = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Profile not found' },
          }),
        }),
      }),
    });
    mockCreateClient.mockReturnValue(mockClient);

    const { result } = renderHookWithQuery(() => useAuth());

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });

  it('should default trade to General Laborer when worker data is missing', async () => {
    const mockUser = { id: 'user-123', email: 'test@example.com', user_metadata: {} };
    const mockUserData = {
      id: 'user-123',
      first_name: 'Jane',
      last_name: 'Smith',
      email: 'jane@example.com',
      role: 'worker',
      location: 'Houston, TX',
      subscription_status: 'free',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      workers: [], // No worker record
    };

    const mockClient = createMockSupabaseClient();
    mockClient.auth.getUser = vi.fn().mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });
    mockClient.from = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: mockUserData, error: null }),
        }),
      }),
    });
    mockCreateClient.mockReturnValue(mockClient);

    const { result } = renderHookWithQuery(() => useAuth());

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.profile.trade).toBe('General Laborer');
    expect(result.current.data?.profile.is_profile_boosted).toBe(false);
  });

  it('should handle Pro subscription status', async () => {
    const mockUser = { id: 'user-123', email: 'test@example.com', user_metadata: {} };
    const mockUserData = {
      id: 'user-123',
      first_name: 'Pro',
      last_name: 'User',
      email: 'pro@example.com',
      role: 'worker',
      location: 'Dallas, TX',
      subscription_status: 'pro',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      workers: [{ trade: 'Plumbers', is_profile_boosted: true }],
    };

    const mockClient = createMockSupabaseClient();
    mockClient.auth.getUser = vi.fn().mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });
    mockClient.from = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: mockUserData, error: null }),
        }),
      }),
    });
    mockCreateClient.mockReturnValue(mockClient);

    const { result } = renderHookWithQuery(() => useAuth());

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.profile.subscription_status).toBe('pro');
    expect(result.current.data?.profile.is_profile_boosted).toBe(true);
  });
});

describe('useIsEmployer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return true for employers', async () => {
    const mockUser = { id: 'user-123', email: 'employer@example.com', user_metadata: {} };
    const mockUserData = {
      id: 'user-123',
      first_name: 'Employer',
      last_name: 'User',
      email: 'employer@example.com',
      role: 'employer',
      subscription_status: 'free',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      workers: null,
    };

    const mockClient = createMockSupabaseClient();
    mockClient.auth.getUser = vi.fn().mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });
    mockClient.from = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: mockUserData, error: null }),
        }),
      }),
    });
    mockCreateClient.mockReturnValue(mockClient);

    const { result } = renderHookWithQuery(() => useIsEmployer());

    await waitFor(() => {
      expect(result.current).toBe(true);
    });
  });

  it('should return false for workers', async () => {
    const mockUser = { id: 'user-123', email: 'worker@example.com', user_metadata: {} };
    const mockUserData = {
      id: 'user-123',
      first_name: 'Worker',
      last_name: 'User',
      email: 'worker@example.com',
      role: 'worker',
      subscription_status: 'free',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      workers: [{ trade: 'Carpenters' }],
    };

    const mockClient = createMockSupabaseClient();
    mockClient.auth.getUser = vi.fn().mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });
    mockClient.from = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: mockUserData, error: null }),
        }),
      }),
    });
    mockCreateClient.mockReturnValue(mockClient);

    const { result } = renderHookWithQuery(() => useIsEmployer());

    await waitFor(() => {
      expect(result.current).toBe(false);
    });
  });
});

describe('useIsWorker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return true for workers', async () => {
    const mockUser = { id: 'user-123', email: 'worker@example.com', user_metadata: {} };
    const mockUserData = {
      id: 'user-123',
      first_name: 'Worker',
      last_name: 'User',
      email: 'worker@example.com',
      role: 'worker',
      subscription_status: 'free',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      workers: [{ trade: 'HVAC' }],
    };

    const mockClient = createMockSupabaseClient();
    mockClient.auth.getUser = vi.fn().mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });
    mockClient.from = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: mockUserData, error: null }),
        }),
      }),
    });
    mockCreateClient.mockReturnValue(mockClient);

    const { result } = renderHookWithQuery(() => useIsWorker());

    await waitFor(() => {
      expect(result.current).toBe(true);
    });
  });

  it('should return false for employers', async () => {
    const mockUser = { id: 'user-123', email: 'employer@example.com', user_metadata: {} };
    const mockUserData = {
      id: 'user-123',
      first_name: 'Employer',
      last_name: 'User',
      email: 'employer@example.com',
      role: 'employer',
      subscription_status: 'free',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      workers: null,
    };

    const mockClient = createMockSupabaseClient();
    mockClient.auth.getUser = vi.fn().mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });
    mockClient.from = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: mockUserData, error: null }),
        }),
      }),
    });
    mockCreateClient.mockReturnValue(mockClient);

    const { result } = renderHookWithQuery(() => useIsWorker());

    await waitFor(() => {
      expect(result.current).toBe(false);
    });
  });
});

describe('useHasProSubscription', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return true for Pro users', async () => {
    const mockUser = { id: 'user-123', email: 'pro@example.com', user_metadata: {} };
    const mockUserData = {
      id: 'user-123',
      first_name: 'Pro',
      last_name: 'User',
      email: 'pro@example.com',
      role: 'worker',
      subscription_status: 'pro',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      workers: [{ trade: 'Electricians' }],
    };

    const mockClient = createMockSupabaseClient();
    mockClient.auth.getUser = vi.fn().mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });
    mockClient.from = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: mockUserData, error: null }),
        }),
      }),
    });
    mockCreateClient.mockReturnValue(mockClient);

    const { result } = renderHookWithQuery(() => useHasProSubscription());

    await waitFor(() => {
      expect(result.current).toBe(true);
    });
  });

  it('should return false for free users', async () => {
    const mockUser = { id: 'user-123', email: 'free@example.com', user_metadata: {} };
    const mockUserData = {
      id: 'user-123',
      first_name: 'Free',
      last_name: 'User',
      email: 'free@example.com',
      role: 'worker',
      subscription_status: 'free',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      workers: [{ trade: 'Plumbers' }],
    };

    const mockClient = createMockSupabaseClient();
    mockClient.auth.getUser = vi.fn().mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });
    mockClient.from = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: mockUserData, error: null }),
        }),
      }),
    });
    mockCreateClient.mockReturnValue(mockClient);

    const { result } = renderHookWithQuery(() => useHasProSubscription());

    await waitFor(() => {
      expect(result.current).toBe(false);
    });
  });
});
