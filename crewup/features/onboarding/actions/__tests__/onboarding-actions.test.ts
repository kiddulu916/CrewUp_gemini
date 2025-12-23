import { describe, it, expect, vi, beforeEach } from 'vitest';
import { completeOnboarding, type OnboardingData } from '../onboarding-actions';

// Mock the Supabase client
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn(),
    },
    rpc: vi.fn(),
    from: vi.fn(() => ({
      update: vi.fn(() => ({
        eq: vi.fn(),
      })),
    })),
  })),
}));

// Mock next/navigation
vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}));

// Mock next/cache
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

// Mock next/headers
vi.mock('next/headers', () => ({
  cookies: vi.fn(() => Promise.resolve({})),
}));

describe('Onboarding Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('completeOnboarding', () => {
    const validOnboardingData: OnboardingData = {
      name: 'John Doe',
      phone: '(555)123-4567',
      email: 'john@example.com',
      role: 'worker',
      trade: 'Electrician',
      location: '123 Main St, City, State 12345',
      coords: { lat: 40.7128, lng: -74.006 },
      bio: 'Experienced electrician',
    };

    it('should successfully complete onboarding with coordinates', async () => {
      const mockSupabase = await import('@/lib/supabase/server').then(m =>
        m.createClient(await import('next/headers').then(h => h.cookies()))
      );

      vi.mocked(mockSupabase.auth.getUser).mockResolvedValue({
        data: {
          user: {
            id: 'test-user-id',
            email: 'john@example.com',
          } as any,
        },
        error: null,
      });

      vi.mocked(mockSupabase.rpc).mockResolvedValue({
        data: null,
        error: null,
      });

      const result = await completeOnboarding(validOnboardingData);

      expect(result).toEqual({ success: true });
      expect(mockSupabase.rpc).toHaveBeenCalledWith('update_profile_coords', {
        p_user_id: 'test-user-id',
        p_name: 'John Doe',
        p_phone: '(555)123-4567',
        p_email: 'john@example.com',
        p_role: 'worker',
        p_trade: 'Electrician',
        p_location: '123 Main St, City, State 12345',
        p_lng: -74.006,
        p_lat: 40.7128,
        p_bio: 'Experienced electrician',
        p_sub_trade: null,
        p_employer_type: null,
      });
    });

    it('should successfully complete onboarding without coordinates', async () => {
      const mockSupabase = await import('@/lib/supabase/server').then(m =>
        m.createClient(await import('next/headers').then(h => h.cookies()))
      );

      const dataWithoutCoords: OnboardingData = {
        ...validOnboardingData,
        coords: undefined,
      };

      vi.mocked(mockSupabase.auth.getUser).mockResolvedValue({
        data: {
          user: {
            id: 'test-user-id',
            email: 'john@example.com',
          } as any,
        },
        error: null,
      });

      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });

      vi.mocked(mockSupabase.from).mockReturnValue({
        update: mockUpdate,
      } as any);

      const result = await completeOnboarding(dataWithoutCoords);

      expect(result).toEqual({ success: true });
      expect(mockSupabase.from).toHaveBeenCalledWith('profiles');
      expect(mockUpdate).toHaveBeenCalledWith({
        name: 'John Doe',
        phone: '(555)123-4567',
        email: 'john@example.com',
        role: 'worker',
        trade: 'Electrician',
        location: '123 Main St, City, State 12345',
        bio: 'Experienced electrician',
        employer_type: null,
      });
    });

    it('should handle employer role with employer_type', async () => {
      const mockSupabase = await import('@/lib/supabase/server').then(m =>
        m.createClient(await import('next/headers').then(h => h.cookies()))
      );

      const employerData: OnboardingData = {
        ...validOnboardingData,
        role: 'employer',
        employer_type: 'contractor',
      };

      vi.mocked(mockSupabase.auth.getUser).mockResolvedValue({
        data: {
          user: {
            id: 'test-user-id',
            email: 'employer@example.com',
          } as any,
        },
        error: null,
      });

      vi.mocked(mockSupabase.rpc).mockResolvedValue({
        data: null,
        error: null,
      });

      await completeOnboarding(employerData);

      expect(mockSupabase.rpc).toHaveBeenCalledWith(
        'update_profile_coords',
        expect.objectContaining({
          p_role: 'employer',
          p_employer_type: 'contractor',
        })
      );
    });

    it('should handle sub_trade when provided', async () => {
      const mockSupabase = await import('@/lib/supabase/server').then(m =>
        m.createClient(await import('next/headers').then(h => h.cookies()))
      );

      const dataWithSubTrade: OnboardingData = {
        ...validOnboardingData,
        sub_trade: 'Residential',
      };

      vi.mocked(mockSupabase.auth.getUser).mockResolvedValue({
        data: {
          user: {
            id: 'test-user-id',
            email: 'john@example.com',
          } as any,
        },
        error: null,
      });

      vi.mocked(mockSupabase.rpc).mockResolvedValue({
        data: null,
        error: null,
      });

      await completeOnboarding(dataWithSubTrade);

      expect(mockSupabase.rpc).toHaveBeenCalledWith(
        'update_profile_coords',
        expect.objectContaining({
          p_sub_trade: 'Residential',
        })
      );
    });

    it('should return error when user is not authenticated', async () => {
      const mockSupabase = await import('@/lib/supabase/server').then(m =>
        m.createClient(await import('next/headers').then(h => h.cookies()))
      );

      vi.mocked(mockSupabase.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' } as any,
      });

      const result = await completeOnboarding(validOnboardingData);

      expect(result).toEqual({
        success: false,
        error: 'Not authenticated',
      });
    });

    it('should return error when RPC update fails', async () => {
      const mockSupabase = await import('@/lib/supabase/server').then(m =>
        m.createClient(await import('next/headers').then(h => h.cookies()))
      );

      vi.mocked(mockSupabase.auth.getUser).mockResolvedValue({
        data: {
          user: {
            id: 'test-user-id',
            email: 'john@example.com',
          } as any,
        },
        error: null,
      });

      vi.mocked(mockSupabase.rpc).mockResolvedValue({
        data: null,
        error: { message: 'Database error' } as any,
      });

      const result = await completeOnboarding(validOnboardingData);

      expect(result).toEqual({
        success: false,
        error: 'Database error',
      });
    });

    it('should use default location when not provided', async () => {
      const mockSupabase = await import('@/lib/supabase/server').then(m =>
        m.createClient(await import('next/headers').then(h => h.cookies()))
      );

      const dataWithoutLocation: OnboardingData = {
        ...validOnboardingData,
        location: '',
        coords: undefined,
      };

      vi.mocked(mockSupabase.auth.getUser).mockResolvedValue({
        data: {
          user: {
            id: 'test-user-id',
            email: 'john@example.com',
          } as any,
        },
        error: null,
      });

      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });

      vi.mocked(mockSupabase.from).mockReturnValue({
        update: mockUpdate,
      } as any);

      await completeOnboarding(dataWithoutLocation);

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          location: 'United States', // Default fallback
        })
      );
    });
  });
});
