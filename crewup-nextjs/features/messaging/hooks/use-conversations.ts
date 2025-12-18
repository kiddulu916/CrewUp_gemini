'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { ConversationWithDetails } from '../types';

export function useConversations() {
  const supabase = createClient();

  return useQuery({
    queryKey: ['conversations'],
    queryFn: async (): Promise<ConversationWithDetails[]> => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error('Not authenticated');

      // Get all conversations where user is a participant
      const { data, error } = await supabase
        .from('conversations')
        .select(
          `
          *,
          participant_1:profiles!participant_1_id(id, name, profile_image_url),
          participant_2:profiles!participant_2_id(id, name, profile_image_url)
        `
        )
        .or(`participant_1_id.eq.${user.id},participant_2_id.eq.${user.id}`)
        .order('last_message_at', { ascending: false, nullsFirst: false });

      if (error) throw error;

      // Transform data to show other participant and calculate unread count
      const conversationsWithDetails = await Promise.all(
        (data || []).map(async (conv: any) => {
          const otherParticipant =
            conv.participant_1_id === user.id ? conv.participant_2 : conv.participant_1;

          // Get last message
          const { data: lastMessageData } = await supabase
            .from('messages')
            .select('id, content, sender_id, created_at')
            .eq('conversation_id', conv.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          // Get unread count
          const { count: unreadCount } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('conversation_id', conv.id)
            .neq('sender_id', user.id)
            .is('read_at', null);

          return {
            id: conv.id,
            otherParticipant,
            lastMessage: lastMessageData || undefined,
            lastMessageAt: conv.last_message_at,
            unreadCount: unreadCount || 0,
          };
        })
      );

      return conversationsWithDetails;
    },
    staleTime: 0, // Always refetch when component mounts
  });
}
