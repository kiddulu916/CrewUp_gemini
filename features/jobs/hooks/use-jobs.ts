'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';

export type JobFilters = {
  trade?: string;
  subTrade?: string;
  jobType?: string;
  status?: string;
  employerId?: string;
  minPay?: number;
};

export function useJobs(filters?: JobFilters) {
  const supabase = createClient();

  return useQuery({
    queryKey: ['jobs', filters],
    queryFn: async () => {
      let query = supabase
        .from('jobs')
        .select(`
          *,
          profiles!jobs_employer_id_fkey (
            company_name,
            name
          )
        `)
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
        const profile = job.profiles;
        const employer_name = profile?.company_name || profile?.name || 'Unknown Employer';

        // Remove the nested profiles object and add employer_name to the job
        const { profiles, ...jobData } = job;
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
