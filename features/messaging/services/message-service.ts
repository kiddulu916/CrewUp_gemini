/**
 * Message Service - Pure business logic for messaging.
 *
 * This module contains testable pure functions for message validation
 * and data transformation. No Server Action dependencies.
 */

// ============================================================================
// Types
// ============================================================================

export type MessageInput = {
  conversationId: string;
  content: string;
};

export type Conversation = {
  id: string;
  participant_1_id: string;
  participant_2_id: string;
  last_message_at?: string;
  created_at: string;
};

export type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  read_at?: string | null;
  created_at: string;
};

export type ValidationResult = {
  valid: boolean;
  error?: string;
  field?: string;
};

export type ConversationParticipant = {
  id: string;
  name: string;
  profile_image_url?: string | null;
};

// ============================================================================
// Constants
// ============================================================================

export const MAX_MESSAGE_LENGTH = 1000;
export const MIN_MESSAGE_LENGTH = 1;

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validates message input.
 * @param input - Message input data
 * @returns ValidationResult
 */
export function validateMessageInput(input: MessageInput): ValidationResult {
  // Conversation ID validation
  if (!input.conversationId || typeof input.conversationId !== 'string') {
    return { valid: false, error: 'Conversation ID is required', field: 'conversationId' };
  }

  if (input.conversationId.trim().length === 0) {
    return { valid: false, error: 'Conversation ID cannot be empty', field: 'conversationId' };
  }

  // Content validation
  const contentResult = validateMessageContent(input.content);
  if (!contentResult.valid) return contentResult;

  return { valid: true };
}

/**
 * Validates message content.
 * @param content - The message content
 * @returns ValidationResult
 */
export function validateMessageContent(content: string | undefined | null): ValidationResult {
  if (!content || typeof content !== 'string') {
    return { valid: false, error: 'Message content is required', field: 'content' };
  }

  const trimmed = content.trim();

  if (trimmed.length < MIN_MESSAGE_LENGTH) {
    return { valid: false, error: 'Message cannot be empty', field: 'content' };
  }

  if (trimmed.length > MAX_MESSAGE_LENGTH) {
    return {
      valid: false,
      error: `Message must be less than ${MAX_MESSAGE_LENGTH} characters`,
      field: 'content',
    };
  }

  return { valid: true };
}

// ============================================================================
// Participant Functions
// ============================================================================

/**
 * Checks if a user is a participant in a conversation.
 * @param conversation - The conversation to check
 * @param userId - The user ID to check
 * @returns true if user is a participant
 */
export function isConversationParticipant(conversation: Conversation, userId: string): boolean {
  return conversation.participant_1_id === userId || conversation.participant_2_id === userId;
}

/**
 * Gets the other participant's ID in a conversation.
 * @param conversation - The conversation
 * @param currentUserId - The current user's ID
 * @returns The other participant's ID or null if not found
 */
export function getOtherParticipantId(conversation: Conversation, currentUserId: string): string | null {
  if (conversation.participant_1_id === currentUserId) {
    return conversation.participant_2_id;
  }
  if (conversation.participant_2_id === currentUserId) {
    return conversation.participant_1_id;
  }
  return null;
}

/**
 * Checks if two user IDs would create a valid conversation.
 * @param userId1 - First user ID
 * @param userId2 - Second user ID
 * @returns ValidationResult
 */
export function validateConversationParticipants(userId1: string, userId2: string): ValidationResult {
  if (!userId1 || !userId2) {
    return { valid: false, error: 'Both participant IDs are required' };
  }

  if (userId1 === userId2) {
    return { valid: false, error: 'Cannot create conversation with yourself' };
  }

  return { valid: true };
}

// ============================================================================
// Message Utilities
// ============================================================================

/**
 * Checks if a message is unread by the recipient.
 * @param message - The message to check
 * @param recipientId - The recipient's user ID
 * @returns true if unread by recipient
 */
export function isMessageUnread(message: Message, recipientId: string): boolean {
  // Message is unread if:
  // 1. It wasn't sent by the recipient (they're the receiver)
  // 2. It has no read_at timestamp
  return message.sender_id !== recipientId && !message.read_at;
}

/**
 * Counts unread messages for a user.
 * @param messages - Array of messages
 * @param userId - The user to count unread for
 * @returns Number of unread messages
 */
export function countUnreadMessages(messages: Message[], userId: string): number {
  return messages.filter((m) => isMessageUnread(m, userId)).length;
}

/**
 * Gets the last message from a list of messages.
 * @param messages - Array of messages sorted by created_at
 * @returns The last message or null
 */
export function getLastMessage(messages: Message[]): Message | null {
  if (!messages || messages.length === 0) return null;

  // Assuming messages are sorted by created_at ascending
  return messages[messages.length - 1];
}

/**
 * Formats a message preview (truncated content).
 * @param content - Full message content
 * @param maxLength - Maximum length for preview
 * @returns Truncated preview
 */
export function formatMessagePreview(content: string, maxLength: number = 50): string {
  if (!content) return '';

  const trimmed = content.trim();
  if (trimmed.length <= maxLength) return trimmed;

  return `${trimmed.slice(0, maxLength - 3)}...`;
}

/**
 * Formats a relative timestamp for messages.
 * @param timestamp - ISO timestamp string
 * @returns Relative time string (e.g., "2 min ago", "Yesterday")
 */
export function formatMessageTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) {
    return 'Just now';
  }

  if (diffMinutes < 60) {
    return `${diffMinutes} min ago`;
  }

  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }

  if (diffDays === 1) {
    return 'Yesterday';
  }

  if (diffDays < 7) {
    return `${diffDays}d ago`;
  }

  // Format as date for older messages
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ============================================================================
// Data Transformation Functions
// ============================================================================

/**
 * Builds a message record for database insertion.
 * @param input - Message input
 * @param senderId - The sender's user ID
 * @returns Message record
 */
export function buildMessageRecord(
  input: MessageInput,
  senderId: string
): {
  conversation_id: string;
  sender_id: string;
  content: string;
} {
  return {
    conversation_id: input.conversationId,
    sender_id: senderId,
    content: input.content.trim(),
  };
}

/**
 * Groups messages by date for display.
 * @param messages - Array of messages
 * @returns Messages grouped by date string
 */
export function groupMessagesByDate(messages: Message[]): Map<string, Message[]> {
  const groups = new Map<string, Message[]>();

  for (const message of messages) {
    const date = new Date(message.created_at);
    const dateKey = date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const existing = groups.get(dateKey) || [];
    existing.push(message);
    groups.set(dateKey, existing);
  }

  return groups;
}

// ============================================================================
// Conversation Utilities
// ============================================================================

/**
 * Sorts conversations by last message time (most recent first).
 * @param conversations - Array of conversations
 * @returns Sorted conversations
 */
export function sortConversationsByRecent(conversations: Conversation[]): Conversation[] {
  return [...conversations].sort((a, b) => {
    const aTime = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
    const bTime = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
    return bTime - aTime;
  });
}

/**
 * Checks if a conversation has any messages.
 * @param conversation - The conversation to check
 * @returns true if has messages
 */
export function hasMessages(conversation: Conversation): boolean {
  return !!conversation.last_message_at;
}
