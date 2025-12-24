import { describe, it, expect, vi, beforeEach } from 'vitest';
import { signUp, signIn, signOut } from '../auth-actions';

// Create mock functions
const mockSignUp = vi.fn();
const mockSignInWithPassword = vi.fn();
const mockSignOut = vi.fn();
const mockGetUser = vi.fn();
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockSingle = vi.fn();
const mockFrom = vi.fn();

// Mock the Supabase client
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => ({
    auth: {
      signUp: mockSignUp,
      signInWithPassword: mockSignInWithPassword,
      signOut: mockSignOut,
      getUser: mockGetUser,
    },
    from: mockFrom,
  })),
}));

// Mock next/navigation
vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT: ${url}`);
  }),
}));

// Mock next/cache
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

// Mock next/headers
vi.mock('next/headers', () => ({
  cookies: vi.fn(() => Promise.resolve({})),
}));

describe('Auth Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('signUp', () => {
    it('should successfully sign up a new user', async () => {
      mockSignUp.mockResolvedValue({
        data: {
          user: {
            id: 'test-user-id',
            email: 'test@example.com',
          },
          session: null,
        },
        error: null,
      });

      const result = await signUp('test@example.com', 'password123', 'Test User');

      expect(result).toEqual({ success: true });
      expect(mockSignUp).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
        options: {
          data: {
            full_name: 'Test User',
          },
        },
      });
    });

    it('should return error when signup fails', async () => {
      mockSignUp.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'User already exists' },
      });

      const result = await signUp('existing@example.com', 'password123', 'Existing User');

      expect(result).toEqual({
        success: false,
        error: 'User already exists',
      });
    });

    it('should handle empty name parameter', async () => {
      mockSignUp.mockResolvedValue({
        data: {
          user: {
            id: 'test-user-id',
            email: 'test@example.com',
          },
          session: null,
        },
        error: null,
      });

      await signUp('test@example.com', 'password123');

      expect(mockSignUp).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
        options: {
          data: {
            full_name: undefined,
          },
        },
      });
    });
  });

  describe('signIn', () => {
    it('should successfully sign in a user and redirect to onboarding', async () => {
      const mockSupabase = await import('@/lib/supabase/server').then(m => m.createClient(await import('next/headers').then(h => h.cookies())));
      const mockRedirect = await import('next/navigation').then(m => m.redirect);

      vi.mocked(mockSupabase.auth.signInWithPassword).mockResolvedValue({
        data: {
          user: { id: 'test-user-id', email: 'test@example.com' },
          session: { access_token: 'test-token' } as any,
        },
        error: null,
      } as any);

      vi.mocked(mockSupabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                id: 'test-user-id',
                name: 'User-abc123', // Incomplete profile
                location: 'Update your location',
              },
              error: null,
            }),
          }),
        }),
      } as any);

      try {
        await signIn('test@example.com', 'password123');
      } catch (error: any) {
        // Expect redirect to throw
        expect(error.message).toContain('NEXT_REDIRECT');
        expect(error.message).toContain('/onboarding');
      }

      expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
    });

    it('should redirect to dashboard for complete profiles', async () => {
      const mockSupabase = await import('@/lib/supabase/server').then(m => m.createClient(await import('next/headers').then(h => h.cookies())));

      vi.mocked(mockSupabase.auth.signInWithPassword).mockResolvedValue({
        data: {
          user: { id: 'test-user-id', email: 'test@example.com' },
          session: { access_token: 'test-token' } as any,
        },
        error: null,
      } as any);

      vi.mocked(mockSupabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                id: 'test-user-id',
                name: 'John Doe', // Complete profile
                location: '123 Main St',
                trade: 'Electrician',
              },
              error: null,
            }),
          }),
        }),
      } as any);

      try {
        await signIn('test@example.com', 'password123');
      } catch (error: any) {
        expect(error.message).toContain('/dashboard/feed');
      }
    });

    it('should return error when credentials are invalid', async () => {
      const mockSupabase = await import('@/lib/supabase/server').then(m => m.createClient(await import('next/headers').then(h => h.cookies())));

      vi.mocked(mockSupabase.auth.signInWithPassword).mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Invalid credentials' } as any,
      } as any);

      const result = await signIn('wrong@example.com', 'wrongpassword');

      expect(result).toEqual({
        success: false,
        error: 'Invalid credentials',
      });
    });
  });

  describe('signOut', () => {
    it('should successfully sign out a user', async () => {
      const mockSupabase = await import('@/lib/supabase/server').then(m => m.createClient(await import('next/headers').then(h => h.cookies())));

      vi.mocked(mockSupabase.auth.signOut).mockResolvedValue({
        error: null,
      });

      try {
        await signOut();
      } catch (error: any) {
        // Expect redirect to throw
        expect(error.message).toContain('NEXT_REDIRECT');
        expect(error.message).toContain('/login');
      }

      expect(mockSupabase.auth.signOut).toHaveBeenCalled();
    });

    it('should handle sign out errors', async () => {
      const mockSupabase = await import('@/lib/supabase/server').then(m => m.createClient(await import('next/headers').then(h => h.cookies())));

      vi.mocked(mockSupabase.auth.signOut).mockResolvedValue({
        error: { message: 'Sign out failed' } as any,
      });

      const result = await signOut();

      expect(result).toEqual({
        success: false,
        error: 'Sign out failed',
      });
    });
  });
});
