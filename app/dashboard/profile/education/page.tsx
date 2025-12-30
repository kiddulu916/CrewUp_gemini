import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle, Button } from '@/components/ui';
import { EducationForm } from '@/features/profiles/components/education-form';
import { EducationItem } from '@/features/profiles/components/education-item';
import Link from 'next/link';
import { cookies } from 'next/headers';

      

export const metadata = {
  title: 'Education - KrewUp',
  description: 'Manage your education history',
};

export default async function EducationPage() {
  const supabase = await createClient(await cookies());

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: education } = await supabase
    .from('education')
    .select('*')
    .eq('user_id', user.id)
    .order('graduation_year', { ascending: false, nullsFirst: false });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Education</h1>
          <p className="mt-2 text-gray-600">
            Manage your educational background and qualifications
          </p>
        </div>
        <Link href="/dashboard/profile">
          <Button variant="outline">Back to Profile</Button>
        </Link>
      </div>

      {/* Add Education Form */}
      <Card>
        <CardHeader>
          <CardTitle>Add Education</CardTitle>
        </CardHeader>
        <CardContent>
          <EducationForm />
        </CardContent>
      </Card>

      {/* Existing Education */}
      {education && education.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Your Education History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {education.map((edu: any) => (
                <EducationItem key={edu.id} education={edu} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
