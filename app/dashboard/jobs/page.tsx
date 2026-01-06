import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, Button, Badge } from '@/components/ui';
import Link from 'next/link';
import { formatRelativeTime } from '@/lib/utils';
import { cookies } from 'next/headers';
import { JobsPageClient } from './page-client';

      

export const metadata = {
  title: 'Jobs - KrewUp',
  description: 'Browse and manage job postings',
};

export default async function JobsPage() {
  const supabase = await createClient(await cookies());

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single();

  const isEmployer = profile?.role === 'employer';

  // Get jobs based on role
  const { data: jobs } = isEmployer
    ? // Employers see their own jobs
      await supabase
        .from('jobs')
        .select(
          `
          *,
          employer:users!employer_id(first_name, last_name, location)
        `
        )
        .eq('employer_id', user.id)
        .order('created_at', { ascending: false })
    : // Workers see all active jobs
      await supabase
        .from('jobs')
        .select(
          `
          *,
          employer:users!employer_id(first_name, last_name, location)
        `
        )
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(50);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-krewup-blue to-krewup-orange bg-clip-text text-transparent">
            {isEmployer ? 'My Job Posts' : 'Browse Jobs'}
          </h1>
          <p className="mt-2 text-gray-600 text-lg">
            {isEmployer
              ? 'Manage your job postings and view applications'
              : 'Find your next opportunity'}
          </p>
        </div>
        {isEmployer && (
          <Link href="/dashboard/jobs/new">
            <Button className="shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-105">
              Post a Job
            </Button>
          </Link>
        )}
      </div>

      {isEmployer ? (
        /* Employer View */
        jobs && jobs.length > 0 ? (
          <div className="grid gap-3">
            {jobs.map((job: any) => (
              <Link key={job.id} href={`/dashboard/jobs/${job.id}`}>
                <Card className="hover:border-krewup-blue hover:shadow-lg transition-all duration-200 cursor-pointer border">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h3 className="text-base font-bold text-gray-900">
                            {job.title}
                          </h3>
                          <Badge variant="info" className="text-xs px-2 py-0.5">{job.job_type}</Badge>
                          <Badge
                            variant={
                              job.status === 'active'
                                ? 'success'
                                : job.status === 'filled'
                                ? 'default'
                                : 'warning'
                            }
                            className="text-xs px-2 py-0.5"
                          >
                            {job.status}
                          </Badge>
                        </div>

                        <div className="flex items-center gap-3 text-sm text-gray-600 flex-wrap">
                          <span>
                            💼 {job.trades && job.trades.length > 0
                              ? job.trades.join(', ')
                              : 'No trades specified'}
                          </span>
                          <span className="text-gray-400">•</span>
                          <span>📍 {job.location}</span>
                          <span className="text-gray-400">•</span>
                          <span>📅 {formatRelativeTime(job.created_at)}</span>
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="text-sm font-semibold text-gray-900">
                          {job.application_count || 0} apps
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-12 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 text-3xl">
                💼
              </div>
              <h3 className="mt-4 text-lg font-semibold text-gray-900">
                No jobs posted yet
              </h3>
              <div className="mt-2 text-sm text-gray-600">
                Get started by posting your first job to find skilled workers
                <br />
                <Link href="/dashboard/jobs/new">
                  <Button className="mt-4">Post a Job</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )
      ) : (
        /* Worker View with Filters */
        <JobsPageClient 
          initialJobs={jobs?.map((job: any) => ({
            ...job,
            employer_name: job.employer 
              ? `${job.employer.first_name} ${job.employer.last_name}`.trim() 
              : 'Unknown Employer'
          })) || []} 
          subscriptionStatus={profile?.subscription_status}
          isLifetimePro={profile?.is_lifetime_pro}
        />
      )}
    </div>
  );
}
