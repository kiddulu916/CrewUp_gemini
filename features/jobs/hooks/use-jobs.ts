'use client';

import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

export type JobFilters = {
  trade?: string;
  subTrade?: string;
  jobType?: string;
  status?: string;
  employerId?: string;
  minPay?: number;
};

// * Page size for pagination
const PAGE_SIZE = 20;

/**
 * Hook for fetching jobs with optional filtering
 * 
 * * Optimizations:
 * - Uses JOIN to fetch employer info in single query
 * - Limited to first 50 results (use useInfiniteJobs for pagination)
 * - 30 second stale time for caching
 */
export function useJobs(filters?: JobFilters) {
  const supabase = createClient();

  return useQuery({
    queryKey: ['jobs', filters],
    queryFn: async () => {
      let query = supabase
        .from('jobs')
        .select(`
          *,
          users!jobs_employer_id_fkey (
            first_name,
            last_name
          )
        `)
        .order('created_at', { ascending: false })
        .limit(50); // * Limit to 50 jobs for performance

      // Apply filters
      if (filters?.trade) {
        query = query.contains('trades', [filters.trade]);
      }

      if (filters?.subTrade) {
        query = query.contains('sub_trades', [filters.subTrade]);
      }

      if (filters?.jobType) {
        query = query.eq('job_type', filters.jobType);
      }

      if (filters?.minPay) {
        query = query.gte('pay_min', filters.minPay);
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

      // Transform the data to include employer_name at the top level
      const jobsWithEmployerName = (data || []).map((job: any) => {
        const user = job.users;
        const employer_name = user 
          ? `${user.first_name} ${user.last_name}`.trim() 
          : 'Unknown Employer';

        // Remove the nested users object and add employer_name to the job
        const { users, ...jobData } = job;
        return {
          ...jobData,
          employer_name,
        };
      });

      return jobsWithEmployerName;
    },
    staleTime: 30000, // 30 seconds
  });
}

/**
 * Hook for fetching jobs with infinite scroll pagination
 * 
 * * Features:
 * - Cursor-based pagination for better performance
 * - Loads PAGE_SIZE jobs at a time
 * - Supports all filters from useJobs
 */
export function useInfiniteJobs(filters?: JobFilters) {
  const supabase = createClient();

  return useInfiniteQuery({
    queryKey: ['jobs', 'infinite', filters],
    queryFn: async ({ pageParam = 0 }) => {
      const from = pageParam * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let query = supabase
        .from('jobs')
        .select(`
          *,
          users!jobs_employer_id_fkey (
            first_name,
            last_name
          )
        `, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to);

      // Apply filters
      if (filters?.trade) {
        query = query.contains('trades', [filters.trade]);
      }

      if (filters?.subTrade) {
        query = query.contains('sub_trades', [filters.subTrade]);
      }

      if (filters?.jobType) {
        query = query.eq('job_type', filters.jobType);
      }

      if (filters?.minPay) {
        query = query.gte('pay_min', filters.minPay);
      }

      if (filters?.status) {
        query = query.eq('status', filters.status);
      } else {
        query = query.eq('status', 'active');
      }

      if (filters?.employerId) {
        query = query.eq('employer_id', filters.employerId);
      }

      const { data, error, count } = await query;

      if (error) throw error;

      // Transform the data
      const jobsWithEmployerName = (data || []).map((job: any) => {
        const user = job.users;
        const employer_name = user 
          ? `${user.first_name} ${user.last_name}`.trim() 
          : 'Unknown Employer';

        const { users, ...jobData } = job;
        return {
          ...jobData,
          employer_name,
        };
      });

      return {
        jobs: jobsWithEmployerName,
        nextPage: (pageParam + 1) * PAGE_SIZE < (count || 0) ? pageParam + 1 : undefined,
        totalCount: count || 0,
      };
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextPage,
    staleTime: 30000,
  });
}
