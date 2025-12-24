'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateProfile, type ProfileUpdateData } from '../actions/profile-actions';
import { useRouter } from 'next/navigation';

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: async (data: ProfileUpdateData) => {
      const result = await updateProfile(data);
      if (!result.success) {
        throw new Error(result.error || 'Failed to update profile');
      }
      return result.data;
    },
    onSuccess: () => {
      // Invalidate profile queries to refetch updated data
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      // Refresh the page data
      router.refresh();
    },
  });
}
