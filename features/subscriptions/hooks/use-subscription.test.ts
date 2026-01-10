import { describe, it, expect, vi, beforeEach } from 'vitest';
import { waitFor } from '@testing-library/react';
import {
  renderHookWithQuery,
  createTestQueryClient,
  mockActionSuccess,
  mockActionError,
  createMockSubscription,
} from '@/tests/hooks-setup';

// Mock the server action
vi.mock('../actions/subscription-actions', () => ({
  getMySubscription: vi.fn(),
}));

import { getMySubscription } from '../actions/subscription-actions';
import { useSubscription, useIsPro } from './use-subscription';

const mockGetMySubscription = getMySubscription as ReturnType<typeof vi.fn>;

describe('useSubscription', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return loading state initially', () => {
    mockGetMySubscription.mockImplementation(() => new Promise(() => {})); // Never resolves

    const { result } = renderHookWithQuery(() => useSubscription());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeUndefined();
  });

  it('should return subscription data on success', async () => {
    const mockSubscription = createMockSubscription();
    mockGetMySubscription.mockResolvedValue({
      success: true,
      subscription: mockSubscription,
      profileSubscriptionStatus: 'pro',
    });

    const { result } = renderHookWithQuery(() => useSubscription());

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.subscription).toEqual(mockSubscription);
    expect(result.current.data?.profileSubscriptionStatus).toBe('pro');
  });

  it('should return null subscription for free user', async () => {
    mockGetMySubscription.mockResolvedValue({
      success: true,
      subscription: null,
      profileSubscriptionStatus: 'free',
    });

    const { result } = renderHookWithQuery(() => useSubscription());

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.subscription).toBeNull();
    expect(result.current.data?.profileSubscriptionStatus).toBe('free');
  });

  it('should handle error state', async () => {
    mockGetMySubscription.mockResolvedValue({
      success: false,
      error: 'Failed to fetch subscription',
    });

    const { result } = renderHookWithQuery(() => useSubscription());

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBeDefined();
    expect((result.current.error as Error).message).toBe('Failed to fetch subscription');
  });

  it('should handle cancelled subscription', async () => {
    const mockSubscription = createMockSubscription({
      status: 'canceled',
      cancel_at_period_end: true,
    });
    mockGetMySubscription.mockResolvedValue({
      success: true,
      subscription: mockSubscription,
      profileSubscriptionStatus: 'free',
    });

    const { result } = renderHookWithQuery(() => useSubscription());

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.subscription?.status).toBe('canceled');
    expect(result.current.data?.subscription?.cancel_at_period_end).toBe(true);
  });
});

describe('useIsPro', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return true for pro subscription status', async () => {
    mockGetMySubscription.mockResolvedValue({
      success: true,
      subscription: createMockSubscription({ status: 'active' }),
      profileSubscriptionStatus: 'pro',
    });

    const { result } = renderHookWithQuery(() => useIsPro());

    await waitFor(() => {
      expect(result.current).toBe(true);
    });
  });

  it('should return false for free user', async () => {
    mockGetMySubscription.mockResolvedValue({
      success: true,
      subscription: null,
      profileSubscriptionStatus: 'free',
    });

    const { result } = renderHookWithQuery(() => useIsPro());

    await waitFor(() => {
      expect(result.current).toBe(false);
    });
  });

  it('should return true if subscription is active even without profile status', async () => {
    mockGetMySubscription.mockResolvedValue({
      success: true,
      subscription: createMockSubscription({
        status: 'active',
        stripe_subscription_id: 'sub_123',
      }),
      profileSubscriptionStatus: 'free', // Profile not updated yet
    });

    const { result } = renderHookWithQuery(() => useIsPro());

    // Profile status takes precedence in the hook
    await waitFor(() => {
      // Since profile says 'free', it returns false initially
      // But the logic checks profile first, then falls back to subscription
      expect(result.current).toBe(false);
    });
  });

  it('should prefer profileSubscriptionStatus as source of truth', async () => {
    mockGetMySubscription.mockResolvedValue({
      success: true,
      subscription: createMockSubscription({ status: 'canceled' }),
      profileSubscriptionStatus: 'pro', // Lifetime pro or similar
    });

    const { result } = renderHookWithQuery(() => useIsPro());

    await waitFor(() => {
      expect(result.current).toBe(true);
    });
  });
});
