'use client';

import { createClient } from '@/lib/supabase/client';
import { useQuery } from '@tanstack/react-query';

export type AuthUser = {
  id: string;
  email: string;
  user_metadata: any;
};

export type Profile = {
  id: string;
  name: string;
  email: string;
  role: 'worker' | 'employer';
  employer_type?: 'contractor' | 'recruiter';
  subscription_status: 'free' | 'pro';
  trade: string;
  sub_trade?: string;
  location: string;
  bio?: string;
  phone?: string;
  profile_image_url?: string;
  is_profile_boosted: boolean;
  created_at: string;
  updated_at: string;
};

export type AuthData = {
  user: AuthUser;
  profile: Profile;
} | null;

/**
 * Hook to get current authenticated user and their profile
 *
 * @example
 * ```tsx
 * function ProfilePage() {
 *   const { data, isLoading } = useAuth();
 *
 *   if (isLoading) return <div>Loading...</div>;
 *   if (!data) return <div>Not logged in</div>;
 *
 *   return <div>Welcome, {data.profile.name}!</div>;
 * }
 * ```
 */
export function useAuth() {
  const supabase = createClient();

  return useQuery<AuthData>({
    queryKey: ['auth'],
    queryFn: async () => {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error) throw error;
      if (!user) return null;

      // Fetch full profile
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select(`
          *,
          workers (
            trade, 
            sub_trade, 
            is_profile_boosted
          )
        `)
        .eq('id', user.id)
        .single();

      if (userError) throw userError;

      const userFull = userData as any;
      const worker = userFull.workers?.[0];

      const profile: Profile = {
        ...userFull,
        name: `${userFull.first_name} ${userFull.last_name}`.trim(),
        trade: worker?.trade || 'General Laborer',
        sub_trade: worker?.sub_trade,
        is_profile_boosted: worker?.is_profile_boosted || false,
      };

      return {
        user: user as AuthUser,
        profile,
      };
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: false,
  });
}

/**
 * Hook to check if current user is an employer
 */
export function useIsEmployer() {
  const { data } = useAuth();
  return data?.profile?.role === 'employer';
}

/**
 * Hook to check if current user is a worker
 */
export function useIsWorker() {
  const { data } = useAuth();
  return data?.profile?.role === 'worker';
}

/**
 * Hook to check if current user has Pro subscription
 */
export function useHasProSubscription() {
  const { data } = useAuth();
  return data?.profile?.subscription_status === 'pro';
}
