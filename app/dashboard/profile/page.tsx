import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle, Badge, Button } from '@/components/ui';
import { CertificationItem } from '@/features/profiles/components/certification-item';
import { ExperienceItem } from '@/features/profiles/components/experience-item';
import { EducationItem } from '@/features/profiles/components/education-item';
import { ProfileViewsList } from '@/features/subscriptions/components/profile-views-list';
import { InitialsAvatar } from '@/lib/utils/initials-avatar';
import { CollapsibleSection } from '@/components/common';
import Link from 'next/link';
import { cookies } from 'next/headers';

export const metadata = {
  title: 'Profile - KrewUp',
  description: 'View and manage your profile',
};

export default async function ProfilePage() {
  const supabase = await createClient(await cookies());

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

  // Get education if worker
  const { data: education } = profile?.role === 'worker'
    ? await supabase
        .from('education')
        .select('*')
        .eq('user_id', user.id)
        .order('graduation_year', { ascending: false, nullsFirst: false })
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
      <CollapsibleSection
        title="Basic Information"
        defaultOpen={true}
        badge={profile?.subscription_status === 'pro' ? <Badge variant="pro">Pro Member</Badge> : undefined}
      >
        <div className="flex items-start gap-6">
          {/* Profile Picture */}
          {profile?.profile_image_url ? (
            <img
              src={profile.profile_image_url}
              alt={profile.name}
              className="w-24 h-24 rounded-full object-cover border-4 border-gray-200 shrink-0"
            />
          ) : (
            <InitialsAvatar name={profile?.name || ''} userId={profile?.id || ''} size="lg" />
          )}

          {/* Info Grid */}
          <div className="flex-1 grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-500">Name</p>
              <p className="mt-1 text-base text-gray-900">{profile?.name}</p>
            </div>
            {profile?.role === 'employer' && profile?.company_name && (
              <div>
                <p className="text-sm font-medium text-gray-500">Company Name</p>
                <p className="mt-1 text-base text-gray-900">{profile.company_name}</p>
              </div>
            )}
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
      </CollapsibleSection>

      {/* Who Viewed My Profile - Workers Only */}
      {profile?.role === 'worker' && (
        <CollapsibleSection title="Who Viewed My Profile" defaultOpen={true}>
          <ProfileViewsList />
        </CollapsibleSection>
      )}

      {/* Certifications - Workers Only */}
      {profile?.role === 'worker' && (
        <CollapsibleSection
          title="Certifications"
          defaultOpen={true}
          actions={
            <Link href="/dashboard/profile/certifications">
              <Button variant="outline" size="sm">
                Add Certification
              </Button>
            </Link>
          }
        >
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
        </CollapsibleSection>
      )}

      {/* Work Experience - Workers Only */}
      {profile?.role === 'worker' && (
        <CollapsibleSection
          title="Work Experience"
          defaultOpen={true}
          actions={
            <Link href="/dashboard/profile/experience">
              <Button variant="outline" size="sm">
                Add Experience
              </Button>
            </Link>
          }
        >
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
        </CollapsibleSection>
      )}

      {/* Education - Workers Only */}
      {profile?.role === 'worker' && (
        <CollapsibleSection
          title="Education"
          defaultOpen={true}
          actions={
            <Link href="/dashboard/profile/education">
              <Button variant="outline" size="sm">
                Add Education
              </Button>
            </Link>
          }
        >
          {education && education.length > 0 ? (
            <div className="space-y-3">
              {education.map((edu: any) => (
                <EducationItem key={edu.id} education={edu} />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>No education added yet</p>
              <p className="text-sm mt-1">
                Add your education to enhance your profile
              </p>
            </div>
          )}
        </CollapsibleSection>
      )}
    </div>
  );
}
