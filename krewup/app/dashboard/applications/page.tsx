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
      .from('applications')
      .select(`
        *,
        job:jobs!inner(
          id,
          title,
          trade,
          sub_trade,
          location,
          pay_rate,
          job_type,
          status,
          employer:profiles!employer_id(
            id,
            name,
            employer_type
          )
        )
      `)
      .eq('worker_id', user.id)
      .order('created_at', { ascending: false });

    applications = apps || [];
  } else {
    // Employer: Fetch applications to their jobs
    const { data: apps } = await supabase
      .from('applications')
      .select(`
        *,
        worker:profiles!worker_id(
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
          <h1 className="text-4xl font-bold bg-gradient-to-r from-crewup-blue to-crewup-orange bg-clip-text text-transparent">
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
                className="inline-flex items-center px-6 py-3 rounded-lg bg-gradient-to-r from-crewup-blue to-crewup-light-blue text-white font-semibold hover:shadow-lg transition-all"
              >
                Browse Jobs
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {applications.map((app: any) => (
            <Card
              key={app.id}
              className="shadow-lg hover:shadow-2xl transition-all duration-300 border-2 border-gray-200 hover:border-crewup-blue"
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-4">
                    {/* Job/Worker Header */}
                    {isWorker ? (
                      <div>
                        <Link
                          href={`/dashboard/jobs/${app.job.id}`}
                          className="group"
                        >
                          <h3 className="text-2xl font-bold text-gray-900 group-hover:text-crewup-blue transition-colors">
                            {app.job.title}
                          </h3>
                        </Link>
                        <div className="flex items-center gap-2 mt-2">
                          <p className="text-gray-600">
                            {app.job.employer.name} • {app.job.employer.employer_type}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-crewup-blue to-crewup-orange text-white font-bold text-lg shadow-lg">
                            {app.worker.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <h3 className="text-xl font-bold text-gray-900">
                              {app.worker.name}
                            </h3>
                            <p className="text-sm text-gray-600">
                              {app.worker.trade}
                              {app.worker.sub_trade && ` - ${app.worker.sub_trade}`}
                            </p>
                          </div>
                        </div>
                        <Link
                          href={`/dashboard/jobs/${app.job.id}`}
                          className="text-sm text-crewup-blue hover:underline"
                        >
                          Applied to: {app.job.title}
                        </Link>
                      </div>
                    )}

                    {/* Details Grid */}
                    <div className="grid md:grid-cols-2 gap-4">
                      {isWorker ? (
                        <>
                          <div>
                            <p className="text-sm text-gray-500">Location</p>
                            <p className="text-gray-900 font-medium">{app.job.location}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Pay Rate</p>
                            <p className="text-crewup-orange font-bold">{app.job.pay_rate}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Trade</p>
                            <p className="text-gray-900">
                              {app.job.trade}
                              {app.job.sub_trade && ` - ${app.job.sub_trade}`}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Job Type</p>
                            <p className="text-gray-900">{app.job.job_type}</p>
                          </div>
                        </>
                      ) : (
                        <>
                          <div>
                            <p className="text-sm text-gray-500">Worker Location</p>
                            <p className="text-gray-900 font-medium">{app.worker.location}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Position</p>
                            <p className="text-gray-900">
                              {app.job.trade}
                              {app.job.sub_trade && ` - ${app.job.sub_trade}`}
                            </p>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Cover Letter */}
                    {app.cover_letter && (
                      <div className="bg-gradient-to-br from-blue-50 to-orange-50 rounded-lg p-4 border-l-4 border-crewup-blue">
                        <p className="text-sm font-semibold text-gray-700 mb-2">
                          Cover Letter:
                        </p>
                        <p className="text-sm text-gray-700 leading-relaxed">
                          {app.cover_letter}
                        </p>
                      </div>
                    )}

                    {/* Applied Date */}
                    <p className="text-xs text-gray-500">
                      Applied on{' '}
                      {new Date(app.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>

                  {/* Status Badge & Actions */}
                  <div className="flex flex-col items-end gap-3">
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
                      className="text-sm px-3 py-1 capitalize"
                    >
                      {app.status}
                    </Badge>

                    {/* Message Button - Employers can message applicants */}
                    {!isWorker && (
                      <MessageButton
                        recipientId={app.worker.id}
                        recipientName={app.worker.name}
                        variant="outline"
                        className="text-xs"
                      />
                    )}

                    <Link
                      href={`/dashboard/jobs/${app.job.id}`}
                      className="text-sm text-crewup-blue hover:underline font-medium"
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
