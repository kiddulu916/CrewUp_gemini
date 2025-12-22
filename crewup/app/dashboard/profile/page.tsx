import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle, Badge, Button } from '@/components/ui';
import { CertificationItem } from '@/features/profiles/components/certification-item';
import { ExperienceItem } from '@/features/profiles/components/experience-item';
import Link from 'next/link';

export const metadata = {
  title: 'Profile - CrewUp',
  description: 'View and manage your profile',
};

export default async function ProfilePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  // Get certifications if worker
  const { data: certifications } = profile?.role === 'worker'
    ? await supabase
        .from('certifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
    : { data: null };

  // Get work experience if worker
  const { data: workExperience } = profile?.role === 'worker'
    ? await supabase
        .from('work_experience')
        .select('*')
        .eq('user_id', user.id)
        .order('start_date', { ascending: false })
    : { data: null };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
          <p className="mt-2 text-gray-600">
            Manage your profile information and settings
          </p>
        </div>
        <Link href="/dashboard/profile/edit">
          <Button>Edit Profile</Button>
        </Link>
      </div>

      {/* Basic Info Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Basic Information</CardTitle>
            {profile?.subscription_status === 'pro' && <Badge variant="pro">Pro Member</Badge>}
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-6">
            {/* Profile Picture Placeholder */}
            <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-crewup-blue text-4xl font-bold text-white">
              {profile?.name.charAt(0).toUpperCase()}
            </div>

            {/* Info Grid */}
            <div className="flex-1 grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-500">Name</p>
                <p className="mt-1 text-base text-gray-900">{profile?.name}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Email</p>
                <p className="mt-1 text-base text-gray-900">{profile?.email}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Role</p>
                <p className="mt-1 text-base text-gray-900 capitalize">{profile?.role}</p>
              </div>
              {profile?.employer_type && (
                <div>
                  <p className="text-sm font-medium text-gray-500">Employer Type</p>
                  <p className="mt-1 text-base text-gray-900 capitalize">
                    {profile.employer_type}
                  </p>
                </div>
              )}
              <div>
                <p className="text-sm font-medium text-gray-500">Trade</p>
                <p className="mt-1 text-base text-gray-900">{profile?.trade}</p>
              </div>
              {profile?.sub_trade && (
                <div>
                  <p className="text-sm font-medium text-gray-500">Specialty</p>
                  <p className="mt-1 text-base text-gray-900">{profile.sub_trade}</p>
                </div>
              )}
              <div>
                <p className="text-sm font-medium text-gray-500">Location</p>
                <p className="mt-1 text-base text-gray-900">{profile?.location}</p>
              </div>
              {profile?.phone && (
                <div>
                  <p className="text-sm font-medium text-gray-500">Phone</p>
                  <p className="mt-1 text-base text-gray-900">{profile.phone}</p>
                </div>
              )}
            </div>
          </div>

          {profile?.bio && (
            <div className="mt-6">
              <p className="text-sm font-medium text-gray-500">Bio</p>
              <p className="mt-2 text-base text-gray-700">{profile.bio}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Certifications - Workers Only */}
      {profile?.role === 'worker' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Certifications</CardTitle>
              <Link href="/dashboard/profile/certifications">
                <Button variant="outline" size="sm">
                  Add Certification
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {certifications && certifications.length > 0 ? (
              <div className="space-y-3">
                {certifications.map((cert: any) => (
                  <CertificationItem key={cert.id} cert={cert} />
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>No certifications added yet</p>
                <p className="text-sm mt-1">
                  Add certifications to stand out to employers
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Work Experience - Workers Only */}
      {profile?.role === 'worker' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Work Experience</CardTitle>
              <Link href="/dashboard/profile/experience">
                <Button variant="outline" size="sm">
                  Add Experience
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {workExperience && workExperience.length > 0 ? (
              <div className="space-y-4">
                {workExperience.map((exp: any) => (
                  <ExperienceItem key={exp.id} exp={exp} />
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>No work experience added yet</p>
                <p className="text-sm mt-1">
                  Add your experience to showcase your skills
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
