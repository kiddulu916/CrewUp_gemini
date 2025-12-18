# Real-Time Messaging MVP Design

**Date:** 2025-01-18
**Status:** Approved
**Scope:** MVP - Core messaging without typing indicators or infinite scroll

---

## Overview

Implement real-time messaging between workers and employers using Supabase Real-time (PostgreSQL replication). Messages appear instantly without page refresh, providing a modern chat experience.

## Key Decisions

### Scope: MVP Only
- ✅ Conversation list showing active chats
- ✅ Real-time chat window with message history
- ✅ Send/receive messages instantly
- ✅ Basic read receipts
- ❌ Typing indicators (future)
- ❌ Infinite scroll (future)
- ❌ Advanced presence indicators (future)

### Entry Points: From Jobs & Profiles
- Workers can message employers from job detail pages (no application required)
- Any user can message another from their profile page
- Enables questions before applying and general networking

### Layout: Responsive Hybrid
- **Desktop (≥768px):** Split view with 20% conversation list sidebar and 80% chat panel
- **Mobile (<768px):** Separate pages - list view navigates to full-screen chat
- URL updates on desktop, navigation on mobile

---

## Database Schema

### conversations table
```sql
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_1_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  participant_2_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  last_message_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Ensure unique conversation per pair (ordered IDs)
  CONSTRAINT unique_participants UNIQUE (participant_1_id, participant_2_id),
  CONSTRAINT ordered_participants CHECK (participant_1_id < participant_2_id)
);

CREATE INDEX idx_conversations_participant_1 ON conversations(participant_1_id);
CREATE INDEX idx_conversations_participant_2 ON conversations(participant_2_id);
CREATE INDEX idx_conversations_last_message ON conversations(last_message_at DESC);
```

### messages table
```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (length(content) BETWEEN 1 AND 1000),
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at);
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_unread ON messages(conversation_id, read_at) WHERE read_at IS NULL;
```

---

## Real-Time Implementation

### Data Flow

1. **Initial Load:**
   - Fetch last 50 messages via TanStack Query
   - Query key: `['messages', conversationId]`
   - Ordered by created_at ASC (oldest first)

2. **Real-Time Subscription:**
   - Subscribe to Supabase channel: `conversation:${conversationId}`
   - Listen for INSERT events on messages table
   - Filter: `conversation_id=eq.${conversationId}`
   - On new message: Update TanStack Query cache optimistically
   - Auto-scroll to bottom

3. **Sending Messages:**
   - Server Action: `sendMessage(conversationId, recipientId, content)`
   - If no conversationId: Find or create conversation with recipient
   - Insert message into database
   - Update conversation's last_message_at
   - PostgreSQL replication broadcasts to subscribers automatically

4. **Read Receipts:**
   - Mark all unread messages as read when conversation opens
   - Server Action: `markMessagesAsRead(conversationId)`
   - Updates read_at timestamp
   - Show unread count badges on conversation list

---

## UI Components

### ConversationList
- Shows all user's conversations
- Avatar + name of other participant
- Last message preview (truncated to 50 chars)
- Unread count badge (red)
- Relative timestamp ("5m ago", "2h ago")
- Sorted by last_message_at DESC
- Empty state for no conversations

### ChatWindow
- Header: Other user's name, avatar, and back button (mobile)
- Message history with auto-scroll to bottom
- Message input with character counter (1000 max)
- Real-time updates via Supabase subscription
- Loading state on initial fetch

### MessageBubble
- Sent messages: Right-aligned, blue gradient background
- Received messages: Left-aligned, gray background
- Show avatar for received messages only
- Timestamp on hover or below message
- Word wrap for long messages

### MessageInput
- Textarea (2 rows, auto-expand on typing)
- Character counter: "X/1000 characters"
- Send button (disabled when empty or > 1000 chars)
- Enter to send, Shift+Enter for new line
- Loading state while sending

---

## File Structure

```
features/messaging/
├── actions/
│   ├── message-actions.ts         # sendMessage, markMessagesAsRead
│   └── conversation-actions.ts     # findOrCreateConversation
├── components/
│   ├── conversation-list.tsx       # List of all conversations
│   ├── conversation-item.tsx       # Single conversation preview
│   ├── chat-window.tsx             # Main chat interface
│   ├── message-list.tsx            # Scrollable message history
│   ├── message-bubble.tsx          # Individual message
│   └── message-input.tsx           # Send message form
├── hooks/
│   ├── use-conversations.ts        # TanStack Query for conversations
│   ├── use-messages.ts             # TanStack Query + real-time subscription
│   └── use-send-message.ts         # Mutation for sending messages
└── types.ts                        # Conversation, Message TypeScript types

app/dashboard/messages/
├── page.tsx                        # Desktop: Split view, Mobile: Conversation list
└── [id]/
    └── page.tsx                    # Mobile: Full-screen chat (desktop redirects)

components/ui/
└── textarea.tsx                    # New component for message input
```

---

## Entry Point Integrations

### 1. Job Detail Page
**Location:** `app/dashboard/jobs/[id]/page.tsx`

Add "Message Employer" button for workers:
```tsx
{isWorker && job.employer && (
  <MessageButton recipientId={job.employer_id} />
)}
```

### 2. Profile Page
**Location:** `app/dashboard/profile/page.tsx` (when viewing others)

Add "Send Message" button:
```tsx
{profile.id !== currentUser.id && (
  <MessageButton recipientId={profile.id} />
)}
```

### MessageButton Component
Clicking the button:
1. Finds or creates conversation with recipient
2. Navigates to conversation:
   - Desktop: `/dashboard/messages?conversation={id}`
   - Mobile: `/dashboard/messages/{id}`

---

## Implementation Checklist

### Database Setup
- [ ] Verify conversations and messages tables exist (already created in Phase 0)
- [ ] Enable real-time replication for messages table in Supabase dashboard
- [ ] Enable real-time replication for conversations table in Supabase dashboard

### Core Components
- [ ] Create Textarea UI component
- [ ] Create ConversationList component
- [ ] Create ConversationItem component
- [ ] Create ChatWindow component
- [ ] Create MessageList component
- [ ] Create MessageBubble component
- [ ] Create MessageInput component

### Hooks & Actions
- [ ] Create use-conversations hook
- [ ] Create use-messages hook with real-time subscription
- [ ] Create use-send-message hook
- [ ] Create sendMessage server action
- [ ] Create markMessagesAsRead server action
- [ ] Create findOrCreateConversation server action

### Pages
- [ ] Create messages list page (desktop split view, mobile list)
- [ ] Create chat window page (mobile only)
- [ ] Update dashboard layout navigation

### Entry Points
- [ ] Add MessageButton component
- [ ] Integrate MessageButton in job detail page
- [ ] Integrate MessageButton in profile page

### Testing
- [ ] Test conversation creation
- [ ] Test sending messages
- [ ] Test receiving messages in real-time
- [ ] Test read receipts
- [ ] Test responsive layout (desktop/mobile)

---

## Performance Considerations

1. **Limit initial load:** Fetch only last 50 messages
2. **Unsubscribe on unmount:** Clean up real-time channels to prevent memory leaks
3. **Optimize re-renders:** Use React.memo for MessageBubble components
4. **Debounce scroll:** Only trigger auto-scroll after 100ms of inactivity

---

## Future Enhancements (Post-MVP)

- Typing indicators using Supabase Presence API
- Infinite scroll for long conversation history
- Message search functionality
- File attachments (images, PDFs)
- Message editing/deletion
- Emoji reactions
- Voice messages
- Video calls
