import { describe, it, expect, vi, beforeEach } from 'vitest';
import { waitFor } from '@testing-library/react';
import { renderHookWithQuery, mockActionSuccess, mockActionError } from '@/tests/hooks-setup';
import { useSendMessage } from './use-send-message';

// Mock the server action
vi.mock('../actions/message-actions', () => ({
  sendMessage: vi.fn(),
}));

import { sendMessage } from '../actions/message-actions';

const mockSendMessage = sendMessage as ReturnType<typeof vi.fn>;

describe('useSendMessage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return mutation functions', () => {
    const { result } = renderHookWithQuery(() => useSendMessage());

    expect(result.current.mutate).toBeDefined();
    expect(result.current.mutateAsync).toBeDefined();
    expect(result.current.isPending).toBe(false);
  });

  it('should successfully send a message', async () => {
    const mockMessage = {
      id: 'msg-123',
      conversation_id: 'conv-456',
      sender_id: 'user-789',
      content: 'Hello there!',
      created_at: new Date().toISOString(),
    };

    mockSendMessage.mockResolvedValue(mockActionSuccess(mockMessage));

    const { result } = renderHookWithQuery(() => useSendMessage());

    result.current.mutate({ conversationId: 'conv-456', content: 'Hello there!' });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockSendMessage).toHaveBeenCalledWith('conv-456', 'Hello there!');
  });

  it('should handle send message errors', async () => {
    mockSendMessage.mockResolvedValue(mockActionError('Rate limit exceeded'));

    const { result } = renderHookWithQuery(() => useSendMessage());

    result.current.mutate({ conversationId: 'conv-123', content: 'Test message' });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error?.message).toBe('Rate limit exceeded');
  });

  it('should handle network errors', async () => {
    mockSendMessage.mockRejectedValue(new Error('Network error'));

    const { result } = renderHookWithQuery(() => useSendMessage());

    result.current.mutate({ conversationId: 'conv-123', content: 'Test' });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBeInstanceOf(Error);
  });

  it('should set pending state while sending', async () => {
    let resolvePromise: (value: any) => void;
    const promise = new Promise((resolve) => {
      resolvePromise = resolve;
    });
    mockSendMessage.mockReturnValue(promise);

    const { result } = renderHookWithQuery(() => useSendMessage());

    result.current.mutate({ conversationId: 'conv-123', content: 'Sending...' });

    await waitFor(() => {
      expect(result.current.isPending).toBe(true);
    });

    resolvePromise!(mockActionSuccess({ id: 'msg-new' }));

    await waitFor(() => {
      expect(result.current.isPending).toBe(false);
    });
  });

  it('should use mutateAsync for promise-based handling', async () => {
    const mockMessage = { id: 'msg-async', content: 'Async message' };
    mockSendMessage.mockResolvedValue(mockActionSuccess(mockMessage));

    const { result } = renderHookWithQuery(() => useSendMessage());

    const response = await result.current.mutateAsync({
      conversationId: 'conv-async',
      content: 'Async message',
    });

    expect(response).toEqual(mockMessage);
  });

  it('should throw error from mutateAsync on failure', async () => {
    mockSendMessage.mockResolvedValue(mockActionError('Message too long'));

    const { result } = renderHookWithQuery(() => useSendMessage());

    await expect(
      result.current.mutateAsync({ conversationId: 'conv-123', content: 'x'.repeat(10000) })
    ).rejects.toThrow('Message too long');
  });

  it('should handle empty content gracefully', async () => {
    mockSendMessage.mockResolvedValue(mockActionError('Message cannot be empty'));

    const { result } = renderHookWithQuery(() => useSendMessage());

    result.current.mutate({ conversationId: 'conv-123', content: '' });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error?.message).toBe('Message cannot be empty');
  });

  it('should handle long messages', async () => {
    const longContent = 'x'.repeat(500);
    mockSendMessage.mockResolvedValue(mockActionSuccess({ id: 'msg-long', content: longContent }));

    const { result } = renderHookWithQuery(() => useSendMessage());

    result.current.mutate({ conversationId: 'conv-123', content: longContent });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockSendMessage).toHaveBeenCalledWith('conv-123', longContent);
  });

  it('should handle special characters in content', async () => {
    const specialContent = 'Hello! How are you? Check out <script>alert("xss")</script>';
    mockSendMessage.mockResolvedValue(mockActionSuccess({ id: 'msg-special', content: specialContent }));

    const { result } = renderHookWithQuery(() => useSendMessage());

    result.current.mutate({ conversationId: 'conv-123', content: specialContent });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockSendMessage).toHaveBeenCalledWith('conv-123', specialContent);
  });
});
