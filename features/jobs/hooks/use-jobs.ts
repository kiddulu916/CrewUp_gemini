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
          users!jobs_employer_id_fkey (
            first_name,
            last_name
          )
        `)
        .order('created_at', { ascending: false });

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
