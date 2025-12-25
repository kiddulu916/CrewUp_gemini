import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { ExperienceForm } from '@/features/profiles/components/experience-form';
import { cookies } from 'next/headers';

export const metadata = {
  title: 'Add Work Experience - KrewUp',
  description: 'Add work experience to your profile',
};

export default async function AddExperiencePage() {
  const supabase = await createClient(await cookies());

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  // Only workers can add work experience
  if (!profile || profile.role !== 'worker') {
    redirect('/dashboard/profile');
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-bold bg-gradient-to-r from-krewup-blue to-krewup-orange bg-clip-text text-transparent">
          Add Work Experience
        </h1>
        <p className="mt-2 text-gray-600">
          Showcase your work history and skills
        </p>
      </div>

      <ExperienceForm />
    </div>
  );
}
