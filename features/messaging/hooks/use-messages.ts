'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { Message } from '../types';

export function useMessages(conversationId: string) {
  const queryClient = useQueryClient();
  const supabase = createClient();

  // Fetch messages with polling (no real-time subscription)
  const query = useQuery({
    queryKey: ['messages', conversationId],
    queryFn: async (): Promise<Message[]> => {
      console.log('[useMessages] Fetching messages for conversation:', conversationId);

      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
        .limit(50); // Load last 50 messages

      if (error) {
        console.error('[useMessages] Error fetching messages:', error);
        throw error;
      }

      console.log('[useMessages] Found messages:', data?.length || 0);

      // Fetch sender profiles for each message
      const messagesWithSenders = await Promise.all(
        (data || []).map(async (message: any) => {
          const { data: sender } = await supabase
            .from('profiles')
            .select('id, name, profile_image_url')
            .eq('id', message.sender_id)
            .single();

          return {
            ...message,
            sender: sender || { id: message.sender_id, name: 'Unknown User' }
          };
        })
      );

      console.log('[useMessages] Messages with senders loaded:', messagesWithSenders.length);

      // Invalidate conversations when new messages are detected
      const currentMessages = queryClient.getQueryData<Message[]>(['messages', conversationId]);
      if (currentMessages && messagesWithSenders && messagesWithSenders.length > currentMessages.length) {
        queryClient.invalidateQueries({ queryKey: ['conversations'] });
      }

      return messagesWithSenders as Message[];
    },
    enabled: !!conversationId,
    refetchInterval: 3000, // Poll every 3 seconds
    staleTime: 0, // Always consider data stale to ensure fresh data
  });

  return query;
}
