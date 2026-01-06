'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { Reference } from '../types';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function useReferences(userId: string) {
  return useQuery({
    queryKey: ['references', userId],
    queryFn: async () => {
      const supabase = createClient();

      const { data, error } = await supabase
        .from('professional_references')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        // If table doesn't exist, return empty array instead of throwing
        if (error.code === '42P01' || error.message.includes('does not exist')) {
          return [] as Reference[];
        }
        throw error;
      }
      return data as Reference[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!userId && UUID_REGEX.test(userId),
  });
}
