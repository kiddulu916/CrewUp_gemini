import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHookWithQuery } from '@/tests/hooks-setup';

// Mock the server action
vi.mock('../actions/notification-actions', () => ({
  getUnreadCount: vi.fn(),
}));

// Mock the smart polling hook
vi.mock('@/lib/hooks/use-smart-polling', () => ({
  useSmartPolling: vi.fn(),
  POLLING_CONFIGS: {
    notifications: {
      intervalMs: 30000,
      maxIntervalMs: 60000,
    },
  },
}));

import { getUnreadCount } from '../actions/notification-actions';
import { useSmartPolling } from '@/lib/hooks/use-smart-polling';
import { useUnreadCount } from './use-unread-count';

const mockGetUnreadCount = getUnreadCount as ReturnType<typeof vi.fn>;
const mockUseSmartPolling = useSmartPolling as ReturnType<typeof vi.fn>;

describe('useUnreadCount', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return loading state initially', () => {
    mockUseSmartPolling.mockReturnValue({
      data: undefined,
      isLoading: true,
      isFetching: false,
      isError: false,
      error: null,
      status: 'polling',
    });

    const { result } = renderHookWithQuery(() => useUnreadCount());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.count).toBe(0);
  });

  it('should return unread count when loaded', () => {
    mockUseSmartPolling.mockReturnValue({
      data: 5,
      isLoading: false,
      isFetching: false,
      isError: false,
      error: null,
      status: 'polling',
    });

    const { result } = renderHookWithQuery(() => useUnreadCount());

    expect(result.current.isLoading).toBe(false);
    expect(result.current.count).toBe(5);
  });

  it('should return 0 when no unread notifications', () => {
    mockUseSmartPolling.mockReturnValue({
      data: 0,
      isLoading: false,
      isFetching: false,
      isError: false,
      error: null,
      status: 'polling',
    });

    const { result } = renderHookWithQuery(() => useUnreadCount());

    expect(result.current.count).toBe(0);
  });

  it('should handle error state', () => {
    mockUseSmartPolling.mockReturnValue({
      data: undefined,
      isLoading: false,
      isFetching: false,
      isError: true,
      error: new Error('Failed to fetch unread count'),
      status: 'error',
    });

    const { result } = renderHookWithQuery(() => useUnreadCount());

    expect(result.current.isError).toBe(true);
    expect(result.current.count).toBe(0); // Defaults to 0 on error
  });

  it('should call useSmartPolling with correct query key', () => {
    mockUseSmartPolling.mockReturnValue({
      data: 0,
      isLoading: false,
      isFetching: false,
      isError: false,
      error: null,
      status: 'polling',
    });

    renderHookWithQuery(() => useUnreadCount());

    expect(mockUseSmartPolling).toHaveBeenCalledWith(
      ['notifications', 'unread-count'],
      expect.any(Function),
      expect.any(Object)
    );
  });

  it('should expose isFetching for background updates', () => {
    mockUseSmartPolling.mockReturnValue({
      data: 3,
      isLoading: false,
      isFetching: true,
      isError: false,
      error: null,
      status: 'polling',
    });

    const { result } = renderHookWithQuery(() => useUnreadCount());

    expect(result.current.isFetching).toBe(true);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.count).toBe(3);
  });

  it('should handle large unread counts', () => {
    mockUseSmartPolling.mockReturnValue({
      data: 99,
      isLoading: false,
      isFetching: false,
      isError: false,
      error: null,
      status: 'polling',
    });

    const { result } = renderHookWithQuery(() => useUnreadCount());

    expect(result.current.count).toBe(99);
  });

  it('should use same polling config as notifications', () => {
    mockUseSmartPolling.mockReturnValue({
      data: 0,
      isLoading: false,
      isFetching: false,
      isError: false,
      error: null,
      status: 'polling',
    });

    renderHookWithQuery(() => useUnreadCount());

    expect(mockUseSmartPolling).toHaveBeenCalledWith(
      expect.any(Array),
      expect.any(Function),
      expect.objectContaining({
        intervalMs: 30000,
        maxIntervalMs: 60000,
      })
    );
  });
});
