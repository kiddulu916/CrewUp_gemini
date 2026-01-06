import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import { ApplicationWizardContainer } from '@/features/applications/components/application-wizard/wizard-container';
import { cookies } from 'next/headers';

      

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default async function ApplyPage({ params }: Props) {
  const { id: jobId } = await params;
  const supabase = await createClient(await cookies());

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Get user profile to check role
  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile) {
    redirect('/onboarding');
  }

  if (profile.role !== 'worker') {
    redirect(`/dashboard/jobs/${jobId}`);
  }

  // Get job details
  const { data: job, error } = await supabase
    .from('jobs')
    .select('title, status')
    .eq('id', jobId)
    .single();

  if (error || !job) {
    notFound();
  }

  if (job.status !== 'active') {
    redirect(`/dashboard/jobs/${jobId}`);
  }

  // Check if already applied
  const { data: existingApp } = await supabase
    .from('job_applications')
    .select('id')
    .eq('job_id', jobId)
    .eq('applicant_id', user.id)
    .single();

  if (existingApp) {
    redirect(`/dashboard/jobs/${jobId}?already_applied=true`);
  }

  return <ApplicationWizardContainer jobId={jobId} jobTitle={job.title} />;
}
