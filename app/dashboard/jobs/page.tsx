import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, Button, Badge } from '@/components/ui';
import Link from 'next/link';
import { formatRelativeTime } from '@/lib/utils';
import { cookies } from 'next/headers';

export const metadata = {
  title: 'Jobs - CrewUp',
  description: 'Browse and manage job postings',
};

export default async function JobsPage() {
  const supabase = await createClient(await cookies());

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
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
          employer:profiles!employer_id(name, company_name, trade, location)
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
          employer:profiles!employer_id(name, company_name, trade, location)
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
          <h1 className="text-4xl font-bold bg-gradient-to-r from-crewup-blue to-crewup-orange bg-clip-text text-transparent">
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

      {/* Filters - TODO: Add filtering functionality */}
      {!isEmployer && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <input
                type="text"
                placeholder="Search jobs..."
                className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-crewup-blue"
              />
              <Button variant="outline">Filter</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Jobs List */}
      {jobs && jobs.length > 0 ? (
        <div className="grid gap-4">
          {jobs.map((job: any) => (
            <Link key={job.id} href={`/dashboard/jobs/${job.id}`}>
              <Card className="hover:border-crewup-blue hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] cursor-pointer border-2">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {job.title}
                        </h3>
                        <Badge variant="info">{job.job_type}</Badge>
                        {isEmployer && (
                          <Badge
                            variant={
                              job.status === 'active'
                                ? 'success'
                                : job.status === 'filled'
                                ? 'default'
                                : 'warning'
                            }
                          >
                            {job.status}
                          </Badge>
                        )}
                      </div>

                      {job.employer && (
                        <p className="mb-2 text-sm text-gray-500">
                          Posted by {job.employer.company_name || job.employer.name}
                        </p>
                      )}

                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          <span>💼</span>
                          {job.trade_selections && job.trade_selections.length > 0
                            ? job.trade_selections.map((ts: any) => ts.trade).join(', ')
                            : job.trades && job.trades.length > 0
                            ? job.trades.join(', ')
                            : job.trade}
                        </span>
                        <span className="flex items-center gap-1">
                          <span>📍</span>
                          {job.location}
                        </span>
                        <span className="flex items-center gap-1">
                          <span>💰</span>
                          {job.pay_rate}
                        </span>
                      </div>

                      {job.required_certs && job.required_certs.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {job.required_certs.map((cert: string) => (
                            <span
                              key={cert}
                              className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700"
                            >
                              {cert}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="ml-6 text-right">
                      <p className="text-sm text-gray-500">
                        {formatRelativeTime(job.created_at)}
                      </p>
                      {isEmployer && (
                        <p className="mt-1 text-sm font-medium text-gray-900">
                          {job.application_count || 0} applications
                        </p>
                      )}
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
              {isEmployer ? 'No jobs posted yet' : 'No jobs available'}
            </h3>
            <p className="mt-2 text-sm text-gray-600">
              {isEmployer ? (
                <>
                  Get started by posting your first job to find skilled workers
                  <br />
                  <Link href="/dashboard/jobs/new">
                    <Button className="mt-4">Post a Job</Button>
                  </Link>
                </>
              ) : (
                'Check back later for new opportunities'
              )}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
