import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { waitFor } from '@testing-library/react';
import { renderHookWithQuery, createMockSupabaseClient, createMockConversation } from '@/tests/hooks-setup';

// Mock the Supabase client
vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(),
}));

// Mock the smart polling hook
vi.mock('@/lib/hooks/use-smart-polling', () => ({
  useSmartPolling: vi.fn(),
  POLLING_CONFIGS: {
    conversations: {
      intervalMs: 5000,
      maxIntervalMs: 30000,
    },
  },
}));

import { createClient } from '@/lib/supabase/client';
import { useSmartPolling } from '@/lib/hooks/use-smart-polling';
import { useConversations } from './use-conversations';

const mockCreateClient = createClient as ReturnType<typeof vi.fn>;
const mockUseSmartPolling = useSmartPolling as ReturnType<typeof vi.fn>;

describe('useConversations', () => {
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

    const { result } = renderHookWithQuery(() => useConversations());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.conversations).toEqual([]);
  });

  it('should return conversations when loaded', () => {
    const mockConversations = [
      {
        id: 'conv-1',
        otherParticipant: { id: 'user-2', name: 'John Doe', profile_image_url: null },
        lastMessage: { id: 'msg-1', content: 'Hello', sender_id: 'user-2', created_at: new Date().toISOString() },
        lastMessageAt: new Date().toISOString(),
        unreadCount: 2,
      },
      {
        id: 'conv-2',
        otherParticipant: { id: 'user-3', name: 'Jane Smith', profile_image_url: 'https://example.com/avatar.jpg' },
        lastMessage: { id: 'msg-2', content: 'Hi there!', sender_id: 'user-1', created_at: new Date().toISOString() },
        lastMessageAt: new Date().toISOString(),
        unreadCount: 0,
      },
    ];

    mockUseSmartPolling.mockReturnValue({
      data: mockConversations,
      isLoading: false,
      isFetching: false,
      isError: false,
      error: null,
      status: 'polling',
    });

    const { result } = renderHookWithQuery(() => useConversations());

    expect(result.current.isLoading).toBe(false);
    expect(result.current.conversations).toHaveLength(2);
    expect(result.current.conversations[0].otherParticipant.name).toBe('John Doe');
    expect(result.current.conversations[0].unreadCount).toBe(2);
  });

  it('should handle empty conversations', () => {
    mockUseSmartPolling.mockReturnValue({
      data: [],
      isLoading: false,
      isFetching: false,
      isError: false,
      error: null,
      status: 'polling',
    });

    const { result } = renderHookWithQuery(() => useConversations());

    expect(result.current.conversations).toEqual([]);
  });

  it('should handle error state', () => {
    mockUseSmartPolling.mockReturnValue({
      data: undefined,
      isLoading: false,
      isFetching: false,
      isError: true,
      error: new Error('Failed to fetch conversations'),
      status: 'error',
    });

    const { result } = renderHookWithQuery(() => useConversations());

    expect(result.current.isError).toBe(true);
    expect(result.current.error?.message).toBe('Failed to fetch conversations');
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

    renderHookWithQuery(() => useConversations());

    expect(mockUseSmartPolling).toHaveBeenCalledWith(
      ['conversations'],
      expect.any(Function),
      expect.objectContaining({
        intervalMs: expect.any(Number),
      })
    );
  });

  it('should expose isFetching for background updates', () => {
    mockUseSmartPolling.mockReturnValue({
      data: [{ id: 'conv-1', otherParticipant: { id: 'user-2', name: 'Test' }, unreadCount: 0 }],
      isLoading: false,
      isFetching: true,
      isError: false,
      error: null,
      status: 'polling',
    });

    const { result } = renderHookWithQuery(() => useConversations());

    expect(result.current.isFetching).toBe(true);
    expect(result.current.isLoading).toBe(false);
  });
});
