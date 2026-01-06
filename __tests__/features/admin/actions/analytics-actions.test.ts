import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getActiveUsers, getConversionFunnel, getSubscriptionMetrics, getOperationalLoad } from '@/features/admin/actions/analytics-actions';
import type { DateRangeValue } from '@/components/admin/date-range-picker';

// Mock Next.js cookies
vi.mock('next/headers', () => ({
  cookies: vi.fn(() => Promise.resolve({})),
}));

// Mock Supabase client
const createMockChain = () => {
  const mockChain: {
    select: ReturnType<typeof vi.fn>;
    gte: ReturnType<typeof vi.fn>;
    lte: ReturnType<typeof vi.fn>;
    in: ReturnType<typeof vi.fn>;
    limit: ReturnType<typeof vi.fn>;
    eq: ReturnType<typeof vi.fn>;
    single: ReturnType<typeof vi.fn>;
    not: ReturnType<typeof vi.fn>;
    data: any;
    error: any;
    count: number;
  } = {
    select: vi.fn(() => mockChain),
    gte: vi.fn(() => mockChain),
    lte: vi.fn(() => mockChain),
    in: vi.fn(() => mockChain),
    limit: vi.fn(() => mockChain),
    eq: vi.fn(() => mockChain),
    single: vi.fn(() => mockChain),
    not: vi.fn(() => mockChain),
    data: [],
    error: null,
    count: 0,
  };
  return mockChain;
};

const mockSupabaseClient = {
  from: vi.fn(() => createMockChain()),
  auth: {
    getUser: vi.fn(() => Promise.resolve({
      data: { user: { id: 'test-user-id' } },
      error: null,
    })),
  },
};

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabaseClient)),
}));

describe('Analytics Actions', () => {
  describe('getActiveUsers', () => {
    it('returns DAU/WAU/MAU metrics', async () => {
      const dateRange: DateRangeValue = {
        preset: 'last7days',
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-01-08'),
      };

      const result = await getActiveUsers(dateRange, {});

      expect(result).toHaveProperty('dau');
      expect(result).toHaveProperty('wau');
      expect(result).toHaveProperty('mau');
      expect(result.dau).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getConversionFunnel', () => {
    beforeEach(() => {
      // Reset mocks and set default admin authorization
      vi.clearAllMocks();
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'test-user-id' } },
        error: null,
      });
      mockSupabaseClient.from.mockReturnValue(createMockChain());
    });

    it('returns conversion funnel stages with correct structure', async () => {
      const dateRange: DateRangeValue = {
        preset: 'last30days',
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-01-31'),
      };

      // Mock admin role check
      const mockProfileChain = createMockChain();
      mockProfileChain.data = { role: 'admin' };
      mockSupabaseClient.from.mockReturnValueOnce(mockProfileChain);

      const result = await getConversionFunnel(dateRange, {});

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(3);

      // Check first stage (Signup)
      expect(result[0]).toHaveProperty('stage', 'Signup');
      expect(result[0]).toHaveProperty('count');
      expect(result[0]).toHaveProperty('percentage', 100);
      expect(result[0]).toHaveProperty('dropOffRate', null);

      // Check second stage (Profile Complete)
      expect(result[1]).toHaveProperty('stage', 'Profile Complete');
      expect(result[1]).toHaveProperty('count');
      expect(result[1]).toHaveProperty('percentage');
      expect(result[1]).toHaveProperty('dropOffRate');

      // Check third stage (First Action)
      expect(result[2]).toHaveProperty('stage', 'First Action');
      expect(result[2]).toHaveProperty('count');
      expect(result[2]).toHaveProperty('percentage');
      expect(result[2]).toHaveProperty('dropOffRate');
    });

    it('returns zero counts when no data is available', async () => {
      const dateRange: DateRangeValue = {
        preset: 'last7days',
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-01-08'),
      };

      // Mock admin role check
      const mockProfileChain = createMockChain();
      mockProfileChain.data = { role: 'admin' };
      mockSupabaseClient.from.mockReturnValueOnce(mockProfileChain);

      const result = await getConversionFunnel(dateRange, {});

      // With mocked empty data, all counts should be 0
      expect(result[0].count).toBe(0);
      expect(result[1].count).toBe(0);
      expect(result[2].count).toBe(0);
    });

    it('throws error when user is not authenticated', async () => {
      const dateRange: DateRangeValue = {
        preset: 'last7days',
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-01-08'),
      };

      // Mock unauthenticated user
      mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
        data: { user: null },
        error: null,
      } as any);

      await expect(getConversionFunnel(dateRange, {})).rejects.toThrow(
        'Unauthorized: User not authenticated'
      );
    });

    it('throws error when user is not admin', async () => {
      const dateRange: DateRangeValue = {
        preset: 'last7days',
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-01-08'),
      };

      // Mock non-admin user
      const mockProfileChain = createMockChain();
      mockProfileChain.data = { role: 'user' };
      mockSupabaseClient.from.mockReturnValueOnce(mockProfileChain);

      await expect(getConversionFunnel(dateRange, {})).rejects.toThrow(
        'Forbidden: Admin access required'
      );
    });

    it('throws error when signups query fails', async () => {
      const dateRange: DateRangeValue = {
        preset: 'last7days',
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-01-08'),
      };

      // Mock admin role check
      const mockProfileChain = createMockChain();
      mockProfileChain.data = { role: 'admin' };
      mockSupabaseClient.from.mockReturnValueOnce(mockProfileChain);

      // Mock signups query error
      const mockSignupsChain = createMockChain();
      mockSignupsChain.error = { message: 'Database connection failed' };
      mockSupabaseClient.from.mockReturnValueOnce(mockSignupsChain);

      await expect(getConversionFunnel(dateRange, {})).rejects.toThrow(
        'Failed to fetch signups data: Database connection failed'
      );
    });

    it('throws error when jobs query fails', async () => {
      const dateRange: DateRangeValue = {
        preset: 'last7days',
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-01-08'),
      };

      // Mock admin role check
      const mockProfileChain = createMockChain();
      mockProfileChain.data = { role: 'admin' };
      mockSupabaseClient.from.mockReturnValueOnce(mockProfileChain);

      // Mock signups with complete profiles
      const mockSignupsChain = createMockChain();
      mockSignupsChain.data = [
        { id: 'user1', name: 'John Doe', trade: 'electrician', location: 'NYC' },
      ];
      mockSupabaseClient.from.mockReturnValueOnce(mockSignupsChain);

      // Mock jobs query error
      const mockJobsChain = createMockChain();
      mockJobsChain.error = { message: 'Jobs table unavailable' };
      mockSupabaseClient.from.mockReturnValueOnce(mockJobsChain);

      await expect(getConversionFunnel(dateRange, {})).rejects.toThrow(
        'Failed to fetch jobs data: Jobs table unavailable'
      );
    });

    it('throws error when applications query fails', async () => {
      const dateRange: DateRangeValue = {
        preset: 'last7days',
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-01-08'),
      };

      // Mock admin role check
      const mockProfileChain = createMockChain();
      mockProfileChain.data = { role: 'admin' };
      mockSupabaseClient.from.mockReturnValueOnce(mockProfileChain);

      // Mock signups with complete profiles
      const mockSignupsChain = createMockChain();
      mockSignupsChain.data = [
        { id: 'user1', name: 'John Doe', trade: 'electrician', location: 'NYC' },
      ];
      mockSupabaseClient.from.mockReturnValueOnce(mockSignupsChain);

      // Mock jobs query success
      const mockJobsChain = createMockChain();
      mockJobsChain.data = [];
      mockSupabaseClient.from.mockReturnValueOnce(mockJobsChain);

      // Mock applications query error
      const mockAppsChain = createMockChain();
      mockAppsChain.error = { message: 'Applications table unavailable' };
      mockSupabaseClient.from.mockReturnValueOnce(mockAppsChain);

      await expect(getConversionFunnel(dateRange, {})).rejects.toThrow(
        'Failed to fetch applications data: Applications table unavailable'
      );
    });

    it('skips first action queries when profileCompleteIds is empty', async () => {
      const dateRange: DateRangeValue = {
        preset: 'last7days',
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-01-08'),
      };

      // Mock admin role check
      const mockProfileChain = createMockChain();
      mockProfileChain.data = { role: 'admin' };
      mockSupabaseClient.from.mockReturnValueOnce(mockProfileChain);

      // Mock signups with NO complete profiles
      const mockSignupsChain = createMockChain();
      mockSignupsChain.data = [
        { id: 'user1', name: null, trade: null, location: null },
        { id: 'user2', name: 'Jane', trade: null, location: 'LA' },
      ];
      mockSupabaseClient.from.mockReturnValueOnce(mockSignupsChain);

      const result = await getConversionFunnel(dateRange, {});

      // Should not have called jobs/apps queries (only 2 calls: auth profile + signups)
      expect(mockSupabaseClient.from).toHaveBeenCalledTimes(2);
      expect(result[0].count).toBe(2); // 2 signups
      expect(result[1].count).toBe(0); // 0 complete profiles
      expect(result[2].count).toBe(0); // 0 first actions
    });

    it('calculates correct percentages and drop-off rates with real data', async () => {
      const dateRange: DateRangeValue = {
        preset: 'last30days',
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-01-31'),
      };

      // Mock admin role check
      const mockProfileChain = createMockChain();
      mockProfileChain.data = { role: 'admin' };
      mockSupabaseClient.from.mockReturnValueOnce(mockProfileChain);

      // Mock 100 signups, 60 with complete profiles
      const mockSignups = [
        ...Array.from({ length: 60 }, (_, i) => ({
          id: `user${i}`,
          name: `User ${i}`,
          trade: 'electrician',
          location: 'NYC',
        })),
        ...Array.from({ length: 40 }, (_, i) => ({
          id: `incomplete${i}`,
          name: null,
          trade: null,
          location: null,
        })),
      ];
      const mockSignupsChain = createMockChain();
      mockSignupsChain.data = mockSignups;
      mockSupabaseClient.from.mockReturnValueOnce(mockSignupsChain);

      // Mock 30 users with jobs
      const mockJobsChain = createMockChain();
      mockJobsChain.data = Array.from({ length: 30 }, (_, i) => ({
        user_id: `user${i}`,
      }));
      mockSupabaseClient.from.mockReturnValueOnce(mockJobsChain);

      // Mock 15 users with applications (10 overlap with jobs, 5 unique)
      const mockAppsChain = createMockChain();
      mockAppsChain.data = [
        ...Array.from({ length: 10 }, (_, i) => ({ user_id: `user${i}` })),
        ...Array.from({ length: 5 }, (_, i) => ({ user_id: `user${30 + i}` })),
      ];
      mockSupabaseClient.from.mockReturnValueOnce(mockAppsChain);

      const result = await getConversionFunnel(dateRange, {});

      // Expected: 100 signups, 60 complete, 35 first action (30 jobs + 5 unique apps)
      expect(result[0].count).toBe(100);
      expect(result[0].percentage).toBe(100);
      expect(result[0].dropOffRate).toBeNull();

      expect(result[1].count).toBe(60);
      expect(result[1].percentage).toBe(60); // 60/100 * 100
      expect(result[1].dropOffRate).toBe(40); // (100-60)/100 * 100

      expect(result[2].count).toBe(35);
      expect(result[2].percentage).toBe(35); // 35/100 * 100
      expect(result[2].dropOffRate).toBeCloseTo(41.67, 1); // (60-35)/60 * 100
    });
  });

  describe('getSubscriptionMetrics', () => {
    beforeEach(() => {
      vi.clearAllMocks();
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'test-user-id' } },
        error: null,
      });
      mockSupabaseClient.from.mockReturnValue(createMockChain());
    });

    it('returns subscription metrics with correct structure', async () => {
      const dateRange: DateRangeValue = {
        preset: 'last30days',
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-01-31'),
      };

      // Mock admin role check
      const mockProfileChain = createMockChain();
      mockProfileChain.data = { role: 'admin' };
      mockSupabaseClient.from.mockReturnValueOnce(mockProfileChain);

      const result = await getSubscriptionMetrics(dateRange);

      expect(result).toHaveProperty('freeUsers');
      expect(result).toHaveProperty('proUsers');
      expect(result).toHaveProperty('conversionRate');
      expect(result).toHaveProperty('mrr');
      expect(result).toHaveProperty('churnRate');
      expect(result).toHaveProperty('comparison');
      expect(typeof result.freeUsers).toBe('number');
      expect(typeof result.proUsers).toBe('number');
      expect(typeof result.conversionRate).toBe('number');
      expect(typeof result.mrr).toBe('number');
    });

    it('throws error when user is not authenticated', async () => {
      const dateRange: DateRangeValue = {
        preset: 'last30days',
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-01-31'),
      };

      mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
        data: { user: null },
        error: null,
      } as any);

      await expect(getSubscriptionMetrics(dateRange)).rejects.toThrow(
        'Unauthorized: User not authenticated'
      );
    });

    it('throws error when user is not admin', async () => {
      const dateRange: DateRangeValue = {
        preset: 'last30days',
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-01-31'),
      };

      const mockProfileChain = createMockChain();
      mockProfileChain.data = { role: 'worker' };
      mockSupabaseClient.from.mockReturnValueOnce(mockProfileChain);

      await expect(getSubscriptionMetrics(dateRange)).rejects.toThrow(
        'Forbidden: Admin access required'
      );
    });

    it('throws error when users query fails', async () => {
      const dateRange: DateRangeValue = {
        preset: 'last30days',
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-01-31'),
      };

      // Mock admin role check
      const mockProfileChain = createMockChain();
      mockProfileChain.data = { role: 'admin' };
      mockSupabaseClient.from.mockReturnValueOnce(mockProfileChain);

      // Mock users query error
      const mockUsersChain = createMockChain();
      mockUsersChain.error = { message: 'Database connection failed' };
      mockSupabaseClient.from.mockReturnValueOnce(mockUsersChain);

      await expect(getSubscriptionMetrics(dateRange)).rejects.toThrow(
        'Failed to fetch users data: Database connection failed'
      );
    });

    it('calculates correct conversion rate and MRR', async () => {
      const dateRange: DateRangeValue = {
        preset: 'last30days',
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-01-31'),
      };

      // Mock admin role check
      const mockProfileChain = createMockChain();
      mockProfileChain.data = { role: 'admin' };
      mockSupabaseClient.from.mockReturnValueOnce(mockProfileChain);

      // Mock 100 users: 70 free, 30 pro
      const mockUsers = [
        ...Array.from({ length: 70 }, (_, i) => ({
          id: `free${i}`,
          subscription_status: 'free',
        })),
        ...Array.from({ length: 30 }, (_, i) => ({
          id: `pro${i}`,
          subscription_status: 'pro',
        })),
      ];
      const mockUsersChain = createMockChain();
      mockUsersChain.data = mockUsers;
      mockSupabaseClient.from.mockReturnValueOnce(mockUsersChain);

      // Mock 30 active subscriptions at $10 each
      const mockSubscriptions = Array.from({ length: 30 }, () => ({
        amount: 10,
      }));
      const mockSubscriptionsChain = createMockChain();
      mockSubscriptionsChain.data = mockSubscriptions;
      mockSupabaseClient.from.mockReturnValueOnce(mockSubscriptionsChain);

      const result = await getSubscriptionMetrics(dateRange);

      expect(result.freeUsers).toBe(70);
      expect(result.proUsers).toBe(30);
      expect(result.conversionRate).toBe(30); // 30/100 * 100
      expect(result.mrr).toBe(300); // 30 * $10
      expect(result.churnRate).toBe(0); // Placeholder
    });
  });

  describe('getOperationalLoad', () => {
    beforeEach(() => {
      vi.clearAllMocks();
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'test-user-id' } },
        error: null,
      });
      mockSupabaseClient.from.mockReturnValue(createMockChain());
    });

    it('returns operational load metrics with correct structure', async () => {
      const dateRange: DateRangeValue = {
        preset: 'last7days',
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-01-08'),
      };

      // Mock admin role check
      const mockProfileChain = createMockChain();
      mockProfileChain.data = { role: 'admin' };
      mockSupabaseClient.from.mockReturnValueOnce(mockProfileChain);

      const result = await getOperationalLoad(dateRange);

      expect(result).toHaveProperty('pendingCertifications');
      expect(result).toHaveProperty('avgCertificationReviewTime');
      expect(result).toHaveProperty('moderationQueueBacklog');
      expect(result).toHaveProperty('avgModerationResolutionTime');
      expect(result).toHaveProperty('weeklyTrend');
      expect(Array.isArray(result.weeklyTrend)).toBe(true);
      expect(typeof result.pendingCertifications).toBe('number');
      expect(typeof result.avgCertificationReviewTime).toBe('number');
    });

    it('throws error when user is not authenticated', async () => {
      const dateRange: DateRangeValue = {
        preset: 'last7days',
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-01-08'),
      };

      mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
        data: { user: null },
        error: null,
      } as any);

      await expect(getOperationalLoad(dateRange)).rejects.toThrow(
        'Unauthorized: User not authenticated'
      );
    });

    it('throws error when user is not admin', async () => {
      const dateRange: DateRangeValue = {
        preset: 'last7days',
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-01-08'),
      };

      const mockProfileChain = createMockChain();
      mockProfileChain.data = { role: 'employer' };
      mockSupabaseClient.from.mockReturnValueOnce(mockProfileChain);

      await expect(getOperationalLoad(dateRange)).rejects.toThrow(
        'Forbidden: Admin access required'
      );
    });
  });
});
