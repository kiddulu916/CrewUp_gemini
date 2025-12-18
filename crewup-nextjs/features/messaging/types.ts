export type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  read_at: string | null;
  created_at: string;
  sender?: {
    id: string;
    name: string;
    profile_image_url?: string;
  };
};

export type Conversation = {
  id: string;
  participant_1_id: string;
  participant_2_id: string;
  last_message_at: string | null;
  created_at: string;
  participant_1?: {
    id: string;
    name: string;
    profile_image_url?: string;
  };
  participant_2?: {
    id: string;
    name: string;
    profile_image_url?: string;
  };
};

export type ConversationWithDetails = {
  id: string;
  otherParticipant: {
    id: string;
    name: string;
    profile_image_url?: string;
  };
  lastMessage?: {
    id: string;
    content: string;
    sender_id: string;
    created_at: string;
  };
  lastMessageAt: string | null;
  unreadCount: number;
};
