// features/applications/actions/certification-filter-actions.ts
'use server';

import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export type CertificationFilterOptions = {
  certificationNames?: string[];
  verifiedOnly?: boolean;
};

/**
 * Get job applications filtered by certifications (Pro employer feature)
 */
export async function getFilteredApplications(
  jobId: string,
  filters: CertificationFilterOptions
) {
  try {
    const supabase = await createClient(await cookies());

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Not authenticated', data: null };
    }

    // Check if user is Pro employer
    const { data: profile } = await supabase
      .from('users')
      .select('subscription_status, role')
      .eq('id', user.id)
      .single();

    if (profile?.subscription_status !== 'pro') {
      return { success: false, error: 'Pro subscription required', data: null };
    }

    if (profile?.role !== 'employer') {
      return { success: false, error: 'Only employers can filter applications', data: null };
    }

    // Verify user owns the job
    const { data: job } = await supabase
      .from('jobs')
      .select('employer_id')
      .eq('id', jobId)
      .single();

    if (!job || job.employer_id !== user.id) {
      return { success: false, error: 'Unauthorized', data: null };
    }

    // Get all applications with worker profiles
    const { data: applications, error } = await supabase
      .from('job_applications')
      .select(
        `
        *,
        worker:users!applicant_id(
          id,
          name,
          trade,
          sub_trade,
          location,
          bio,
          is_profile_boosted,
          boost_expires_at
        )
      `
      )
      .eq('job_id', jobId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching applications:', error);
      return { success: false, error: 'Failed to fetch applications', data: null };
    }

    if (!applications || applications.length === 0) {
      return { success: true, data: [] };
    }

    // If no certification filter, return all applications (sorted by boost)
    if (!filters.certificationNames || filters.certificationNames.length === 0) {
      const sorted = sortByBoost(applications);
      return { success: true, data: sorted };
    }

    // Get certifications for all applicants
    const workerIds = applications.map((app) => app.applicant_id);
    const { data: certifications } = await supabase
      .from('certifications')
      .select('user_id, name, credential_url')
      .in('user_id', workerIds);

    // Filter applications by certification requirements
    const filtered = applications.filter((app) => {
      const workerCerts = certifications?.filter((cert) => cert.user_id === app.applicant_id) || [];

      // Check if worker has ALL required certifications
      return filters.certificationNames!.every((requiredCert) =>
        workerCerts.some((workerCert) => {
          const hasMatch = workerCert.name.toLowerCase().includes(requiredCert.toLowerCase());

          // If verified only, check for credential URL
          if (filters.verifiedOnly) {
            return hasMatch && workerCert.credential_url;
          }

          return hasMatch;
        })
      );
    });

    // Sort filtered results by boost status
    const sorted = sortByBoost(filtered);

    return { success: true, data: sorted };
  } catch (error) {
    console.error('Error in getFilteredApplications:', error);
    return { success: false, error: 'An unexpected error occurred', data: null };
  }
}

/**
 * Helper function to sort applications by boost status
 */
function sortByBoost(applications: any[]) {
  return applications.sort((a, b) => {
    // Check if boosts are active (not expired)
    const aIsBoosted =
      a.worker?.is_profile_boosted &&
      a.worker?.boost_expires_at &&
      new Date(a.worker.boost_expires_at) > new Date();
    const bIsBoosted =
      b.worker?.is_profile_boosted &&
      b.worker?.boost_expires_at &&
      new Date(b.worker.boost_expires_at) > new Date();

    // Boosted profiles come first
    if (aIsBoosted && !bIsBoosted) return -1;
    if (!aIsBoosted && bIsBoosted) return 1;

    // If both have same boost status, sort by created_at (newest first)
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}
