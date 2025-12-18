'use client';

import { useConversations } from '../hooks/use-conversations';
import { ConversationItem } from './conversation-item';

type Props = {
  activeConversationId?: string;
};

export function ConversationList({ activeConversationId }: Props) {
  const { data: conversations, isLoading } = useConversations();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-crewup-blue border-r-transparent"></div>
          <p className="mt-2 text-sm text-gray-500">Loading conversations...</p>
        </div>
      </div>
    );
  }

  if (!conversations || conversations.length === 0) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center max-w-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-blue-50 to-orange-50 mb-4">
            <span className="text-3xl">💬</span>
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">No conversations yet</h3>
          <p className="text-sm text-gray-600">
            Start a conversation by messaging someone from a job posting or their profile
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-200">
      {conversations.map((conversation) => (
        <ConversationItem
          key={conversation.id}
          conversation={conversation}
          isActive={activeConversationId === conversation.id}
        />
      ))}
    </div>
  );
}
