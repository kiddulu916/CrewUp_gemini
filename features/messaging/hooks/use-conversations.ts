'use client';

import { createClient } from '@/lib/supabase/client';
import { useSmartPolling, POLLING_CONFIGS } from '@/lib/hooks/use-smart-polling';
import type { ConversationWithDetails } from '../types';

/**
 * Hook for fetching conversations with smart polling
 * 
 * * Features:
 * - Adaptive polling (faster when active, slower when idle)
 * - Exponential backoff on errors
 * - Tab visibility handling (pauses when hidden)
 * - Stale-while-revalidate pattern
 * - Status indicators for UI
 */
export function useConversations() {
  const supabase = createClient();

  const fetchConversations = async (): Promise<ConversationWithDetails[]> => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('Not authenticated');
    }

    // * Optimized query: Fetch conversations WITH participant profiles in a single query
    // * Uses JOIN to get both participant_1 and participant_2 profiles
    const { data, error } = await supabase
      .from('conversations')
      .select(`
        *,
        participant_1:users!participant_1_id (
          id,
          first_name,
          last_name,
          profile_image_url
        ),
        participant_2:users!participant_2_id (
          id,
          first_name,
          last_name,
          profile_image_url
        )
      `)
      .or(`participant_1_id.eq.${user.id},participant_2_id.eq.${user.id}`)
      .order('last_message_at', { ascending: false, nullsFirst: false })
      .limit(50); // Limit conversations for performance

    if (error) {
      console.error('[useConversations] Error fetching conversations:', error);
      throw error;
    }

    // * Get all conversation IDs to batch fetch last messages and unread counts
    const conversationIds = (data || []).map((c: any) => c.id);
    
    // * Batch fetch last messages for all conversations (single query instead of N)
    const { data: lastMessages } = await supabase
      .from('messages')
      .select('id, content, sender_id, created_at, conversation_id')
      .in('conversation_id', conversationIds)
      .order('created_at', { ascending: false });

    // * Group last messages by conversation_id (get only the latest per conversation)
    const lastMessagesByConv = new Map<string, any>();
    (lastMessages || []).forEach((msg: any) => {
      if (!lastMessagesByConv.has(msg.conversation_id)) {
        lastMessagesByConv.set(msg.conversation_id, msg);
      }
    });

    // * Batch fetch unread counts for all conversations (single query with RPC would be ideal)
    // * For now, we'll calculate from the messages we already have + a count query
    const { data: unreadData } = await supabase
      .from('messages')
      .select('conversation_id')
      .in('conversation_id', conversationIds)
      .neq('sender_id', user.id)
      .is('read_at', null);

    // * Count unread messages per conversation
    const unreadCountsByConv = new Map<string, number>();
    (unreadData || []).forEach((msg: any) => {
      const current = unreadCountsByConv.get(msg.conversation_id) || 0;
      unreadCountsByConv.set(msg.conversation_id, current + 1);
    });

    // * Transform conversations with pre-fetched data (no more N+1 queries!)
    const conversationsWithDetails = (data || []).map((conv: any) => {
      // Determine which participant is the other user
      const isParticipant1 = conv.participant_1_id === user.id;
      const otherParticipant = isParticipant1 ? conv.participant_2 : conv.participant_1;

      // Transform otherParticipant to include computed name field
      const participantWithLegacyName = otherParticipant
        ? {
            id: otherParticipant.id,
            name: `${otherParticipant.first_name || ''} ${otherParticipant.last_name || ''}`.trim() || 'Unknown User',
            profile_image_url: otherParticipant.profile_image_url,
          }
        : {
            id: isParticipant1 ? conv.participant_2_id : conv.participant_1_id,
            name: 'Unknown User',
            profile_image_url: undefined,
          };

      return {
        id: conv.id,
        otherParticipant: participantWithLegacyName,
        lastMessage: lastMessagesByConv.get(conv.id) || undefined,
        lastMessageAt: conv.last_message_at,
        unreadCount: unreadCountsByConv.get(conv.id) || 0,
      };
    });

    return conversationsWithDetails;
  };

  const result = useSmartPolling<ConversationWithDetails[], Error>(
    ['conversations'],
    fetchConversations,
    POLLING_CONFIGS.conversations
  );

  return {
    ...result,
    // * Convenience alias for React Query compatibility
    conversations: result.data || [],
    isLoading: result.isLoading,
    isFetching: result.isFetching,
  };
}
