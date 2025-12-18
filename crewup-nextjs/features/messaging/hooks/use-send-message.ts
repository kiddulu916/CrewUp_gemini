'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { sendMessage } from '../actions/message-actions';

type SendMessageParams = {
  conversationId: string;
  content: string;
};

export function useSendMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ conversationId, content }: SendMessageParams) => {
      const result = await sendMessage(conversationId, content);

      if (!result.success) {
        throw new Error(result.error || 'Failed to send message');
      }

      return result.data;
    },
    onSuccess: () => {
      // Invalidate conversations to update last_message_at
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}
