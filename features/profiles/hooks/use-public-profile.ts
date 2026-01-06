'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { PublicProfile } from '../types';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function usePublicProfile(userId: string) {
  return useQuery({
    queryKey: ['publicProfile', userId],
    queryFn: async () => {
      const supabase = createClient();

      const { data, error } = await supabase
        .from('users')
        .select(`
          id, 
          first_name, 
          last_name, 
          role, 
          employer_type,
          location, 
          bio, 
          profile_image_url, 
          subscription_status, 
          created_at,
          workers (
            trade, 
            sub_trade, 
            years_of_experience, 
            has_tools, 
            tools_owned, 
            trade_skills
          ),
          contractors (
            company_name,
            website
          )
        `)
        .eq('id', userId)
        .single();

      if (error) throw error;

      // Transform to PublicProfile
      const profile = data as any;
      const worker = profile.workers?.[0];
      const contractor = profile.contractors?.[0];

      return {
        ...profile,
        name: `${profile.first_name} ${profile.last_name}`.trim(),
        trade: worker?.trade,
        sub_trade: worker?.sub_trade,
        years_of_experience: worker?.years_of_experience,
        has_tools: worker?.has_tools,
        tools_owned: worker?.tools_owned,
        skills: worker?.trade_skills,
        company_name: contractor?.company_name,
      } as PublicProfile;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!userId && UUID_REGEX.test(userId),
  });
}
