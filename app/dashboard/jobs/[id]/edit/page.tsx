import { Suspense } from 'react';
import { notFound, redirect } from 'next/navigation';
import { Card, CardHeader, CardContent } from '@/components/ui';
import { EditJobForm } from '@/features/jobs/components/edit-job-form';
import { getJob } from '@/features/jobs/actions/job-actions';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

      

type EditJobPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditJobPage({ params }: EditJobPageProps) {
  const supabase = await createClient(await cookies());
  const { id } = await params;

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Load job data
  const result = await getJob(id);

  if (!result.success || !result.data) {
    notFound();
  }

  const job = result.data;

  // Verify user owns this job
  if (job.employer_id !== user.id) {
    redirect('/dashboard/jobs');
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Edit Job Post</h1>
          <p className="mt-2 text-gray-600">Update your job posting details</p>
        </div>

        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold">Job Details</h2>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<div>Loading...</div>}>
              <EditJobForm job={job} />
            </Suspense>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
