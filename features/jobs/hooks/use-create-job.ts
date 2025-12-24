'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createJob, type JobData } from '../actions/job-actions';

export function useCreateJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: JobData) => {
      const result = await createJob(data);
      if (!result.success) {
        throw new Error(result.error || 'Failed to create job');
      }
      return result;
    },
    onSuccess: () => {
      // Invalidate jobs queries to refetch updated data
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
    },
  });
}
