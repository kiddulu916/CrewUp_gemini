import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { InitialLocationCapture } from '@/features/dashboard/components/initial-location-capture';
import { cookies } from 'next/headers';

      

export const metadata = {
  title: 'Feed - KrewUp',
  description: 'Your personalized job feed',
};

export default async function FeedPage() {
  const supabase = await createClient(await cookies());

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from('users')
    .select('*, is_admin')
    .eq('id', user.id)
    .single();

  // Fetch quick stats
  const isWorker = profile?.role === 'worker';

  // Count applications (workers) or applications to employer's jobs
  let applicationsCount = 0;
  if (isWorker) {
    const { count } = await supabase
      .from('job_applications')
      .select('*', { count: 'exact', head: true })
      .eq('applicant_id', user.id);
    applicationsCount = count || 0;
  } else {
    // Count applications to all jobs posted by this employer
    const { data: employerJobs } = await supabase
      .from('jobs')
      .select('id')
      .eq('employer_id', user.id);

    if (employerJobs && employerJobs.length > 0) {
      const jobIds = employerJobs.map(job => job.id);
      const { count } = await supabase
        .from('job_applications')
        .select('*', { count: 'exact', head: true })
        .in('job_id', jobIds);
      applicationsCount = count || 0;
    }
  }

  // Count conversations
  const { count: conversationsCount } = await supabase
    .from('conversations')
    .select('*', { count: 'exact', head: true })
    .or(`participant_1_id.eq.${user.id},participant_2_id.eq.${user.id}`);

  // Count profile views
  const { count: profileViewsCount } = await supabase
    .from('profile_views')
    .select('*', { count: 'exact', head: true })
    .eq('viewed_profile_id', user.id);

  return (
    <div className="space-y-6">
      {/* Capture initial location on first visit */}
      <InitialLocationCapture />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome back, {profile?.name}! 👋
          </h1>
          <p className="mt-2 text-gray-600">
            Here's what's happening in your network
          </p>
        </div>

        {/* Admin Panel Button - Only visible to admins */}
        {profile?.is_admin && (
          <a
            href="/admin/dashboard"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors whitespace-nowrap"
          >
            Admin Panel →
          </a>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {profile?.role === 'worker' ? (
              <div className="rounded-lg border-2 border-dashed border-gray-300 p-6 text-center">
                <p className="text-gray-600">
                  Start browsing jobs to find your next opportunity
                </p>
                <a
                  href="/dashboard/jobs"
                  className="mt-2 inline-block text-krewup-blue hover:underline"
                >
                  Browse Jobs →
                </a>
              </div>
            ) : (
              <div className="rounded-lg border-2 border-dashed border-gray-300 p-6 text-center">
                <p className="text-gray-600">
                  Post your first job to start finding great workers
                </p>
                <a
                  href="/dashboard/jobs/new"
                  className="mt-2 inline-block text-krewup-blue hover:underline"
                >
                  Post a Job →
                </a>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Quick Stats</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-lg bg-gray-50 p-4 text-center">
              <p className="text-2xl font-bold text-krewup-blue">{applicationsCount}</p>
              <p className="text-sm text-gray-600">
                {profile?.role === 'worker' ? 'Applications' : 'Applications'}
              </p>
            </div>
            <div className="rounded-lg bg-gray-50 p-4 text-center">
              <p className="text-2xl font-bold text-krewup-blue">{conversationsCount || 0}</p>
              <p className="text-sm text-gray-600">Messages</p>
            </div>
            <div className="rounded-lg bg-gray-50 p-4 text-center">
              <p className="text-2xl font-bold text-krewup-blue">{profileViewsCount || 0}</p>
              <p className="text-sm text-gray-600">Profile Views</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
