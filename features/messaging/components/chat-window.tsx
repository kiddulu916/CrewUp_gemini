'use client';

import { useEffect } from 'react';
import React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useMessages } from '../hooks/use-messages';
import { useSendMessage } from '../hooks/use-send-message';
import { MessageList } from './message-list';
import { MessageInput } from './message-input';
import { markMessagesAsRead } from '../actions/message-actions';
import { createClient } from '@/lib/supabase/client';
import { InitialsAvatar } from '@/lib/utils/initials-avatar';

type Props = {
  conversationId: string;
  otherParticipant?: {
    id: string;
    name: string;
    profile_image_url?: string;
  };
};

export function ChatWindow({ conversationId, otherParticipant }: Props) {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const { data: messages, isLoading } = useMessages(conversationId);
  const sendMessage = useSendMessage();

  // Get current user ID
  const [currentUserId, setCurrentUserId] = React.useState<string | undefined>();

  React.useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUserId(data.user?.id);
    });
  }, [supabase]);

  // Mark messages as read when conversation opens
  useEffect(() => {
    if (conversationId) {
      console.log('[ChatWindow] Opening conversation:', conversationId);
      markMessagesAsRead(conversationId).then((result) => {
        if (result.success) {
          console.log('[ChatWindow] Successfully marked messages as read');
          // Invalidate immediately
          queryClient.invalidateQueries({ queryKey: ['conversations'] });
          console.log('[ChatWindow] Invalidated conversations query (immediate)');

          // And again after delay to ensure database is updated
          setTimeout(() => {
            queryClient.invalidateQueries({ queryKey: ['conversations'] });
            queryClient.refetchQueries({ queryKey: ['conversations'] });
            console.log('[ChatWindow] Force refetch conversations query (delayed)');
          }, 1000);
        } else {
          console.error('[ChatWindow] Failed to mark messages as read:', result.error);
        }
      });
    }
  }, [conversationId, queryClient]);

  async function handleSend(content: string) {
    await sendMessage.mutateAsync({
      conversationId,
      content,
    });
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      {otherParticipant && (
        <div className="border-b-2 border-gray-200 bg-gradient-to-r from-krewup-blue to-krewup-light-blue p-4">
          <div className="flex items-center gap-3">
            {otherParticipant.profile_image_url ? (
              <img
                src={otherParticipant.profile_image_url}
                alt={otherParticipant.name}
                className="h-10 w-10 rounded-full object-cover border-2 border-white shadow-md"
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-krewup-blue font-bold shadow-md">
                {otherParticipant.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <h2 className="text-lg font-bold text-white">{otherParticipant.name}</h2>
              <p className="text-sm text-blue-100">Active conversation</p>
            </div>
          </div>
        </div>
      )}

      {/* Messages */}
      <MessageList
        messages={messages || []}
        currentUserId={currentUserId}
        isLoading={isLoading}
      />

      {/* Input */}
      <MessageInput onSend={handleSend} isLoading={sendMessage.isPending} />
    </div>
  );
}
