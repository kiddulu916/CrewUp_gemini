'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { getFullName } from '@/lib/utils';

export function useJob(jobId: string | undefined) {
  const supabase = createClient();

  return useQuery({
    queryKey: ['job', jobId],
    queryFn: async () => {
      if (!jobId) throw new Error('Job ID is required');

      const { data, error } = await supabase
        .from('jobs')
        .select(`
          *,
          users!jobs_employer_id_fkey (
            first_name,
            last_name,
            company_name
          )
        `)
        .eq('id', jobId)
        .single();

      if (error) throw error;

      // * Transform the data to include employer_name at the top level
      if (data) {
        const employer = (data as any).users;
        const employer_name = employer?.company_name || getFullName(employer) || 'Unknown Employer';

        // * Remove the nested users object and add employer_name to the job
        const { users, ...jobData } = data as any;
        return {
          ...jobData,
          employer_name,
        };
      }

      return data;
    },
    enabled: !!jobId,
    staleTime: 60000, // 1 minute
  });
}
