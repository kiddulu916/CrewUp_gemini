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
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  // If profile is already complete, redirect to dashboard
  if (
    profile &&
    !profile.name.startsWith('User-') &&
    profile.location !== 'Update your location' &&
    profile.trade !== 'General Laborer'
  ) {
    redirect('/dashboard/feed');
  }

  // Extract name and email from Google OAuth or profile
  const initialName =
    user.user_metadata?.full_name || (profile?.name?.startsWith('User-') ? '' : profile?.name) || '';
  const initialEmail = user.email || profile?.email || '';

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <OnboardingForm initialName={initialName} initialEmail={initialEmail} />
    </div>
  );
}
