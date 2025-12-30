import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { JobForm } from '@/features/jobs/components/job-form';
import { ContractorVerificationBanner } from '@/components/common';
import { cookies } from 'next/headers';

      

export const metadata = {
  title: 'Post a Job - KrewUp',
  description: 'Post a new job opportunity',
};

export default async function NewJobPage() {
  const supabase = await createClient(await cookies());

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, employer_type, can_post_jobs')
    .eq('id', user.id)
    .single();

  // Only employers can post jobs
  if (profile?.role !== 'employer') {
    redirect('/dashboard/feed');
  }

  // If contractor without verified license, show banner instead of form
  if (
    profile?.role === 'employer' &&
    profile?.employer_type === 'contractor' &&
    !profile?.can_post_jobs
  ) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Post a Job</h1>
          <p className="mt-2 text-gray-600">
            Complete your contractor license verification to start posting jobs
          </p>
        </div>

        <ContractorVerificationBanner />

        <Card>
          <CardHeader>
            <CardTitle>Your License Status</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              You can view your pending license verification in your{' '}
              <a href="/dashboard/profile" className="text-blue-600 underline hover:text-blue-800">
                profile
              </a>
              .
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Post a Job</h1>
        <p className="mt-2 text-gray-600">
          Create a job posting to find skilled trade workers
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Job Details</CardTitle>
        </CardHeader>
        <CardContent>
          <JobForm />
        </CardContent>
      </Card>
    </div>
  );
}
