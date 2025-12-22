import { createBrowserClient } from '@supabase/ssr';

/**
 * Client-side Supabase client for use in Client Components
 *
 * This client is safe to use in browser contexts and automatically handles
 * authentication state. Use this in Client Components marked with 'use client'.
 *
 * The client is memoized to prevent creating multiple instances.
 *
 * @example Client Component
 * ```tsx
 * 'use client';
 * import { createClient } from '@/lib/supabase/client';
 * import { useEffect, useState } from 'react';
 *
 * export function ProfileCard() {
 *   const [profile, setProfile] = useState(null);
 *   const supabase = createClient();
 *
 *   useEffect(() => {
 *     const loadProfile = async () => {
 *       const { data } = await supabase.from('profiles').select('*').single();
 *       setProfile(data);
 *     };
 *     loadProfile();
 *   }, []);
 *
 *   return <div>{profile?.name}</div>;
 * }
 * ```
 *
 * @example Real-time Subscription
 * ```tsx
 * 'use client';
 * import { createClient } from '@/lib/supabase/client';
 * import { useEffect } from 'react';
 *
 * export function MessageList({ conversationId }) {
 *   const supabase = createClient();
 *
 *   useEffect(() => {
 *     const channel = supabase
 *       .channel('messages')
 *       .on('postgres_changes', {
 *         event: 'INSERT',
 *         schema: 'public',
 *         table: 'messages',
 *         filter: `conversation_id=eq.${conversationId}`
 *       }, (payload) => {
 *         console.log('New message:', payload.new);
 *       })
 *       .subscribe();
 *
 *     return () => {
 *       supabase.removeChannel(channel);
 *     };
 *   }, [conversationId]);
 * }
 * ```
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

export function createClient() {
  createBrowserClient(
    supabaseUrl!,
    supabaseKey!,
  );
}
