import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ChatWindow } from '@/features/messaging/components/chat-window';
import { ConversationList } from '@/features/messaging/components/conversation-list';
import Link from 'next/link';
import { cookies } from 'next/headers';

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default async function ConversationPage({ params }: Props) {
  const { id: conversationId } = await params;
  const supabase = await createClient(await cookies());

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch conversation details to verify user is a participant
  const { data: conversation, error } = await supabase
    .from('conversations')
    .select('*')
    .eq('id', conversationId)
    .single();

  if (error) {
    console.error('[ConversationPage] Error fetching conversation:', error);
    redirect('/dashboard/messages');
  }

  if (!conversation) {
    console.error('[ConversationPage] Conversation not found:', conversationId);
    redirect('/dashboard/messages');
  }

  // Verify user is a participant
  const isParticipant =
    conversation.participant_1_id === user.id ||
    conversation.participant_2_id === user.id;

  if (!isParticipant) {
    console.error('[ConversationPage] User is not a participant');
    redirect('/dashboard/messages');
  }

  // Determine the other participant
  const otherParticipantId =
    conversation.participant_1_id === user.id
      ? conversation.participant_2_id
      : conversation.participant_1_id;

  console.log('[ConversationPage] Loading conversation:', {
    conversationId,
    userId: user.id,
    otherParticipantId
  });

  // Fetch other participant's profile
  const { data: otherProfile, error: profileError } = await supabase
    .from('profiles')
    .select('id, name')
    .eq('id', otherParticipantId)
    .single();

  if (profileError) {
    console.error('[ConversationPage] Error fetching profile:', profileError);
    redirect('/dashboard/messages');
  }

  if (!otherProfile) {
    console.error('[ConversationPage] Other participant profile not found');
    redirect('/dashboard/messages');
  }

  return (
    <div className="flex h-screen -mx-4 -my-8 sm:-mx-6 lg:-mx-8">
      {/* Left Sidebar - Conversation List */}
      <div className="hidden md:block md:w-1/4 md:border-r-2 md:border-gray-200 overflow-y-auto">
        <div className="bg-gradient-to-r from-krewup-blue to-krewup-light-blue p-4 border-b-2 border-gray-200">
          <h1 className="text-xl font-bold text-white">Messages</h1>
          <p className="text-sm text-blue-100">Your conversations</p>
        </div>
        <ConversationList activeConversationId={conversationId} />
      </div>

      {/* Right Panel - Chat Window */}
      <div className="w-full md:w-3/4 flex flex-col h-full">
        {/* Mobile Back Button */}
        <div className="md:hidden bg-gradient-to-r from-krewup-blue to-krewup-light-blue border-b-2 border-gray-200 p-3 flex items-center gap-3 shrink-0">
          <Link
            href="/dashboard/messages"
            className="flex items-center justify-center h-8 w-8 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
          >
            <svg
              className="w-5 h-5 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </Link>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-krewup-blue font-bold shadow-md text-sm">
              {otherProfile.name.charAt(0).toUpperCase()}
            </div>
            <h1 className="text-lg font-bold text-white">{otherProfile.name}</h1>
          </div>
        </div>

        {/* Chat Window */}
        <div className="flex-1 min-h-0">
          <ChatWindow
            conversationId={conversationId}
            otherParticipant={otherProfile}
          />
        </div>
      </div>
    </div>
  );
}
