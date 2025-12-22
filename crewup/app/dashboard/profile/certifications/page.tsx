import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { CertificationForm } from '@/features/profiles/components/certification-form';

export const metadata = {
  title: 'Add Certification - CrewUp',
  description: 'Add a new certification to your profile',
};

export default async function AddCertificationPage() {
  const supabase = await createClient();

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

  // Only workers can add certifications
  if (!profile || profile.role !== 'worker') {
    redirect('/dashboard/profile');
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-bold bg-gradient-to-r from-crewup-blue to-crewup-orange bg-clip-text text-transparent">
          Add Certification
        </h1>
        <p className="mt-2 text-gray-600">
          Add a certification to stand out to employers
        </p>
      </div>

      <CertificationForm />
    </div>
  );
}
