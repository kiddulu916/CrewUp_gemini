import { OnboardingForm } from '@/features/onboarding/components/onboarding-form';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';

      

export const metadata = {
  title: 'Complete Your Profile - KrewUp',
  description: 'Set up your KrewUp profile',
};

export default async function OnboardingPage() {
  const supabase = await createClient(await cookies());

  // Check if user is authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Get user's profile to check if onboarding is needed
  const { data: profile } = await supabase
    .from('users')
    .select(`
      *,
      workers(trade)
    `)
    .eq('id', user.id)
    .single();

  // Build full name from first_name and last_name
  const fullName = profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() : '';
  const worker = (profile as any)?.workers?.[0];

  // If profile is already complete, redirect to dashboard
  // Profile is complete if:
  // 1. Has proper name (not starting with 'User-')
  // 2. Has proper location (not default)
  // 3. For workers: has trade record
  // 4. For employers: role is set
  const hasCompleteName = fullName && !fullName.startsWith('User-');
  const hasProperLocation = profile?.location && profile.location !== 'Update your location';
  const hasRoleData = profile?.role === 'worker' ? !!worker : profile?.role === 'employer';
  
  if (profile && hasCompleteName && hasProperLocation && hasRoleData) {
    redirect('/dashboard/feed');
  }

  // Extract name and email from Google OAuth or profile
  const initialName =
    user.user_metadata?.full_name || (fullName.startsWith('User-') ? '' : fullName) || '';
  const initialEmail = user.email || profile?.email || '';

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <OnboardingForm initialName={initialName} initialEmail={initialEmail} />
    </div>
  );
}
