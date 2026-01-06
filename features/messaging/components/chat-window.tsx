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
import { Avatar } from '@/components/ui';
import { PollingStatusIndicator, ConnectionErrorBanner } from '@/components/ui/polling-status';

type Props = {
  conversationId: string;
  otherParticipant?: {
    id: string;
    name: string;
    profile_image_url?: string | null;
  };
};

export function ChatWindow({ conversationId, otherParticipant }: Props) {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const { messages, isLoading, isFetching, status, markActive, refetchNow } = useMessages(conversationId);
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
      markMessagesAsRead(conversationId).then((result) => {
        if (result.success) {
          // Invalidate immediately
          queryClient.invalidateQueries({ queryKey: ['conversations'] });

          // And again after delay to ensure database is updated
          setTimeout(() => {
            queryClient.invalidateQueries({ queryKey: ['conversations'] });
            queryClient.refetchQueries({ queryKey: ['conversations'] });
          }, 1000);
        }
      });
    }
  }, [conversationId, queryClient]);

  async function handleSend(content: string) {
    // * Mark as active when sending a message (resets idle timer)
    markActive();
    await sendMessage.mutateAsync({
      conversationId,
      content,
    });
  }

  return (
    <div className="flex flex-col h-full">
      {/* Connection Error Banner */}
      <ConnectionErrorBanner
        errorCount={status.errorCount}
        onRetry={refetchNow}
      />

      {/* Header */}
      {otherParticipant && (
        <div className="border-b-2 border-gray-200 bg-gradient-to-r from-krewup-blue to-krewup-light-blue p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar
                src={otherParticipant.profile_image_url}
                name={otherParticipant.name}
                userId={otherParticipant.id}
                size="md"
                border="white"
                shadow
              />
              <div>
                <h2 className="text-lg font-bold text-white">{otherParticipant.name}</h2>
                <p className="text-sm text-blue-100">Active conversation</p>
              </div>
            </div>
            {/* Polling Status */}
            <PollingStatusIndicator
              status={status}
              isFetching={isFetching}
              onRefresh={refetchNow}
              compact
              className="text-white/80"
            />
          </div>
        </div>
      )}

      {/* Messages */}
      <MessageList
        messages={messages || []}
        currentUserId={currentUserId}
        isLoading={isLoading}
      />

      {/* Input - mark active on focus */}
      <div onFocus={markActive}>
        <MessageInput onSend={handleSend} isLoading={sendMessage.isPending} />
      </div>
    </div>
  );
}
