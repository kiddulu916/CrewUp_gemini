import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, Badge } from '@/components/ui';
import { MessageButton } from '@/features/messaging/components/message-button';
import Link from 'next/link';
import { cookies } from 'next/headers';

      

export default async function ApplicationsPage() {
  const supabase = await createClient(await cookies());

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (!profile) {
    redirect('/onboarding');
  }

  const isWorker = profile.role === 'worker';

  // Fetch applications based on role
  let applications = [];

  if (isWorker) {
    // Worker: Fetch their submitted applications
    const { data: apps } = await supabase
      .from('job_applications')
      .select(`
        *,
        job:jobs!inner(
          id,
          title,
          trade,
          sub_trade,
          location,
          pay_rate,
          subtrade_pay_rates,
          job_type,
          status,
          employer:profiles!employer_id(
            id,
            name,
            employer_type
          )
        )
      `)
      .eq('applicant_id', user.id)
      .order('created_at', { ascending: false });

    applications = apps || [];
  } else {
    // Employer: Fetch applications to their jobs
    const { data: apps } = await supabase
      .from('job_applications')
      .select(`
        *,
        applicant:profiles!applicant_id(
          id,
          name,
          trade,
          sub_trade,
          location
        ),
        job:jobs!inner(
          id,
          title,
          trade,
          sub_trade
        )
      `)
      .eq('jobs.employer_id', user.id)
      .order('created_at', { ascending: false });

    applications = apps || [];
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-krewup-blue to-krewup-orange bg-clip-text text-transparent">
            {isWorker ? 'My Applications' : 'Applications Received'}
          </h1>
          <p className="text-gray-600 mt-2">
            {isWorker
              ? 'Track the status of your job applications'
              : 'Manage applications from workers'}
          </p>
        </div>
      </div>

      {applications.length === 0 ? (
        <Card className="shadow-xl">
          <CardContent className="p-12 text-center">
            <div className="flex justify-center mb-4">
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-gray-100 to-gray-200">
                <span className="text-5xl">📋</span>
              </div>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              {isWorker ? 'No Applications Yet' : 'No Applications Received'}
            </h3>
            <p className="text-gray-600 mb-6">
              {isWorker
                ? 'Start applying to jobs to see your applications here'
                : 'Applications to your job postings will appear here'}
            </p>
            {isWorker && (
              <Link
                href="/dashboard/jobs"
                className="inline-flex items-center px-6 py-3 rounded-lg bg-gradient-to-r from-krewup-blue to-krewup-light-blue text-white font-semibold hover:shadow-lg transition-all"
              >
                Browse Jobs
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {applications.map((app: any) => (
            <Card
              key={app.id}
              className="shadow hover:shadow-lg transition-all duration-200 border border-gray-200 hover:border-krewup-blue"
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 space-y-2">
                    {/* Job/Worker Header */}
                    {isWorker ? (
                      <div>
                        <Link href={`/dashboard/jobs/${app.job.id}`} className="group">
                          <h3 className="text-lg font-bold text-gray-900 group-hover:text-krewup-blue transition-colors">
                            {app.job.title}
                          </h3>
                        </Link>
                        <p className="text-sm text-gray-600 mt-0.5">
                          👤 {app.job.employer.name} • {app.job.employer.employer_type}
                        </p>
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-krewup-blue to-krewup-orange text-white font-bold text-sm">
                            {app.applicant.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <h3 className="text-lg font-bold text-gray-900">
                              {app.applicant.name}
                            </h3>
                            <p className="text-xs text-gray-600">
                              {app.applicant.trade}
                              {app.applicant.sub_trade && ` - ${app.applicant.sub_trade}`}
                            </p>
                          </div>
                        </div>
                        <Link
                          href={`/dashboard/jobs/${app.job.id}`}
                          className="text-xs text-krewup-blue hover:underline inline-block mt-1"
                        >
                          Applied to: {app.job.title}
                        </Link>
                      </div>
                    )}

                    {/* Compact Details Line */}
                    <div className="flex items-center gap-3 text-sm text-gray-600 flex-wrap">
                      {isWorker ? (
                        <>
                          <span>📍 {app.job.location}</span>
                          <span className="text-gray-400">•</span>
                          <span>🔨 {app.job.trade}{app.job.sub_trade && ` - ${app.job.sub_trade}`}</span>
                          <span className="text-gray-400">•</span>
                          <span>📋 {app.job.job_type}</span>
                        </>
                      ) : (
                        <>
                          <span>📍 {app.applicant.location}</span>
                          <span className="text-gray-400">•</span>
                          <span>🔨 {app.job.trade}{app.job.sub_trade && ` - ${app.job.sub_trade}`}</span>
                        </>
                      )}
                    </div>

                    {/* Cover Letter - Truncated */}
                    {app.cover_letter && (
                      <div className="bg-blue-50 rounded p-2 border-l-2 border-krewup-blue">
                        <p className="text-xs text-gray-700 line-clamp-2">
                          {app.cover_letter}
                        </p>
                      </div>
                    )}

                    {/* Applied Date */}
                    <p className="text-xs text-gray-500">
                      📅 {new Date(app.created_at).toLocaleDateString()}
                    </p>
                  </div>

                  {/* Status Badge & Actions */}
                  <div className="flex flex-col items-end gap-2">
                    <Badge
                      variant={
                        app.status === 'pending'
                          ? 'warning'
                          : app.status === 'hired'
                          ? 'success'
                          : app.status === 'rejected'
                          ? 'danger'
                          : app.status === 'viewed'
                          ? 'info'
                          : 'default'
                      }
                      className="text-xs px-2 py-0.5 capitalize"
                    >
                      {app.status}
                    </Badge>

                    {!isWorker && (
                      <MessageButton
                        recipientId={app.applicant.id}
                        recipientName={app.applicant.name}
                        variant="outline"
                        className="text-xs px-2 py-1"
                      />
                    )}

                    <Link
                      href={`/dashboard/applications/${app.id}`}
                      className="text-xs text-krewup-blue hover:underline font-medium"
                    >
                      View Details →
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
