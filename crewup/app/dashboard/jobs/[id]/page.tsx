import { createClient } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, Badge, Button } from '@/components/ui';
import { ApplyButton } from '@/features/jobs/components/apply-button';
import { MessageButton } from '@/features/messaging/components/message-button';
import Link from 'next/link';

export default async function JobDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient();

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

  // Fetch job with employer details
  const { data: job, error } = await supabase
    .from('jobs')
    .select(`
      *,
      employer:profiles!employer_id(
        id,
        name,
        trade,
        sub_trade,
        location,
        bio,
        employer_type
      )
    `)
    .eq('id', params.id)
    .single();

  if (error || !job) {
    notFound();
  }

  const isWorker = profile.role === 'worker';
  const isEmployer = profile.role === 'employer';
  const isJobOwner = job.employer_id === user.id;

  // Check if worker has already applied
  let hasApplied = false;
  if (isWorker) {
    const { data: application } = await supabase
      .from('applications')
      .select('id')
      .eq('job_id', job.id)
      .eq('worker_id', user.id)
      .single();

    hasApplied = !!application;
  }

  // Fetch applications if employer owns this job
  let applications = [];
  if (isJobOwner) {
    const { data: apps } = await supabase
      .from('applications')
      .select(`
        *,
        worker:profiles!worker_id(
          id,
          name,
          trade,
          sub_trade,
          location,
          bio
        )
      `)
      .eq('job_id', job.id)
      .order('created_at', { ascending: false });

    applications = apps || [];
  }

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Link href="/dashboard/jobs">
        <Button variant="outline" className="mb-4">
          ← Back to Jobs
        </Button>
      </Link>

      {/* Job Details Card */}
      <Card className="shadow-xl border-2 border-crewup-light-blue">
        <CardHeader className="bg-gradient-to-r from-crewup-blue to-crewup-light-blue">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-white text-3xl mb-2">{job.title}</CardTitle>
              <div className="flex flex-wrap gap-2 mt-3">
                <Badge variant="info">{job.trade}</Badge>
                {job.sub_trade && <Badge variant="default">{job.sub_trade}</Badge>}
                <Badge variant="success">{job.job_type}</Badge>
                <Badge
                  variant={job.status === 'active' ? 'success' : 'default'}
                  className="capitalize"
                >
                  {job.status}
                </Badge>
              </div>
            </div>
            {isWorker && !hasApplied && job.status === 'active' && (
              <ApplyButton jobId={job.id} />
            )}
            {isWorker && hasApplied && (
              <Badge variant="success" className="text-lg px-4 py-2">
                ✓ Applied
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          {/* Job Info Grid */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase mb-1">Location</h3>
                <p className="text-lg text-gray-900 flex items-center gap-2">
                  <span className="text-2xl">📍</span>
                  {job.location}
                </p>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase mb-1">Pay Rate</h3>
                <p className="text-lg font-bold text-crewup-orange flex items-center gap-2">
                  <span className="text-2xl">💰</span>
                  {job.pay_rate}
                </p>
              </div>

              {job.required_certs && job.required_certs.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">
                    Required Certifications
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {job.required_certs.map((cert: string) => (
                      <Badge key={cert} variant="warning">
                        {cert}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Employer Info */}
            {isWorker && job.employer && (
              <div className="bg-gradient-to-br from-blue-50 to-orange-50 rounded-xl p-4 border-2 border-crewup-light-blue">
                <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">Posted By</h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-xl font-bold text-gray-900">{job.employer.name}</p>
                    <p className="text-sm text-gray-600 capitalize">
                      {job.employer.employer_type}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-700">
                      <span className="font-semibold">Specialty:</span> {job.employer.trade}
                      {job.employer.sub_trade && ` - ${job.employer.sub_trade}`}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-700">
                      <span className="font-semibold">Location:</span> {job.employer.location}
                    </p>
                  </div>
                  {job.employer.bio && (
                    <div className="pt-2 border-t border-gray-200">
                      <p className="text-sm text-gray-600 italic">{job.employer.bio}</p>
                    </div>
                  )}
                  <div className="pt-3">
                    <MessageButton
                      recipientId={job.employer.id}
                      recipientName={job.employer.name}
                      variant="primary"
                      fullWidth
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Job Description */}
          <div className="pt-4 border-t-2 border-gray-200">
            <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
              <span className="text-2xl">📋</span>
              Job Description
            </h3>
            <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
              {job.description}
            </p>
          </div>

          {/* Posted Date */}
          <div className="pt-4 border-t border-gray-200">
            <p className="text-sm text-gray-500">
              Posted on {new Date(job.created_at).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Applications Section (Only for job owner) */}
      {isJobOwner && (
        <Card className="shadow-xl border-2 border-crewup-light-orange">
          <CardHeader className="bg-gradient-to-r from-crewup-orange to-crewup-light-orange">
            <CardTitle className="text-white flex items-center gap-2">
              <span className="text-2xl">📥</span>
              Applications ({applications.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {applications.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 text-lg">No applications yet</p>
                <p className="text-gray-400 text-sm mt-2">
                  Check back later for worker applications
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {applications.map((app: any) => (
                  <div
                    key={app.id}
                    className="bg-white border-2 border-gray-200 rounded-xl p-4 hover:border-crewup-blue hover:shadow-lg transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-crewup-blue to-crewup-orange text-white font-bold text-lg shadow-lg">
                            {app.worker.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <h4 className="text-lg font-bold text-gray-900">
                              {app.worker.name}
                            </h4>
                            <p className="text-sm text-gray-600">
                              {app.worker.trade}
                              {app.worker.sub_trade && ` - ${app.worker.sub_trade}`}
                            </p>
                          </div>
                        </div>

                        <div className="ml-15 space-y-2">
                          <p className="text-sm text-gray-700">
                            <span className="font-semibold">Location:</span> {app.worker.location}
                          </p>
                          {app.worker.bio && (
                            <p className="text-sm text-gray-600 italic">{app.worker.bio}</p>
                          )}
                          {app.cover_letter && (
                            <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                              <p className="text-sm font-semibold text-gray-700 mb-1">
                                Cover Letter:
                              </p>
                              <p className="text-sm text-gray-700">{app.cover_letter}</p>
                            </div>
                          )}
                          <p className="text-xs text-gray-500 mt-2">
                            Applied on {new Date(app.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      <div className="ml-4 flex flex-col gap-2 items-end">
                        <Badge
                          variant={
                            app.status === 'pending'
                              ? 'warning'
                              : app.status === 'hired'
                              ? 'success'
                              : app.status === 'rejected'
                              ? 'danger'
                              : 'info'
                          }
                          className="capitalize"
                        >
                          {app.status}
                        </Badge>
                        <MessageButton
                          recipientId={app.worker.id}
                          recipientName={app.worker.name}
                          variant="secondary"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
