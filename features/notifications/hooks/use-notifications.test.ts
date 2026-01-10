import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHookWithQuery, createMockNotification } from '@/tests/hooks-setup';

// Mock the server action
vi.mock('../actions/notification-actions', () => ({
  getMyNotifications: vi.fn(),
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

import { getMyNotifications } from '../actions/notification-actions';
import { useSmartPolling } from '@/lib/hooks/use-smart-polling';
import { useNotifications } from './use-notifications';

const mockGetMyNotifications = getMyNotifications as ReturnType<typeof vi.fn>;
const mockUseSmartPolling = useSmartPolling as ReturnType<typeof vi.fn>;

describe('useNotifications', () => {
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

    const { result } = renderHookWithQuery(() => useNotifications());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.notifications).toEqual([]);
  });

  it('should return notifications when loaded', () => {
    const mockNotifications = [
      createMockNotification({
        id: 'notif-1',
        type: 'application_received',
        title: 'New Application',
        message: 'John applied to your job',
        read: false,
      }),
      createMockNotification({
        id: 'notif-2',
        type: 'message_received',
        title: 'New Message',
        message: 'You have a new message',
        read: true,
      }),
    ];

    mockUseSmartPolling.mockReturnValue({
      data: mockNotifications,
      isLoading: false,
      isFetching: false,
      isError: false,
      error: null,
      status: 'polling',
    });

    const { result } = renderHookWithQuery(() => useNotifications());

    expect(result.current.isLoading).toBe(false);
    expect(result.current.notifications).toHaveLength(2);
    expect(result.current.notifications[0].title).toBe('New Application');
    expect(result.current.notifications[0].read).toBe(false);
  });

  it('should handle empty notifications', () => {
    mockUseSmartPolling.mockReturnValue({
      data: [],
      isLoading: false,
      isFetching: false,
      isError: false,
      error: null,
      status: 'polling',
    });

    const { result } = renderHookWithQuery(() => useNotifications());

    expect(result.current.notifications).toEqual([]);
  });

  it('should handle error state', () => {
    mockUseSmartPolling.mockReturnValue({
      data: undefined,
      isLoading: false,
      isFetching: false,
      isError: true,
      error: new Error('Failed to fetch notifications'),
      status: 'error',
    });

    const { result } = renderHookWithQuery(() => useNotifications());

    expect(result.current.isError).toBe(true);
    expect(result.current.error?.message).toBe('Failed to fetch notifications');
  });

  it('should call useSmartPolling with correct parameters', () => {
    mockUseSmartPolling.mockReturnValue({
      data: [],
      isLoading: false,
      isFetching: false,
      isError: false,
      error: null,
      status: 'polling',
    });

    renderHookWithQuery(() => useNotifications());

    expect(mockUseSmartPolling).toHaveBeenCalledWith(
      ['notifications'],
      expect.any(Function),
      expect.objectContaining({
        intervalMs: expect.any(Number),
      })
    );
  });

  it('should expose isFetching for background updates', () => {
    mockUseSmartPolling.mockReturnValue({
      data: [createMockNotification()],
      isLoading: false,
      isFetching: true,
      isError: false,
      error: null,
      status: 'polling',
    });

    const { result } = renderHookWithQuery(() => useNotifications());

    expect(result.current.isFetching).toBe(true);
    expect(result.current.isLoading).toBe(false);
  });

  it('should return different notification types', () => {
    const mockNotifications = [
      createMockNotification({ type: 'application_received', title: 'Application Received' }),
      createMockNotification({ type: 'application_status_changed', title: 'Application Updated' }),
      createMockNotification({ type: 'message_received', title: 'New Message' }),
      createMockNotification({ type: 'job_alert', title: 'New Job Match' }),
    ];

    mockUseSmartPolling.mockReturnValue({
      data: mockNotifications,
      isLoading: false,
      isFetching: false,
      isError: false,
      error: null,
      status: 'polling',
    });

    const { result } = renderHookWithQuery(() => useNotifications());

    expect(result.current.notifications).toHaveLength(4);
    expect(result.current.notifications.map((n: any) => n.type)).toEqual([
      'application_received',
      'application_status_changed',
      'message_received',
      'job_alert',
    ]);
  });
});
