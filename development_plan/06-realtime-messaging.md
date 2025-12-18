# 06 - Real-Time Messaging

## Overview

Real-time messaging using Supabase Real-time (PostgreSQL replication). Messages appear instantly without page refresh, providing a modern chat experience.

## Architecture

### Components

1. **Conversation List** (`/dashboard/messages`) - Shows all conversations with last message preview
2. **Chat Window** (`/dashboard/messages/[conversationId]`) - Active conversation with message history
3. **Real-time Subscription** - Listens for new messages and updates UI instantly

### Data Flow

```
1. User opens conversation → Fetch initial messages via TanStack Query
2. Subscribe to real-time updates → Supabase channel for conversation
3. Other user sends message → API inserts into messages table
4. PostgreSQL replication → Broadcasts INSERT event
5. Supabase client receives event → Updates TanStack Query cache
6. UI re-renders → New message appears instantly
```

## Implementation

### Enable Real-time in Supabase

```sql
-- Enable real-time for messages and conversations tables
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
```

### Hooks

#### `use-conversations.ts`

```typescript
// features/messaging/hooks/use-conversations.ts
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

export function useConversations() {
  const supabase = createClient()

  return useQuery({
    queryKey: ['conversations'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Get all conversations where user is a participant
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          *,
          participant_1:profiles!participant_1_id(id, name, profile_image_url),
          participant_2:profiles!participant_2_id(id, name, profile_image_url),
          messages(
            id,
            content,
            created_at,
            sender_id,
            read_at
          )
        `)
        .or(`participant_1_id.eq.${user.id},participant_2_id.eq.${user.id}`)
        .order('last_message_at', { ascending: false })

      if (error) throw error

      // Transform data to show other participant and last message
      return data.map(conv => {
        const otherParticipant = conv.participant_1_id === user.id
          ? conv.participant_2
          : conv.participant_1

        const lastMessage = conv.messages?.[0]
        const unreadCount = conv.messages?.filter(
          m => m.sender_id !== user.id && !m.read_at
        ).length || 0

        return {
          id: conv.id,
          participant: otherParticipant,
          last_message: lastMessage,
          last_message_at: conv.last_message_at,
          unread_count: unreadCount,
        }
      })
    },
    staleTime: 0, // Always refetch when component mounts
  })
}
```

#### `use-messages.ts` (with Real-time)

```typescript
// features/messaging/hooks/use-messages.ts
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useEffect } from 'react'

export function useMessages(conversationId: string) {
  const queryClient = useQueryClient()
  const supabase = createClient()

  // Fetch initial messages
  const query = useQuery({
    queryKey: ['messages', conversationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:profiles!sender_id(id, name, profile_image_url)
        `)
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
        .limit(50) // Initial load limit

      if (error) throw error
      return data
    },
    enabled: !!conversationId,
  })

  // Subscribe to real-time updates
  useEffect(() => {
    if (!conversationId) return

    const channel = supabase
      .channel(`conversation:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          // Fetch sender profile for new message
          supabase
            .from('profiles')
            .select('id, name, profile_image_url')
            .eq('id', payload.new.sender_id)
            .single()
            .then(({ data: sender }) => {
              // Optimistically add new message to cache
              queryClient.setQueryData(
                ['messages', conversationId],
                (old: any[] = []) => {
                  const newMessage = { ...payload.new, sender }
                  // Prevent duplicates
                  if (old.find(m => m.id === newMessage.id)) return old
                  return [...old, newMessage]
                }
              )

              // Update conversation's last_message_at
              queryClient.invalidateQueries({ queryKey: ['conversations'] })

              // Auto-scroll to bottom
              window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })
            })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [conversationId, queryClient, supabase])

  return query
}
```

#### `use-send-message.ts`

```typescript
// features/messaging/hooks/use-send-message.ts
import { useMutation, useQueryClient } from '@tanstack/react-query'

export function useSendMessage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      conversation_id,
      recipient_id,
      content,
    }: {
      conversation_id?: string
      recipient_id?: string
      content: string
    }) => {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversation_id, recipient_id, content }),
      })

      if (!res.ok) throw new Error('Failed to send message')
      return res.json()
    },
    onSuccess: (data, variables) => {
      // Invalidate conversations to update last_message_at
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
    },
  })
}
```

### API Route

```typescript
// app/api/messages/route.ts
import { createServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const schema = z.object({
  conversation_id: z.string().uuid().optional(),
  recipient_id: z.string().uuid().optional(),
  content: z.string().min(1).max(1000),
}).refine(
  data => data.conversation_id || data.recipient_id,
  'Either conversation_id or recipient_id must be provided'
)

export async function POST(request: Request) {
  try {
    const supabase = createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { conversation_id, recipient_id, content } = schema.parse(body)

    let conversationId = conversation_id

    // If no conversation_id, create or find conversation with recipient
    if (!conversationId && recipient_id) {
      // Order participant IDs to ensure uniqueness
      const [p1, p2] = [user.id, recipient_id].sort()

      // Try to find existing conversation
      const { data: existing } = await supabase
        .from('conversations')
        .select('id')
        .eq('participant_1_id', p1)
        .eq('participant_2_id', p2)
        .single()

      if (existing) {
        conversationId = existing.id
      } else {
        // Create new conversation
        const { data: newConv, error: convError } = await supabase
          .from('conversations')
          .insert({
            participant_1_id: p1,
            participant_2_id: p2,
          })
          .select('id')
          .single()

        if (convError) throw convError
        conversationId = newConv.id
      }
    }

    // Insert message
    const { data: message, error: msgError } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content,
      })
      .select()
      .single()

    if (msgError) throw msgError

    // Update conversation's last_message_at
    await supabase
      .from('conversations')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', conversationId)

    // Real-time broadcast happens automatically via PostgreSQL replication

    return NextResponse.json({ data: message })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error('Send message error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

### Components

#### `conversation-list.tsx`

```typescript
// features/messaging/components/conversation-list.tsx
'use client'

import { useConversations } from '../hooks/use-conversations'
import { ConversationItem } from './conversation-item'
import { LoadingSpinner } from '@/components/common/loading-spinner'

export function ConversationList() {
  const { data: conversations, isLoading } = useConversations()

  if (isLoading) return <LoadingSpinner />

  if (!conversations?.length) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No conversations yet</p>
        <p className="text-sm text-gray-400">Start by applying to a job or posting one!</p>
      </div>
    )
  }

  return (
    <div className="divide-y">
      {conversations.map(conv => (
        <ConversationItem key={conv.id} conversation={conv} />
      ))}
    </div>
  )
}
```

#### `chat-window.tsx`

```typescript
// features/messaging/components/chat-window.tsx
'use client'

import { useMessages } from '../hooks/use-messages'
import { useSendMessage } from '../hooks/use-send-message'
import { MessageList } from './message-list'
import { MessageInput } from './message-input'
import { useAuth } from '@/features/auth/hooks/use-auth'

interface ChatWindowProps {
  conversationId: string
}

export function ChatWindow({ conversationId }: ChatWindowProps) {
  const { data: auth } = useAuth()
  const { data: messages, isLoading } = useMessages(conversationId)
  const sendMessage = useSendMessage()

  async function handleSend(content: string) {
    await sendMessage.mutateAsync({
      conversation_id: conversationId,
      content,
    })
  }

  if (isLoading) return <LoadingSpinner />

  return (
    <div className="flex flex-col h-[calc(100vh-200px)]">
      <MessageList
        messages={messages || []}
        currentUserId={auth?.user?.id}
      />
      <MessageInput
        onSend={handleSend}
        isLoading={sendMessage.isPending}
      />
    </div>
  )
}
```

#### `message-list.tsx`

```typescript
// features/messaging/components/message-list.tsx
'use client'

import { useEffect, useRef } from 'react'
import { Message } from '@/types'
import { Avatar } from '@/components/ui/avatar'
import { formatDistanceToNow } from 'date-fns'

interface MessageListProps {
  messages: Message[]
  currentUserId?: string
}

export function MessageList({ messages, currentUserId }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.map(message => {
        const isOwnMessage = message.sender_id === currentUserId

        return (
          <div
            key={message.id}
            className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`flex gap-2 max-w-[70%] ${isOwnMessage ? 'flex-row-reverse' : ''}`}>
              <Avatar
                src={message.sender.profile_image_url}
                alt={message.sender.name}
                className="w-8 h-8"
              />
              <div>
                <div
                  className={`rounded-lg p-3 ${
                    isOwnMessage
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  <p>{message.content}</p>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                </p>
              </div>
            </div>
          </div>
        )
      })}
      <div ref={bottomRef} />
    </div>
  )
}
```

#### `message-input.tsx`

```typescript
// features/messaging/components/message-input.tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

interface MessageInputProps {
  onSend: (content: string) => Promise<void>
  isLoading?: boolean
}

export function MessageInput({ onSend, isLoading }: MessageInputProps) {
  const [content, setContent] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!content.trim() || isLoading) return

    await onSend(content.trim())
    setContent('')
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="border-t p-4">
      <div className="flex gap-2">
        <Textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message... (Enter to send, Shift+Enter for new line)"
          className="flex-1 resize-none"
          rows={2}
          maxLength={1000}
        />
        <Button
          type="submit"
          disabled={!content.trim() || isLoading}
        >
          {isLoading ? 'Sending...' : 'Send'}
        </Button>
      </div>
      <p className="text-xs text-gray-500 mt-1">
        {content.length}/1000 characters
      </p>
    </form>
  )
}
```

## Features

### Read Receipts

Mark messages as read when conversation is viewed:

```typescript
// app/api/messages/[conversationId]/mark-read/route.ts
export async function POST(
  request: Request,
  { params }: { params: { conversationId: string } }
) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Mark all messages from other participant as read
  await supabase
    .from('messages')
    .update({ read_at: new Date().toISOString() })
    .eq('conversation_id', params.conversationId)
    .neq('sender_id', user.id)
    .is('read_at', null)

  return NextResponse.json({ success: true })
}
```

### Typing Indicators (Optional)

Use Supabase Presence API:

```typescript
const channel = supabase.channel(`conversation:${conversationId}`, {
  config: { presence: { key: user.id } }
})

// Track typing status
channel
  .on('presence', { event: 'sync' }, () => {
    const state = channel.presenceState()
    const typingUsers = Object.values(state)
      .flat()
      .filter(u => u.typing && u.user_id !== user.id)
    setTypingUsers(typingUsers)
  })
  .subscribe()

// Broadcast typing status
function handleTyping() {
  channel.track({ typing: true, user_id: user.id })

  // Stop typing after 3 seconds of inactivity
  clearTimeout(typingTimeout)
  typingTimeout = setTimeout(() => {
    channel.track({ typing: false, user_id: user.id })
  }, 3000)
}
```

### Infinite Scroll for Message History

```typescript
export function useMessages(conversationId: string) {
  return useInfiniteQuery({
    queryKey: ['messages', conversationId],
    queryFn: async ({ pageParam = 0 }) => {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false })
        .range(pageParam, pageParam + 49)

      if (error) throw error
      return data.reverse() // Reverse to show oldest first
    },
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < 50) return undefined
      return allPages.length * 50
    },
  })
}
```

## Testing

```typescript
// tests/features/messaging/use-messages.test.ts
import { renderHook, waitFor } from '@testing-library/react'
import { useMessages } from '@/features/messaging/hooks/use-messages'
import { createClient } from '@/lib/supabase/client'

jest.mock('@/lib/supabase/client')

describe('useMessages', () => {
  it('should fetch messages and subscribe to real-time updates', async () => {
    const mockMessages = [
      { id: '1', content: 'Hello', sender_id: 'user-1' },
      { id: '2', content: 'Hi there', sender_id: 'user-2' },
    ]

    createClient.mockReturnValue({
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue({ data: mockMessages }),
      }),
      channel: jest.fn().mockReturnValue({
        on: jest.fn().mockReturnThis(),
        subscribe: jest.fn(),
      }),
    })

    const { result } = renderHook(() => useMessages('conv-123'))

    await waitFor(() => {
      expect(result.current.data).toEqual(mockMessages)
    })
  })
})
```

## Performance Considerations

1. **Limit initial load**: Fetch only last 50 messages, use infinite scroll for history
2. **Debounce typing indicators**: Only broadcast every 500ms
3. **Unsubscribe on unmount**: Clean up real-time channels
4. **Optimize re-renders**: Use React.memo for message components
5. **Virtual scrolling**: For conversations with 1000+ messages, use react-window
