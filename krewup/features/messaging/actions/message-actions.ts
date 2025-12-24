'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';

export type MessageResult = {
  success: boolean;
  data?: any;
  error?: string;
};

/**
 * Send a message in a conversation
 */
export async function sendMessage(
  conversationId: string,
  content: string
): Promise<MessageResult> {
  const supabase = await createClient(await cookies());

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Validate content
  if (!content || content.trim().length === 0) {
    return { success: false, error: 'Message cannot be empty' };
  }

  if (content.length > 1000) {
    return { success: false, error: 'Message is too long (max 1000 characters)' };
  }

  // Verify conversation exists and user is a participant
  const { data: conversation } = await supabase
    .from('conversations')
    .select('id, participant_1_id, participant_2_id')
    .eq('id', conversationId)
    .single();

  if (!conversation) {
    return { success: false, error: 'Conversation not found' };
  }

  const isParticipant =
    conversation.participant_1_id === user.id || conversation.participant_2_id === user.id;

  if (!isParticipant) {
    return { success: false, error: 'You are not a participant in this conversation' };
  }

  // Insert message
  const { data: message, error: insertError } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      sender_id: user.id,
      content: content.trim(),
    })
    .select()
    .single();

  if (insertError) {
    console.error('Send message error:', insertError);
    return { success: false, error: 'Failed to send message' };
  }

  // Update conversation's last_message_at
  await supabase
    .from('conversations')
    .update({ last_message_at: new Date().toISOString() })
    .eq('id', conversationId);

  revalidatePath('/dashboard/messages');

  return { success: true, data: message };
}

/**
 * Mark all messages in a conversation as read
 */
export async function markMessagesAsRead(conversationId: string): Promise<MessageResult> {
  const supabase = await createClient(await cookies());

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Mark all messages from other participant as read
  const { error } = await supabase
    .from('messages')
    .update({ read_at: new Date().toISOString() })
    .eq('conversation_id', conversationId)
    .neq('sender_id', user.id)
    .is('read_at', null);

  if (error) {
    console.error('Mark as read error:', error);
    return { success: false, error: 'Failed to mark messages as read' };
  }

  revalidatePath('/dashboard/messages');

  return { success: true };
}
