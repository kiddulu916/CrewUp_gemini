'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createApplication } from '../actions/application-actions';
import { useRouter } from 'next/navigation';

type ApplyJobData = {
  jobId: string;
  coverLetter?: string;
};

export function useApplyJob() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: (data: ApplyJobData) => createApplication(data),
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ['applications'] });
        queryClient.invalidateQueries({ queryKey: ['job-applied'] });
        router.refresh();
      }
    },
  });
}
