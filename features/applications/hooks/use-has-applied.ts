'use client';

import { useQuery } from '@tanstack/react-query';
import { hasApplied } from '../actions/application-actions';

export function useHasApplied(jobId: string) {
  return useQuery({
    queryKey: ['job-applied', jobId],
    queryFn: () => hasApplied(jobId),
    staleTime: 30000, // 30 seconds
  });
}
