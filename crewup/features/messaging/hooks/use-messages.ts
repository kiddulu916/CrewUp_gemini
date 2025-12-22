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
      const { data, error } = await supabase
        .from('messages')
        .select(
          `
          *,
          sender:profiles!sender_id(id, name, profile_image_url)
        `
        )
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
        .limit(50); // Load last 50 messages

      if (error) throw error;

      // Invalidate conversations when new messages are detected
      const currentMessages = queryClient.getQueryData<Message[]>(['messages', conversationId]);
      if (currentMessages && data && data.length > currentMessages.length) {
        queryClient.invalidateQueries({ queryKey: ['conversations'] });
      }

      return (data || []) as Message[];
    },
    enabled: !!conversationId,
    refetchInterval: 3000, // Poll every 3 seconds
    staleTime: 0, // Always consider data stale to ensure fresh data
  });

  return query;
}
