'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getBoostStatus, activateProfileBoost, deactivateProfileBoost } from '../actions/boost-actions';

export function useBoostStatus() {
  return useQuery({
    queryKey: ['boost-status'],
    queryFn: async () => {
      const result = await getBoostStatus();
      if (!result.success) {
        throw new Error(result.error);
      }
      return {
        isPro: result.isPro,
        isActive: result.isActive,
        expiresAt: result.expiresAt,
      };
    },
    refetchInterval: 60000, // Refetch every minute to check expiry
  });
}

export function useActivateBoost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: activateProfileBoost,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boost-status'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });
}

export function useDeactivateBoost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deactivateProfileBoost,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boost-status'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });
}
