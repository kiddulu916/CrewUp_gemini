import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { waitFor } from '@testing-library/react';
import {
  renderHookWithQuery,
  createMockSupabaseClient,
  createMockMessage,
} from '@/tests/hooks-setup';

// Mock the Supabase client
vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(),
}));

import { createClient } from '@/lib/supabase/client';
import { useMessages } from './use-messages';

const mockCreateClient = createClient as ReturnType<typeof vi.fn>;

describe('useMessages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const conversationId = 'conv-123';

  it('should return loading state initially', () => {
    const mockClient = createMockSupabaseClient();
    mockClient.from = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue(new Promise(() => {})),
          }),
        }),
      }),
    });
    mockCreateClient.mockReturnValue(mockClient);

    const { result } = renderHookWithQuery(() => useMessages(conversationId));

    expect(result.current.isLoading).toBe(true);
    expect(result.current.messages).toEqual([]);
  });

  it('should fetch messages successfully', async () => {
    const mockMessages = [
      {
        ...createMockMessage({ id: 'msg-1', content: 'Hello' }),
        sender: { id: 'user-1', first_name: 'John', last_name: 'Doe', profile_image_url: null },
      },
      {
        ...createMockMessage({ id: 'msg-2', content: 'Hi there!' }),
        sender: { id: 'user-2', first_name: 'Jane', last_name: 'Smith', profile_image_url: null },
      },
    ];

    const mockClient = createMockSupabaseClient();
    mockClient.from = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({ data: mockMessages, error: null }),
          }),
        }),
      }),
    });
    mockCreateClient.mockReturnValue(mockClient);

    const { result } = renderHookWithQuery(() => useMessages(conversationId));

    await waitFor(() => {
      expect(result.current.messages.length).toBeGreaterThan(0);
    });

    expect(result.current.messages).toHaveLength(2);
    expect(result.current.messages[0].sender.name).toBe('John Doe');
    expect(result.current.messages[1].sender.name).toBe('Jane Smith');
  });

  it('should handle empty messages', async () => {
    const mockClient = createMockSupabaseClient();
    mockClient.from = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
      }),
    });
    mockCreateClient.mockReturnValue(mockClient);

    const { result } = renderHookWithQuery(() => useMessages(conversationId));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.messages).toEqual([]);
  });

  it('should handle error state', async () => {
    const mockClient = createMockSupabaseClient();
    mockClient.from = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database error' },
            }),
          }),
        }),
      }),
    });
    mockCreateClient.mockReturnValue(mockClient);

    const { result } = renderHookWithQuery(() => useMessages(conversationId));

    await waitFor(() => {
      expect(result.current.error).toBeDefined();
    });
  });

  it('should handle missing sender data', async () => {
    const mockMessages = [
      {
        ...createMockMessage({ id: 'msg-1', sender_id: 'user-1' }),
        sender: null,
      },
    ];

    const mockClient = createMockSupabaseClient();
    mockClient.from = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({ data: mockMessages, error: null }),
          }),
        }),
      }),
    });
    mockCreateClient.mockReturnValue(mockClient);

    const { result } = renderHookWithQuery(() => useMessages(conversationId));

    await waitFor(() => {
      expect(result.current.messages.length).toBeGreaterThan(0);
    });

    expect(result.current.messages[0].sender.name).toBe('Unknown User');
  });

  it('should not fetch when conversationId is empty', () => {
    const mockClient = createMockSupabaseClient();
    const mockFrom = vi.fn();
    mockClient.from = mockFrom;
    mockCreateClient.mockReturnValue(mockClient);

    const { result } = renderHookWithQuery(() => useMessages(''));

    expect(result.current.isLoading).toBe(false);
    expect(result.current.messages).toEqual([]);
  });

  it('should expose smart polling controls', async () => {
    const mockMessages = [
      {
        ...createMockMessage({ id: 'msg-1' }),
        sender: { id: 'user-1', first_name: 'John', last_name: 'Doe', profile_image_url: null },
      },
    ];

    const mockClient = createMockSupabaseClient();
    mockClient.from = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({ data: mockMessages, error: null }),
          }),
        }),
      }),
    });
    mockCreateClient.mockReturnValue(mockClient);

    const { result } = renderHookWithQuery(() => useMessages(conversationId));

    await waitFor(() => {
      expect(result.current.messages.length).toBeGreaterThan(0);
    });

    // Check that polling status is available
    expect(result.current.status).toBeDefined();
    expect(typeof result.current.markActive).toBe('function');
    expect(typeof result.current.pause).toBe('function');
    expect(typeof result.current.resume).toBe('function');
    expect(typeof result.current.refetchNow).toBe('function');
  });

  it('should handle sender with missing name parts', async () => {
    const mockMessages = [
      {
        ...createMockMessage({ id: 'msg-1' }),
        sender: { id: 'user-1', first_name: '', last_name: '', profile_image_url: null },
      },
    ];

    const mockClient = createMockSupabaseClient();
    mockClient.from = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({ data: mockMessages, error: null }),
          }),
        }),
      }),
    });
    mockCreateClient.mockReturnValue(mockClient);

    const { result } = renderHookWithQuery(() => useMessages(conversationId));

    await waitFor(() => {
      expect(result.current.messages.length).toBeGreaterThan(0);
    });

    expect(result.current.messages[0].sender.name).toBe('Unknown User');
  });
});
