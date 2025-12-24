'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';

export type ConversationResult = {
  success: boolean;
  conversationId?: string;
  error?: string;
};

/**
 * Find or create a conversation with a recipient
 * Redirects to the conversation page after creation/finding
 */
export async function findOrCreateConversation(recipientId: string) {
  const supabase = await createClient(await cookies());

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error('Not authenticated');
  }

  // Can't message yourself
  if (user.id === recipientId) {
    throw new Error('Cannot message yourself');
  }

  // Order participant IDs to ensure uniqueness
  // participant_1_id is always the smaller UUID
  const [participant1, participant2] = [user.id, recipientId].sort();

  // Try to find existing conversation
  const { data: existing } = await supabase
    .from('conversations')
    .select('id')
    .eq('participant_1_id', participant1)
    .eq('participant_2_id', participant2)
    .single();

  if (existing) {
    // Conversation exists, redirect to it
    redirect(`/dashboard/messages/${existing.id}`);
  }

  // Create new conversation
  const { data: newConversation, error: createError } = await supabase
    .from('conversations')
    .insert({
      participant_1_id: participant1,
      participant_2_id: participant2,
    })
    .select('id')
    .single();

  if (createError) {
    console.error('Create conversation error:', createError);
    throw new Error('Failed to create conversation');
  }

  // Redirect to new conversation
  redirect(`/dashboard/messages/${newConversation.id}`);
}
