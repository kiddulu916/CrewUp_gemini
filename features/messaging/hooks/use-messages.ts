'use client';

import { useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useSmartPolling, POLLING_CONFIGS } from '@/lib/hooks/use-smart-polling';
import type { Message } from '../types';

/**
 * Hook for fetching messages with smart polling
 * 
 * * Features:
 * - Adaptive polling (faster when active, slower when idle)
 * - Exponential backoff on errors
 * - Tab visibility handling (pauses when hidden)
 * - Stale-while-revalidate pattern
 * - Status indicators for UI
 */
export function useMessages(conversationId: string) {
  const queryClient = useQueryClient();
  const supabase = createClient();

  const fetchMessages = async (): Promise<Message[]> => {
    // * Use JOIN to fetch messages WITH sender profiles in a single query
    // * This eliminates the N+1 query problem (was 1 + N queries, now just 1)
    const { data, error } = await supabase
      .from('messages')
      .select(`
        *,
        sender:users!sender_id (
          id,
          first_name,
          last_name,
          profile_image_url
        )
      `)
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(50); // Load last 50 messages

    if (error) {
      console.error('[useMessages] Error fetching messages:', error);
      throw error;
    }

    // * Transform sender data to include computed name
    const messagesWithSenders = (data || []).map((message: any) => {
      const sender = message.sender;
      const senderWithName = sender
        ? {
            ...sender,
            name: `${sender.first_name || ''} ${sender.last_name || ''}`.trim() || 'Unknown User',
          }
        : { id: message.sender_id, name: 'Unknown User', first_name: 'Unknown', last_name: 'User' };

      return {
        ...message,
        sender: senderWithName,
      };
    });

    // * Invalidate conversations when new messages are detected
    const currentMessages = queryClient.getQueryData<Message[]>(['messages', conversationId]);
    if (currentMessages && messagesWithSenders && messagesWithSenders.length > currentMessages.length) {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    }

    return messagesWithSenders as Message[];
  };

  const result = useSmartPolling<Message[], Error>(
    ['messages', conversationId],
    fetchMessages,
    POLLING_CONFIGS.messages,
    {
      enabled: !!conversationId,
    }
  );

  return {
    ...result,
    // * Convenience alias for React Query compatibility
    isLoading: result.isLoading,
    isFetching: result.isFetching,
    messages: result.data || [],
  };
}
