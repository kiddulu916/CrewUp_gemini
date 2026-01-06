import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { ModerationQueue } from '@/features/admin/components/moderation-queue';
import { getFullName } from '@/lib/utils';

  

export default async function ModerationPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const params = await searchParams;
  const status = params.status || 'pending';
  const supabase = await createClient(await cookies());

  // Fetch content reports based on status
  let query = supabase
    .from('content_reports')
    .select(
      `
      id,
      reporter_id,
      reported_content_type,
      reported_content_id,
      reported_user_id,
      reason,
      description,
      status,
      reviewed_by,
      reviewed_at,
      action_taken,
      admin_notes,
      created_at,
      reporter:users!reporter_id(first_name, last_name, email),
      reported_user:users!reported_user_id(first_name, last_name, email, id),
      reviewed_by_profile:users!reviewed_by(first_name, last_name)
    `
    )
    .order('created_at', { ascending: false });

  // Filter by status
  if (status && status !== 'all') {
    query = query.eq('status', status);
  }

  const { data: rawReports, error } = await query;

  if (error) {
    console.error('Error fetching content reports:', error);
  }

  // Transform the data to flatten the profiles and compute full names
  const reports = rawReports?.map((report: any) => {
    const reporter = Array.isArray(report.reporter) ? report.reporter[0] : report.reporter;
    const reportedUser = Array.isArray(report.reported_user)
      ? report.reported_user[0]
      : report.reported_user;
    const reviewedByProfile = Array.isArray(report.reviewed_by_profile)
      ? report.reviewed_by_profile[0]
      : report.reviewed_by_profile;

    return {
      ...report,
      reporter: reporter ? { ...reporter, name: getFullName(reporter) } : null,
      reported_user: reportedUser ? { ...reportedUser, name: getFullName(reportedUser) } : null,
      reviewed_by_profile: reviewedByProfile ? { ...reviewedByProfile, name: getFullName(reviewedByProfile) } : null,
    };
  });

  // Get counts for tabs
  const [
    { count: pendingCount },
    { count: actionedCount },
    { count: dismissedCount },
    { count: reviewedCount },
  ] = await Promise.all([
    supabase
      .from('content_reports')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending'),
    supabase
      .from('content_reports')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'actioned'),
    supabase
      .from('content_reports')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'dismissed'),
    supabase
      .from('content_reports')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'reviewed'),
  ]);

  const allCount =
    (pendingCount || 0) +
    (actionedCount || 0) +
    (dismissedCount || 0) +
    (reviewedCount || 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Content Moderation</h1>
        <p className="text-gray-600 mt-2">
          Review and moderate reported content and users
        </p>
      </div>

      <ModerationQueue
        reports={reports || []}
        currentStatus={status}
        counts={{
          all: allCount,
          pending: pendingCount || 0,
          actioned: actionedCount || 0,
          dismissed: dismissedCount || 0,
          reviewed: reviewedCount || 0,
        }}
      />
    </div>
  );
}
