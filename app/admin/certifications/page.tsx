import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { CertificationQueue } from '@/features/admin/components/certification-queue';
import { getFullName } from '@/lib/utils';

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
  // ! Note: certifications.worker_id references workers.user_id, not users.id directly
  let query = supabase
    .from('certifications')
    .select(
      `
      id,
      worker_id,
      name,
      issuing_organization,
      credential_id,
      issue_date,
      expiration_date,
      image_url,
      verification_status,
      rejection_reason,
      created_at,
      updated_at,
      worker:workers!worker_id (
        user_id,
        trade,
        users!user_id (
          id,
          first_name,
          last_name,
          email,
          role,
          employer_type
        )
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

  // Transform the data to flatten the nested structure and compute full names
  const certifications = rawCertifications?.map((cert: any) => {
    const worker = Array.isArray(cert.worker) ? cert.worker[0] : cert.worker;
    const user = worker?.users ? (Array.isArray(worker.users) ? worker.users[0] : worker.users) : null;

    return {
      ...cert,
      // * Map old column names to what the component expects
      user_id: worker?.user_id,
      certification_type: cert.name,
      credential_category: 'certification', // Default since column doesn't exist
      issued_by: cert.issuing_organization,
      expires_at: cert.expiration_date,
      profiles: user ? {
        id: user.id,
        name: getFullName(user),
        email: user.email,
        role: user.role,
        employer_type: user.employer_type,
      } : null,
    };
  });

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
