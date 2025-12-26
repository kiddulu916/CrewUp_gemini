'use client';

import { useSearchParams } from 'next/navigation';
import { ConversationList } from '@/features/messaging/components/conversation-list';
import { ChatWindow } from '@/features/messaging/components/chat-window';
import { useConversations } from '@/features/messaging/hooks/use-conversations';

export default function MessagesPage() {
  const searchParams = useSearchParams();
  const activeConversationId = searchParams.get('conversation');
  const { data: conversations } = useConversations();

  // Find the active conversation details for the chat window
  const activeConversation = conversations?.find(
    (conv) => conv.id === activeConversationId
  );

  return (
    <div className="flex h-screen -mx-4 -my-8 sm:-mx-6 lg:-mx-8">
      {/* Left Sidebar - Conversation List */}
      <div
        className={`w-full md:w-1/4 md:border-r-2 md:border-gray-200 overflow-y-auto ${
          activeConversationId ? 'hidden md:block' : 'block'
        }`}
      >
        <div className="bg-gradient-to-r from-krewup-blue to-krewup-light-blue p-4 border-b-2 border-gray-200">
          <h1 className="text-xl font-bold text-white">Messages</h1>
          <p className="text-sm text-blue-100">Your conversations</p>
        </div>
        <ConversationList activeConversationId={activeConversationId || undefined} />
      </div>

      {/* Right Panel - Chat Window */}
      <div
        className={`w-full md:w-3/4 h-full ${
          activeConversationId ? 'block' : 'hidden md:block'
        }`}
      >
        {activeConversationId && activeConversation ? (
          <div className="h-full">
            <ChatWindow
              conversationId={activeConversationId}
              otherParticipant={activeConversation.otherParticipant}
            />
          </div>
        ) : (
          <div className="flex items-center justify-center h-full bg-gray-50">
            <div className="text-center max-w-md px-4">
              <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-blue-50 to-orange-50 mb-6">
                <span className="text-5xl">💬</span>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">
                Select a conversation
              </h2>
              <p className="text-gray-600">
                Choose a conversation from the sidebar to start messaging, or start a new
                conversation from a job posting or profile.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
