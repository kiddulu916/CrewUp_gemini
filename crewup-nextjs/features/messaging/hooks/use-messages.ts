'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useEffect } from 'react';
import type { Message } from '../types';

export function useMessages(conversationId: string) {
  
  const queryClient = useQueryClient();
  const supabase = createClient();

  // Fetch initial messages
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
        .limit(50); // Initial load limit

      if (error) throw error;
      return (data || []) as Message[];
    },
    enabled: !!conversationId,
  });

  // Subscribe to real-time updates
  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`conversation:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload) => {
          // Fetch sender profile for new message
          const { data: sender } = await supabase
            .from('profiles')
            .select('id, name, profile_image_url')
            .eq('id', payload.new.sender_id)
            .single();

          // Optimistically add new message to cache
          queryClient.setQueryData<Message[]>(['messages', conversationId], (old = []) => {
            const newMessage: Message = {
              ...(payload.new as any),
              sender,
            };

            // Prevent duplicates
            if (old.find((m) => m.id === newMessage.id)) return old;

            return [...old, newMessage];
          });

          // Update conversation's last_message_at in conversations cache
          queryClient.invalidateQueries({ queryKey: ['conversations'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, queryClient, supabase]);

  return query;
}
