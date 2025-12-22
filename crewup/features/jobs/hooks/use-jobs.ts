'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

export type JobFilters = {
  trade?: string;
  subTrade?: string;
  jobType?: string;
  status?: string;
  employerId?: string;
};

export function useJobs(filters?: JobFilters) {
  const supabase = createClient();

  return useQuery({
    queryKey: ['jobs', filters],
    queryFn: async () => {
      let query = supabase
        .from('jobs')
        .select('*')
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters?.trade) {
        query = query.eq('trade', filters.trade);
      }

      if (filters?.subTrade) {
        query = query.eq('sub_trade', filters.subTrade);
      }

      if (filters?.jobType) {
        query = query.eq('job_type', filters.jobType);
      }

      if (filters?.status) {
        query = query.eq('status', filters.status);
      } else {
        // Default to active jobs only
        query = query.eq('status', 'active');
      }

      if (filters?.employerId) {
        query = query.eq('employer_id', filters.employerId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    },
    staleTime: 30000, // 30 seconds
  });
}
