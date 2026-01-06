'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

/**
 * Prefetch utility hooks for React Query
 * 
 * * Improves perceived performance by loading data before it's needed
 */

/**
 * Prefetch job details on hover
 * 
 * @example
 * ```tsx
 * const prefetchJob = usePrefetchJob();
 * 
 * <div onMouseEnter={() => prefetchJob(job.id)}>
 *   Job Card
 * </div>
 * ```
 */
export function usePrefetchJob() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  return useCallback(
    async (jobId: string) => {
      await queryClient.prefetchQuery({
        queryKey: ['job', jobId],
        queryFn: async () => {
          const { data, error } = await supabase
            .from('jobs')
            .select(`
              *,
              employer:users!employer_id(
                id,
                first_name,
                last_name,
                company_name,
                profile_image_url
              )
            `)
            .eq('id', jobId)
            .single();

          if (error) throw error;
          return data;
        },
        staleTime: 5 * 60 * 1000, // 5 minutes
      });
    },
    [queryClient, supabase]
  );
}

/**
 * Prefetch user profile on hover
 */
export function usePrefetchProfile() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  return useCallback(
    async (userId: string) => {
      await queryClient.prefetchQuery({
        queryKey: ['profile', userId],
        queryFn: async () => {
          const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', userId)
            .single();

          if (error) throw error;
          return data;
        },
        staleTime: 5 * 60 * 1000, // 5 minutes
      });
    },
    [queryClient, supabase]
  );
}

/**
 * Prefetch conversation messages on hover
 */
export function usePrefetchMessages() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  return useCallback(
    async (conversationId: string) => {
      await queryClient.prefetchQuery({
        queryKey: ['messages', conversationId],
        queryFn: async () => {
          const { data, error } = await supabase
            .from('messages')
            .select('*')
            .eq('conversation_id', conversationId)
            .order('created_at', { ascending: true })
            .limit(50);

          if (error) throw error;
          return data;
        },
        staleTime: 30 * 1000, // 30 seconds
      });
    },
    [queryClient, supabase]
  );
}

/**
 * Prefetch related data when a page loads
 * 
 * @example
 * ```tsx
 * // In dashboard layout
 * usePrefetchOnMount(['jobs', 'conversations']);
 * ```
 */
export function usePrefetchOnMount(queries: ('jobs' | 'conversations' | 'notifications')[]) {
  const queryClient = useQueryClient();
  const supabase = createClient();

  useEffect(() => {
    queries.forEach(async (query) => {
      switch (query) {
        case 'jobs':
          await queryClient.prefetchQuery({
            queryKey: ['jobs', 'recent'],
            queryFn: async () => {
              const { data } = await supabase
                .from('jobs')
                .select('id, title, location, pay_rate')
                .eq('status', 'active')
                .order('created_at', { ascending: false })
                .limit(10);
              return data;
            },
            staleTime: 5 * 60 * 1000,
          });
          break;

        case 'conversations':
          await queryClient.prefetchQuery({
            queryKey: ['conversations'],
            queryFn: async () => {
              const {
                data: { user },
              } = await supabase.auth.getUser();
              if (!user) return [];

              const { data } = await supabase
                .from('conversations')
                .select('id, last_message_at')
                .or(`participant_1_id.eq.${user.id},participant_2_id.eq.${user.id}`)
                .order('last_message_at', { ascending: false })
                .limit(5);
              return data;
            },
            staleTime: 60 * 1000,
          });
          break;

        case 'notifications':
          await queryClient.prefetchQuery({
            queryKey: ['notifications', 'unread-count'],
            queryFn: async () => {
              const {
                data: { user },
              } = await supabase.auth.getUser();
              if (!user) return 0;

              const { count } = await supabase
                .from('notifications')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', user.id)
                .is('read_at', null);
              return count || 0;
            },
            staleTime: 60 * 1000,
          });
          break;
      }
    });
  }, [queries, queryClient, supabase]);
}

