# Supabase Real-time Setup for Messaging

This document provides instructions for enabling real-time functionality for the messaging feature in CrewUp.

## Overview

The messaging feature uses Supabase's PostgreSQL replication to deliver messages in real-time. This requires enabling replication on the relevant database tables.

## Prerequisites

- Supabase project created and configured
- Database schema deployed (conversations and messages tables exist)
- Supabase dashboard access

## Cost Considerations

**IMPORTANT**: Enabling replication on Supabase incurs an additional cost of **$10.25/month**.

This is in addition to your base Supabase plan cost. Consider the following:

- **Free Tier**: Not recommended for production messaging with replication enabled
- **Pro Tier** ($25/month): With replication enabled, total cost is ~$35.25/month
- **Alternative**: For development/testing, you can use polling instead of real-time (no additional cost)

If budget is a constraint, consider:
1. Starting without replication and using periodic polling for message updates
2. Implementing real-time only for Pro users as a premium feature
3. Using the free tier for development and enabling replication only in production

## Steps to Enable Real-time

### 1. Access the Supabase Dashboard

1. Go to your Supabase project dashboard at https://supabase.com/dashboard
2. Select your CrewUp project
3. Navigate to **Database** → **Replication** in the left sidebar

### 2. Enable Replication for Messages Table

1. In the Replication page, find the **messages** table in the list
2. Toggle the switch to enable replication for the **messages** table
3. Ensure the following events are enabled:
   - ✅ INSERT
   - ✅ UPDATE (optional, for read receipts)
   - ✅ DELETE (optional)

### 3. Enable Replication for Conversations Table

1. Find the **conversations** table in the list
2. Toggle the switch to enable replication for the **conversations** table
3. Ensure the following events are enabled:
   - ✅ INSERT
   - ✅ UPDATE (for last_message_at updates)

### 4. Verify Configuration

After enabling replication, verify the configuration:

1. Check that both tables show as enabled in the Replication page
2. The status should show a green indicator

## How It Works

Once replication is enabled:

1. **Sending Messages**: When a user sends a message, it's inserted into the `messages` table
2. **Real-time Broadcast**: Supabase broadcasts the INSERT event to all subscribed clients
3. **Client Updates**: The `useMessages` hook in the client receives the event and updates the UI
4. **Conversation Updates**: The conversation's `last_message_at` is updated, triggering a refresh of the conversation list

## Client-Side Implementation

The real-time functionality is already implemented in the client code:

- **`use-messages.ts`**: Subscribes to message INSERT events for a specific conversation
- **`use-conversations.ts`**: Fetches and caches all conversations with real-time updates

## Testing Real-time Functionality

To test that real-time is working:

1. Open the application in two different browser windows/tabs
2. Sign in as two different users
3. Start a conversation from one user to the other
4. Send a message from User A
5. Verify that User B receives the message instantly without refreshing

If messages don't appear instantly, check:
- Replication is enabled for both tables
- Browser console for any WebSocket connection errors
- Supabase project is not paused or in sleep mode

## Troubleshooting

### Messages Not Appearing in Real-time

- **Check Replication Status**: Ensure replication is enabled in Supabase dashboard
- **Check Browser Console**: Look for WebSocket errors or subscription failures
- **Verify API Keys**: Ensure the Supabase anon key is correctly configured

### High Latency

- **Database Location**: Ensure your Supabase database is in a region close to your users
- **Connection Issues**: Check network connectivity and firewall settings

### Connection Drops

- **Free Tier Limits**: Free tier projects may have connection limits
- **Project Paused**: Supabase free tier projects pause after inactivity

## Additional Notes

- Real-time subscriptions are automatically cleaned up when components unmount
- Each conversation has its own channel subscription (`conversation:${conversationId}`)
- The client implements optimistic updates for better UX
- Duplicate messages are prevented through client-side deduplication

## Cost-Free Alternative: Polling Implementation

If you want to avoid the $10.25/month replication cost, you can implement polling instead:

### How to Implement Polling

1. **Modify `use-messages.ts`** - Remove the real-time subscription `useEffect` block
2. **Enable refetch interval** in the `useQuery` configuration:

```typescript
export function useMessages(conversationId: string) {
  const query = useQuery({
    queryKey: ['messages', conversationId],
    queryFn: async (): Promise<Message[]> => {
      // ... existing query logic
    },
    enabled: !!conversationId,
    refetchInterval: 3000, // Poll every 3 seconds
    staleTime: 0, // Always consider data stale
  });

  return query;
}
```

3. **Similarly update `use-conversations.ts`** to poll for conversation updates:

```typescript
export function useConversations() {
  return useQuery({
    queryKey: ['conversations'],
    queryFn: async (): Promise<ConversationWithDetails[]> => {
      // ... existing query logic
    },
    refetchInterval: 5000, // Poll every 5 seconds
    staleTime: 0,
  });
}
```

### Trade-offs of Polling

**Advantages:**
- No additional monthly cost
- Simpler implementation (no WebSocket management)
- Works on all networks (some corporate firewalls block WebSockets)

**Disadvantages:**
- Messages arrive every 3-5 seconds instead of instantly
- Increased database queries (higher cost at scale)
- More bandwidth usage
- Battery drain on mobile devices

**Recommendation:** Use polling for development/MVP, then switch to real-time when you have paying users to offset the cost.

## Next Steps

After enabling real-time (or implementing polling):

1. Test the messaging feature end-to-end
2. Monitor real-time connection stability (or polling performance)
3. Consider implementing connection status indicators for better UX
4. Review Supabase usage metrics to ensure you're within plan limits
5. Evaluate cost vs. user experience trade-offs as your user base grows
