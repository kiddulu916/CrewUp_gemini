import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { JobForm } from '@/features/jobs/components/job-form';
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
