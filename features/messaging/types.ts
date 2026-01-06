// * Base user info type for messaging participants
export type ParticipantInfo = {
  id: string;
  first_name: string;
  last_name: string;
  profile_image_url?: string;
};

// * Legacy participant info with computed name field (for backward compatibility)
export type ParticipantInfoWithName = {
  id: string;
  name: string;
  profile_image_url?: string;
};

export type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  read_at: string | null;
  created_at: string;
  sender?: ParticipantInfoWithName;
};

export type Conversation = {
  id: string;
  participant_1_id: string;
  participant_2_id: string;
  last_message_at: string | null;
  created_at: string;
  participant_1?: ParticipantInfoWithName;
  participant_2?: ParticipantInfoWithName;
};

export type ConversationWithDetails = {
  id: string;
  otherParticipant: ParticipantInfoWithName;
  lastMessage?: {
    id: string;
    content: string;
    sender_id: string;
    created_at: string;
  };
  lastMessageAt: string | null;
  unreadCount: number;
};
