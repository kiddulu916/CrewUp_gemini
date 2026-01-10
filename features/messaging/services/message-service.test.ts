import { describe, it, expect } from 'vitest';
import {
  validateMessageInput,
  validateMessageContent,
  isConversationParticipant,
  getOtherParticipantId,
  validateConversationParticipants,
  isMessageUnread,
  countUnreadMessages,
  getLastMessage,
  formatMessagePreview,
  formatMessageTimestamp,
  buildMessageRecord,
  groupMessagesByDate,
  sortConversationsByRecent,
  hasMessages,
  MAX_MESSAGE_LENGTH,
  type MessageInput,
  type Conversation,
  type Message,
} from './message-service';

// ============================================================================
// Test Factories
// ============================================================================

function createConversation(overrides?: Partial<Conversation>): Conversation {
  return {
    id: 'conv-1',
    participant_1_id: 'user-1',
    participant_2_id: 'user-2',
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

function createMessage(overrides?: Partial<Message>): Message {
  return {
    id: 'msg-1',
    conversation_id: 'conv-1',
    sender_id: 'user-1',
    content: 'Hello!',
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

// ============================================================================
// validateMessageInput Tests
// ============================================================================

describe('validateMessageInput', () => {
  it('should return valid for valid input', () => {
    const input: MessageInput = {
      conversationId: 'conv-123',
      content: 'Hello, how are you?',
    };
    expect(validateMessageInput(input).valid).toBe(true);
  });

  it('should reject missing conversationId', () => {
    const input = { conversationId: '', content: 'Hello' } as MessageInput;
    const result = validateMessageInput(input);
    expect(result.valid).toBe(false);
    expect(result.field).toBe('conversationId');
  });

  it('should reject empty content', () => {
    const input: MessageInput = { conversationId: 'conv-123', content: '' };
    const result = validateMessageInput(input);
    expect(result.valid).toBe(false);
    expect(result.field).toBe('content');
  });
});

// ============================================================================
// validateMessageContent Tests
// ============================================================================

describe('validateMessageContent', () => {
  it('should accept valid content', () => {
    expect(validateMessageContent('Hello!').valid).toBe(true);
    expect(validateMessageContent('A').valid).toBe(true);
  });

  it('should reject empty content', () => {
    expect(validateMessageContent('').valid).toBe(false);
    expect(validateMessageContent('   ').valid).toBe(false);
    expect(validateMessageContent(null).valid).toBe(false);
    expect(validateMessageContent(undefined).valid).toBe(false);
  });

  it('should reject content too long', () => {
    const longContent = 'A'.repeat(MAX_MESSAGE_LENGTH + 1);
    const result = validateMessageContent(longContent);
    expect(result.valid).toBe(false);
    expect(result.error).toContain(`${MAX_MESSAGE_LENGTH}`);
  });

  it('should accept content at max length', () => {
    const maxContent = 'A'.repeat(MAX_MESSAGE_LENGTH);
    expect(validateMessageContent(maxContent).valid).toBe(true);
  });
});

// ============================================================================
// Participant Tests
// ============================================================================

describe('isConversationParticipant', () => {
  it('should return true for participant 1', () => {
    const conv = createConversation();
    expect(isConversationParticipant(conv, 'user-1')).toBe(true);
  });

  it('should return true for participant 2', () => {
    const conv = createConversation();
    expect(isConversationParticipant(conv, 'user-2')).toBe(true);
  });

  it('should return false for non-participant', () => {
    const conv = createConversation();
    expect(isConversationParticipant(conv, 'user-3')).toBe(false);
  });
});

describe('getOtherParticipantId', () => {
  it('should return participant 2 when current is participant 1', () => {
    const conv = createConversation();
    expect(getOtherParticipantId(conv, 'user-1')).toBe('user-2');
  });

  it('should return participant 1 when current is participant 2', () => {
    const conv = createConversation();
    expect(getOtherParticipantId(conv, 'user-2')).toBe('user-1');
  });

  it('should return null for non-participant', () => {
    const conv = createConversation();
    expect(getOtherParticipantId(conv, 'user-3')).toBeNull();
  });
});

describe('validateConversationParticipants', () => {
  it('should return valid for different users', () => {
    expect(validateConversationParticipants('user-1', 'user-2').valid).toBe(true);
  });

  it('should reject same user', () => {
    const result = validateConversationParticipants('user-1', 'user-1');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('yourself');
  });

  it('should reject empty user IDs', () => {
    expect(validateConversationParticipants('', 'user-2').valid).toBe(false);
    expect(validateConversationParticipants('user-1', '').valid).toBe(false);
  });
});

// ============================================================================
// Message Utility Tests
// ============================================================================

describe('isMessageUnread', () => {
  it('should return true for message without read_at from other user', () => {
    const msg = createMessage({ sender_id: 'user-1', read_at: null });
    expect(isMessageUnread(msg, 'user-2')).toBe(true);
  });

  it('should return false for own message', () => {
    const msg = createMessage({ sender_id: 'user-1', read_at: null });
    expect(isMessageUnread(msg, 'user-1')).toBe(false);
  });

  it('should return false for read message', () => {
    const msg = createMessage({ sender_id: 'user-1', read_at: new Date().toISOString() });
    expect(isMessageUnread(msg, 'user-2')).toBe(false);
  });
});

describe('countUnreadMessages', () => {
  it('should count unread messages for user', () => {
    const messages: Message[] = [
      createMessage({ id: '1', sender_id: 'user-1', read_at: null }),
      createMessage({ id: '2', sender_id: 'user-1', read_at: null }),
      createMessage({ id: '3', sender_id: 'user-2', read_at: null }),
      createMessage({ id: '4', sender_id: 'user-1', read_at: new Date().toISOString() }),
    ];
    expect(countUnreadMessages(messages, 'user-2')).toBe(2);
  });

  it('should return 0 for empty array', () => {
    expect(countUnreadMessages([], 'user-1')).toBe(0);
  });
});

describe('getLastMessage', () => {
  it('should return last message in array', () => {
    const messages: Message[] = [
      createMessage({ id: '1', content: 'First' }),
      createMessage({ id: '2', content: 'Second' }),
      createMessage({ id: '3', content: 'Last' }),
    ];
    expect(getLastMessage(messages)?.content).toBe('Last');
  });

  it('should return null for empty array', () => {
    expect(getLastMessage([])).toBeNull();
  });
});

describe('formatMessagePreview', () => {
  it('should return full content if short', () => {
    expect(formatMessagePreview('Hello')).toBe('Hello');
  });

  it('should truncate long content', () => {
    const long = 'A'.repeat(100);
    const preview = formatMessagePreview(long, 50);
    expect(preview.length).toBe(50);
    expect(preview.endsWith('...')).toBe(true);
  });

  it('should handle empty content', () => {
    expect(formatMessagePreview('')).toBe('');
  });

  it('should trim whitespace', () => {
    expect(formatMessagePreview('  Hello  ')).toBe('Hello');
  });
});

describe('formatMessageTimestamp', () => {
  it('should return "Just now" for recent messages', () => {
    const now = new Date().toISOString();
    expect(formatMessageTimestamp(now)).toBe('Just now');
  });

  it('should return minutes for messages under an hour', () => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    expect(formatMessageTimestamp(fiveMinAgo)).toBe('5 min ago');
  });

  it('should return hours for messages under a day', () => {
    const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
    expect(formatMessageTimestamp(threeHoursAgo)).toBe('3h ago');
  });

  it('should return "Yesterday" for messages 1 day old', () => {
    const yesterday = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
    expect(formatMessageTimestamp(yesterday)).toBe('Yesterday');
  });

  it('should return days for messages under a week', () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    expect(formatMessageTimestamp(threeDaysAgo)).toBe('3d ago');
  });

  it('should return formatted date for older messages', () => {
    const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
    const result = formatMessageTimestamp(twoWeeksAgo);
    // Should be like "Dec 26" or similar
    expect(result).toMatch(/^[A-Z][a-z]{2} \d{1,2}$/);
  });
});

// ============================================================================
// buildMessageRecord Tests
// ============================================================================

describe('buildMessageRecord', () => {
  it('should build correct record', () => {
    const input: MessageInput = {
      conversationId: 'conv-123',
      content: '  Hello World  ',
    };
    const record = buildMessageRecord(input, 'user-456');

    expect(record.conversation_id).toBe('conv-123');
    expect(record.sender_id).toBe('user-456');
    expect(record.content).toBe('Hello World'); // Trimmed
  });
});

// ============================================================================
// groupMessagesByDate Tests
// ============================================================================

describe('groupMessagesByDate', () => {
  it('should group messages by date', () => {
    const today = new Date();
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const messages: Message[] = [
      createMessage({ id: '1', created_at: today.toISOString() }),
      createMessage({ id: '2', created_at: today.toISOString() }),
      createMessage({ id: '3', created_at: yesterday.toISOString() }),
    ];

    const groups = groupMessagesByDate(messages);
    expect(groups.size).toBe(2);
  });

  it('should return empty map for empty array', () => {
    const groups = groupMessagesByDate([]);
    expect(groups.size).toBe(0);
  });
});

// ============================================================================
// Conversation Utility Tests
// ============================================================================

describe('sortConversationsByRecent', () => {
  it('should sort by last_message_at descending', () => {
    const conversations: Conversation[] = [
      createConversation({ id: '1', last_message_at: '2024-01-01T10:00:00Z' }),
      createConversation({ id: '2', last_message_at: '2024-01-03T10:00:00Z' }),
      createConversation({ id: '3', last_message_at: '2024-01-02T10:00:00Z' }),
    ];

    const sorted = sortConversationsByRecent(conversations);
    expect(sorted[0].id).toBe('2');
    expect(sorted[1].id).toBe('3');
    expect(sorted[2].id).toBe('1');
  });

  it('should handle conversations without last_message_at', () => {
    const conversations: Conversation[] = [
      createConversation({ id: '1', last_message_at: undefined }),
      createConversation({ id: '2', last_message_at: '2024-01-01T10:00:00Z' }),
    ];

    const sorted = sortConversationsByRecent(conversations);
    expect(sorted[0].id).toBe('2');
    expect(sorted[1].id).toBe('1');
  });

  it('should not mutate original array', () => {
    const conversations: Conversation[] = [
      createConversation({ id: '1' }),
      createConversation({ id: '2' }),
    ];
    const sorted = sortConversationsByRecent(conversations);
    expect(sorted).not.toBe(conversations);
  });
});

describe('hasMessages', () => {
  it('should return true if last_message_at exists', () => {
    const conv = createConversation({ last_message_at: new Date().toISOString() });
    expect(hasMessages(conv)).toBe(true);
  });

  it('should return false if no last_message_at', () => {
    const conv = createConversation({ last_message_at: undefined });
    expect(hasMessages(conv)).toBe(false);
  });
});
