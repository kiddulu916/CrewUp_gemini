import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ChatWindow } from '@/features/messaging/components/chat-window';
import Link from 'next/link';

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default async function ConversationPage({ params }: Props) {
  const { id: conversationId } = await params;
  const supabase = await createClient();

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
    .select('*, profiles!conversations_participant_1_id_fkey(*), profiles!conversations_participant_2_id_fkey(*)')
    .eq('id', conversationId)
    .single();

  if (error || !conversation) {
    redirect('/dashboard/messages');
  }

  // Verify user is a participant
  const isParticipant =
    conversation.participant_1_id === user.id ||
    conversation.participant_2_id === user.id;

  if (!isParticipant) {
    redirect('/dashboard/messages');
  }

  // Determine the other participant
  const otherParticipantId =
    conversation.participant_1_id === user.id
      ? conversation.participant_2_id
      : conversation.participant_1_id;

  // Fetch other participant's profile
  const { data: otherProfile } = await supabase
    .from('profiles')
    .select('id, name, profile_image_url')
    .eq('id', otherParticipantId)
    .single();

  if (!otherProfile) {
    redirect('/dashboard/messages');
  }

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col">
      {/* Mobile Back Button */}
      <div className="md:hidden bg-gradient-to-r from-crewup-blue to-crewup-light-blue border-b-2 border-gray-200 p-3 flex items-center gap-3">
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
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-crewup-blue font-bold shadow-md text-sm">
            {otherProfile.name.charAt(0).toUpperCase()}
          </div>
          <h1 className="text-lg font-bold text-white">{otherProfile.name}</h1>
        </div>
      </div>

      {/* Chat Window */}
      <div className="flex-1 overflow-hidden">
        <ChatWindow
          conversationId={conversationId}
          otherParticipant={otherProfile}
        />
      </div>
    </div>
  );
}
