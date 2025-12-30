import { createClient } from '@/lib/supabase/server';
import { ProfileForm } from '@/features/profiles/components/profile-form';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';

      

export const metadata = {
  title: 'Edit Profile - KrewUp',
  description: 'Update your profile information',
};

export default async function ProfileEditPage() {
  const supabase = await createClient(await cookies());

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

  // Fetch certifications for workers and licenses for contractors
  const { data: certifications } =
    (profile.role === 'worker' ||
     (profile.role === 'employer' && profile.employer_type === 'contractor'))
      ? await supabase
          .from('certifications')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
      : { data: null };

  const { data: workExperience } = profile.role === 'worker'
    ? await supabase
        .from('work_experience')
        .select('*')
        .eq('user_id', user.id)
        .order('start_date', { ascending: false })
    : { data: null };

  const { data: education } = profile.role === 'worker'
    ? await supabase
        .from('education')
        .select('*')
        .eq('user_id', user.id)
        .order('graduation_year', { ascending: false, nullsFirst: false })
    : { data: null };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-bold bg-gradient-to-r from-krewup-blue to-krewup-orange bg-clip-text text-transparent">
          Edit Profile
        </h1>
        <p className="mt-2 text-gray-600">
          Update your profile information and preferences
        </p>
      </div>

      <ProfileForm
        initialData={profile}
        certifications={certifications || []}
        workExperience={workExperience || []}
        education={education || []}
      />
    </div>
  );
}
