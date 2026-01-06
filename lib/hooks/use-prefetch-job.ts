'use client';

import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

/**
 * Hook to prefetch job data on hover for faster navigation
 * 
 * Usage:
 * const prefetchJob = usePrefetchJob();
 * 
 * <Link href={`/dashboard/jobs/${job.id}`} onMouseEnter={() => prefetchJob(job.id)}>
 *   View Job
 * </Link>
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
              employer:users!jobs_employer_id_fkey (
                id,
                first_name,
                last_name,
                profile_image_url,
                company_name:contractors(company_name)
              )
            `)
            .eq('id', jobId)
            .single();

          if (error) throw error;
          return data;
        },
        staleTime: 1000 * 60 * 5, // 5 minutes
      });
    },
    [queryClient, supabase]
  );
}

/**
 * Hook to prefetch conversation data on hover
 */
export function usePrefetchConversation() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  return useCallback(
    async (conversationId: string) => {
      await queryClient.prefetchQuery({
        queryKey: ['messages', conversationId],
        queryFn: async () => {
          const { data, error } = await supabase
            .from('messages')
            .select(`
              *,
              sender:users!sender_id (
                id,
                first_name,
                last_name,
                profile_image_url
              )
            `)
            .eq('conversation_id', conversationId)
            .order('created_at', { ascending: true })
            .limit(50);

          if (error) throw error;
          return data;
        },
        staleTime: 0, // Always fresh for messages
      });
    },
    [queryClient, supabase]
  );
}

/**
 * Hook to prefetch profile data on hover
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
            .select(`
              id,
              first_name,
              last_name,
              profile_image_url,
              role,
              location,
              bio,
              trade,
              sub_trade,
              subscription_status
            `)
            .eq('id', userId)
            .single();

          if (error) throw error;
          return data;
        },
        staleTime: 1000 * 60 * 5, // 5 minutes
      });
    },
    [queryClient, supabase]
  );
}

