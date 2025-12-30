import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { CertificationQueue } from '@/features/admin/components/certification-queue';

// Force dynamic rendering - always fetch fresh data
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function CertificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const params = await searchParams;
  const status = params.status || 'pending';
  const supabase = await createClient(await cookies());

  // Fetch certifications based on status
  let query = supabase
    .from('certifications')
    .select(
      `
      id,
      user_id,
      credential_category,
      certification_type,
      certification_number,
      issued_by,
      issuing_state,
      issue_date,
      expires_at,
      image_url,
      verification_status,
      verified_at,
      verified_by,
      rejection_reason,
      verification_notes,
      created_at,
      profiles:user_id (
        id,
        name,
        email,
        role,
        employer_type
      )
    `
    )
    .order('created_at', { ascending: false });

  // Filter by status
  if (status === 'pending') {
    query = query.eq('verification_status', 'pending');
  } else if (status === 'verified') {
    query = query.eq('verification_status', 'verified');
  } else if (status === 'rejected') {
    query = query.eq('verification_status', 'rejected');
  } else if (status === 'flagged') {
    query = query.not('verification_notes', 'is', null);
  }

  const { data: rawCertifications, error } = await query;

  if (error) {
    console.error('[admin/certifications] Error fetching certifications:', error);
  }

  // Debug logging
  console.log('[admin/certifications] Query results:', {
    status,
    count: rawCertifications?.length || 0,
    certifications: rawCertifications?.map((c: any) => ({
      id: c.id,
      type: c.certification_type,
      category: c.credential_category,
      verification_status: c.verification_status,
      user: (Array.isArray(c.profiles) ? c.profiles[0]?.name : c.profiles?.name) || 'Unknown'
    }))
  });

  // Transform the data to flatten the profiles array into a single object
  const certifications = rawCertifications?.map((cert: any) => ({
    ...cert,
    profiles: Array.isArray(cert.profiles) ? cert.profiles[0] : cert.profiles,
  }));

  // Get counts for tabs
  const [
    { count: pendingCount },
    { count: verifiedCount },
    { count: rejectedCount },
    { count: flaggedCount },
  ] = await Promise.all([
    supabase
      .from('certifications')
      .select('*', { count: 'exact', head: true })
      .eq('verification_status', 'pending'),
    supabase
      .from('certifications')
      .select('*', { count: 'exact', head: true })
      .eq('verification_status', 'verified'),
    supabase
      .from('certifications')
      .select('*', { count: 'exact', head: true })
      .eq('verification_status', 'rejected'),
    supabase
      .from('certifications')
      .select('*', { count: 'exact', head: true })
      .not('verification_notes', 'is', null),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          Certification Verification
        </h1>
        <p className="text-gray-600 mt-2">
          Review and verify worker certifications and licenses
        </p>
      </div>

      <CertificationQueue
        certifications={certifications || []}
        currentStatus={status}
        counts={{
          pending: pendingCount || 0,
          verified: verifiedCount || 0,
          rejected: rejectedCount || 0,
          flagged: flaggedCount || 0,
        }}
      />
    </div>
  );
}
