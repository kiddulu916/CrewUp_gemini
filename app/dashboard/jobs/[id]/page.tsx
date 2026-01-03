import { createClient } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, Badge, Button } from '@/components/ui';
import { ApplyButton } from '@/features/jobs/components/apply-button';
import { DeleteJobButton } from '@/features/jobs/components/delete-job-button';
import { EditJobButton } from '@/features/jobs/components/edit-job-button';
import { MessageButton } from '@/features/messaging/components/message-button';
import { ApplicationsListWithFilter } from '@/features/applications/components/applications-list-with-filter';
import { JobViewTracker } from '@/features/jobs/components/job-view-tracker';
import { JobAnalyticsDashboard } from '@/features/jobs/components/job-analytics-dashboard';
import { CompatibilityBreakdownWrapper } from '@/features/jobs/components/compatibility-breakdown-wrapper';
import { calculateDistance } from '@/features/jobs/utils/distance';
import Link from 'next/link';
import { cookies } from 'next/headers';

      

export default async function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient(await cookies());
  const { id } = await params;

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

  // Fetch certifications for workers
  let certifications = [];
  if (profile.role === 'worker') {
    const { data: certs } = await supabase
      .from('certifications')
      .select('*')
      .eq('user_id', user.id);
    certifications = certs || [];
  }

  // Fetch job with employer details
  const { data: job, error } = await supabase
    .from('jobs')
    .select(`
      *,
      employer:profiles!employer_id(
        id,
        name,
        company_name,
        trade,
        sub_trade,
        location,
        bio,
        employer_type
      )
    `)
    .eq('id', id)
    .single();

  if (error || !job) {
    notFound();
  }

  const isWorker = profile.role === 'worker';
  const isEmployer = profile.role === 'employer';
  const isJobOwner = job.employer_id === user.id;

  // Calculate distance for workers
  let distance = null;
  if (isWorker && profile.coords && job.coords) {
    distance = calculateDistance(
      { lat: profile.coords.x, lng: profile.coords.y },
      { lat: job.coords.coordinates[1], lng: job.coords.coordinates[0] }
    );
  }

  // Build current user data for compatibility
  const currentUserData = isWorker ? {
    trade: profile.trade,
    sub_trade: profile.sub_trade,
    location: profile.location,
    coords: profile.coords,
    years_of_experience: profile.years_of_experience,
    certifications: certifications,
  } : null;

  // Check if worker has already applied
  let hasApplied = false;
  if (isWorker) {
    const { data: application } = await supabase
      .from('job_applications')
      .select('id')
      .eq('job_id', job.id)
      .eq('applicant_id', user.id)
      .single();

    hasApplied = !!application;
  }

  // Fetch applications if employer owns this job
  let applications = [];
  if (isJobOwner) {
    const { data: apps } = await supabase
      .from('job_applications')
      .select(`
        *,
        applicant:profiles!applicant_id(
          id,
          name,
          trade,
          sub_trade,
          location,
          bio,
          is_profile_boosted,
          boost_expires_at
        )
      `)
      .eq('job_id', job.id)
      .order('created_at', { ascending: false });

    applications = apps || [];
  }

  return (
    <div className="space-y-6">
      {/* Track job view */}
      <JobViewTracker jobId={job.id} />

      {/* Back button */}
      <Link href="/dashboard/jobs">
        <Button variant="outline" className="mb-4">
          ← Back to Jobs
        </Button>
      </Link>

      {/* Job Details Card */}
      <Card className="shadow-xl border-2 border-krewup-light-blue">
        <CardHeader className="bg-gradient-to-r from-krewup-blue to-krewup-light-blue">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-white text-3xl mb-2">{job.title}</CardTitle>
              {job.employer && (
                <p className="text-white/90 text-lg mt-2">
                  Posted by: <span className="font-semibold">{job.employer.company_name || job.employer.name}</span>
                </p>
              )}
            </div>
            <div className="flex flex-col gap-2">
              {isWorker && !hasApplied && job.status === 'active' && (
                <ApplyButton jobId={job.id} />
              )}
              {isWorker && hasApplied && (
                <Badge variant="success" className="text-lg px-4 py-2">
                  ✓ Applied
                </Badge>
              )}
              {isJobOwner && (
                <>
                  <EditJobButton jobId={job.id} />
                  <DeleteJobButton jobId={job.id} />
                </>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          {/* Trades Needed */}
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
              <span className="text-2xl">🔨</span>
              Trades Needed
            </h3>
            <div className="space-y-3">
              {/* Show structured trade_selections if available */}
              {job.trade_selections && job.trade_selections.length > 0 ? (
                job.trade_selections.map((selection: { trade: string; subTrades: string[] }, index: number) => (
                  <div key={index} className="space-y-2">
                    <div>
                      <Badge variant="info" className="text-base px-3 py-1">{selection.trade}</Badge>
                    </div>
                    {selection.subTrades && selection.subTrades.length > 0 && (
                      <div className="ml-4 flex flex-wrap gap-2">
                        {selection.subTrades.map((subTrade: string) => (
                          <Badge key={subTrade} variant="default" className="text-sm px-2 py-1">
                            {subTrade}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                // Fallback to old format
                <div className="flex flex-wrap gap-2">
                  {job.trades && job.trades.length > 0 ? (
                    job.trades.map((trade: string) => (
                      <Badge key={trade} variant="info" className="text-base px-3 py-1">{trade}</Badge>
                    ))
                  ) : (
                    <Badge variant="info" className="text-base px-3 py-1">{job.trade}</Badge>
                  )}
                  {job.sub_trades && job.sub_trades.length > 0 && job.sub_trades.map((subTrade: string) => (
                    <Badge key={subTrade} variant="default" className="text-base px-3 py-1">{subTrade}</Badge>
                  ))}
                  {!job.sub_trades && job.sub_trade && (
                    <Badge variant="default" className="text-base px-3 py-1">{job.sub_trade}</Badge>
                  )}
                </div>
              )}
            </div>
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

          {/* Location */}
          <div className="pt-4 border-t-2 border-gray-200">
            <h3 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
              <span className="text-2xl">📍</span>
              Location
            </h3>
            <p className="text-lg text-gray-900">{job.location}</p>
          </div>

          {/* Job Info Grid */}
          <div className="pt-4 border-t-2 border-gray-200 grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase mb-1">Job Type</h3>
                <Badge variant="success" className="text-base px-3 py-1">{job.job_type}</Badge>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase mb-1">Pay Rate</h3>
                <div className="text-lg font-bold text-krewup-orange">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-2xl">💰</span>
                    <span>Compensation</span>
                  </div>
                  {job.subtrade_pay_rates && Object.keys(job.subtrade_pay_rates).length > 0 ? (
                    <div className="ml-8 space-y-2">
                      {Object.entries(job.subtrade_pay_rates).map(([subtrade, rate]) => (
                        <div key={subtrade} className="text-base">
                          <span className="font-semibold text-gray-700">{subtrade}:</span>{' '}
                          <span className="text-krewup-orange">{String(rate)}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="ml-8 text-base">{job.pay_rate}</div>
                  )}
                </div>
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
              <div className="bg-gradient-to-br from-blue-50 to-orange-50 rounded-lg p-3 border border-krewup-light-blue">
                <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">Posted By</h3>
                <div className="space-y-2">
                  <div>
                    <p className="text-base font-bold text-gray-900">{job.employer.company_name || job.employer.name}</p>
                    <p className="text-xs text-gray-600 capitalize">
                      {job.employer.employer_type}
                    </p>
                  </div>
                  <div className="text-xs text-gray-700 space-y-1">
                    <p>
                      <span className="font-semibold">Specialty:</span> {job.employer.trade}
                      {job.employer.sub_trade && ` - ${job.employer.sub_trade}`}
                    </p>
                    <p>
                      <span className="font-semibold">Location:</span> {job.employer.location}
                    </p>
                  </div>
                  {job.employer.bio && (
                    <div className="pt-1.5 border-t border-gray-200">
                      <p className="text-xs text-gray-600 italic line-clamp-2">{job.employer.bio}</p>
                    </div>
                  )}
                  <div className="pt-2">
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

      {/* Compatibility Breakdown - Pro Workers Only */}
      {isWorker && currentUserData && (
        <CompatibilityBreakdownWrapper
          job={job}
          currentUser={currentUserData}
          distance={distance}
        />
      )}

      {/* Job Analytics (Only for job owner) */}
      {isJobOwner && (
        <Card>
          <CardHeader>
            <CardTitle>Job Analytics</CardTitle>
          </CardHeader>
          <CardContent>
            <JobAnalyticsDashboard jobId={job.id} jobTitle={job.title} />
          </CardContent>
        </Card>
      )}

      {/* Applications Section (Only for job owner) */}
      {isJobOwner && (
        <Card className="shadow-xl border-2 border-krewup-light-orange">
          <CardHeader className="bg-gradient-to-r from-krewup-orange to-krewup-light-orange">
            <CardTitle className="text-white flex items-center gap-2">
              <span className="text-2xl">📥</span>
              Applications ({applications.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <ApplicationsListWithFilter jobId={job.id} initialApplications={applications} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
