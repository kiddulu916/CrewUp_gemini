'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { ConversationWithDetails } from '../types';

export function useConversations() {
  const supabase = createClient();

  return useQuery({
    queryKey: ['conversations'],
    queryFn: async (): Promise<ConversationWithDetails[]> => {
      console.log('[useConversations] Starting to fetch conversations...');

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        console.error('[useConversations] No user found');
        throw new Error('Not authenticated');
      }

      console.log('[useConversations] User ID:', user.id);

      // Get all conversations where user is a participant
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .or(`participant_1_id.eq.${user.id},participant_2_id.eq.${user.id}`)
        .order('last_message_at', { ascending: false, nullsFirst: false });

      if (error) {
        console.error('[useConversations] Error fetching conversations:', error);
        throw error;
      }

      console.log('[useConversations] Found conversations:', data?.length || 0);

      // Transform data to show other participant and calculate unread count
      const conversationsWithDetails = await Promise.all(
        (data || []).map(async (conv: any) => {
          // Determine which participant is the other user
          const otherParticipantId =
            conv.participant_1_id === user.id ? conv.participant_2_id : conv.participant_1_id;

          // Fetch the other participant's profile
          const { data: otherParticipant, error: profileError } = await supabase
            .from('profiles')
            .select('id, name, profile_image_url')
            .eq('id', otherParticipantId)
            .single();

          if (profileError) {
            console.error('Error fetching participant profile:', profileError);
            // Return a fallback if profile fetch fails
            return {
              id: conv.id,
              otherParticipant: { id: otherParticipantId, name: 'Unknown User', profile_image_url: undefined },
              lastMessage: undefined,
              lastMessageAt: conv.last_message_at,
              unreadCount: 0,
            };
          }

          // Get last message (use maybeSingle to handle case with no messages)
          const { data: lastMessageData } = await supabase
            .from('messages')
            .select('id, content, sender_id, created_at')
            .eq('conversation_id', conv.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          // Get unread count - only messages from other user that haven't been read
          const { count: unreadCount, error: countError } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('conversation_id', conv.id)
            .neq('sender_id', user.id)
            .is('read_at', null);

          if (countError) {
            console.error('[useConversations] Error counting unread messages:', countError);
          }

          // Also get total message count for debugging
          const { count: totalCount } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('conversation_id', conv.id)
            .neq('sender_id', user.id);

          console.log(`[useConversations] Conversation ${conv.id.substring(0, 8)}: ${unreadCount || 0} unread (${totalCount || 0} total from other user)`);

          return {
            id: conv.id,
            otherParticipant,
            lastMessage: lastMessageData || undefined,
            lastMessageAt: conv.last_message_at,
            unreadCount: unreadCount || 0,
          };
        })
      );

      console.log('[useConversations] Successfully transformed conversations:', conversationsWithDetails.length);
      return conversationsWithDetails;
    },
    refetchInterval: 5000, // Poll every 5 seconds
    staleTime: 0, // Always consider data stale to ensure fresh data
  });
}
