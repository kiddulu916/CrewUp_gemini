import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { CandidatePipelineDashboard } from '@/features/analytics/components/candidate-pipeline-dashboard';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export const metadata = {
  title: 'Candidate Pipeline - KrewUp',
  description: 'Track your hiring pipeline and conversion metrics',
};

export default async function PipelinePage() {
  const supabase = await createClient(await cookies());

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('users')
    .select('role, subscription_status')
    .eq('id', user.id)
    .single();

  // Only employers can access
  if (profile?.role !== 'employer') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="p-8 text-center max-w-md">
          <h1 className="text-2xl font-bold mb-2">Employers Only</h1>
          <p className="text-gray-600 mb-4">
            This page is only available for employers.
          </p>
          <Link href="/dashboard/feed">
            <Button>Go to Dashboard</Button>
          </Link>
        </Card>
      </div>
    );
  }

  // Pro feature gate
  if (profile?.subscription_status !== 'pro') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="p-8 text-center max-w-md">
          <div className="inline-flex items-center justify-center w-16 h-16 mb-4 bg-blue-100 rounded-full">
            <svg className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold mb-2">Upgrade to Pro</h1>
          <p className="text-gray-600 mb-6">
            Candidate Pipeline Analytics is a Pro feature. Track your hiring funnel, conversion rates, and time-to-hire metrics.
          </p>
          <Link href="/pricing">
            <Button size="lg">Upgrade to Pro - $15/month</Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6">
      <CandidatePipelineDashboard />
    </div>
  );
}
