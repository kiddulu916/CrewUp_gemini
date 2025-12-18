import { createClient } from '@/lib/supabase/server';
import { ProfileForm } from '@/features/profiles/components/profile-form';
import { redirect } from 'next/navigation';

export const metadata = {
  title: 'Edit Profile - CrewUp',
  description: 'Update your profile information',
};

export default async function ProfileEditPage() {
  const supabase = await createClient();

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-bold bg-gradient-to-r from-crewup-blue to-crewup-orange bg-clip-text text-transparent">
          Edit Profile
        </h1>
        <p className="mt-2 text-gray-600">
          Update your profile information and preferences
        </p>
      </div>

      <ProfileForm initialData={profile} />
    </div>
  );
}
