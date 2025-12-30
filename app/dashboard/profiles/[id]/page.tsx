import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle, Badge, Button } from '@/components/ui';
import { MessageButton } from '@/features/messaging/components/message-button';
import { BoostBadge } from '@/features/subscriptions/components/boost-badge';
import { ProfileViewTracker } from '@/features/subscriptions/components/profile-view-tracker';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { cookies } from 'next/headers';

      

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default async function PublicProfilePage({ params }: Props) {
  const { id: profileId } = await params;
  const supabase = await createClient(await cookies());

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/sign-in');
  }

  // Redirect to own profile page if viewing own profile
  if (user.id === profileId) {
    redirect('/dashboard/profile');
  }

  // Fetch the profile
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', profileId)
    .single();

  if (error || !profile) {
    notFound();
  }

  // Get certifications if worker
  const { data: certifications } = profile.role === 'worker'
    ? await supabase
        .from('certifications')
        .select('*')
        .eq('user_id', profileId)
        .eq('is_verified', true) // Only show verified certifications to public
        .order('created_at', { ascending: false })
    : { data: null };

  // Get work experience if worker
  const { data: workExperience } = profile.role === 'worker'
    ? await supabase
        .from('work_experience')
        .select('*')
        .eq('user_id', profileId)
        .order('start_date', { ascending: false })
    : { data: null };

  return (
    <div className="space-y-6">
      {/* Track profile view */}
      <ProfileViewTracker profileId={profileId} />

      {/* Back button */}
      <Link href="/dashboard/jobs">
        <Button variant="outline">← Back</Button>
      </Link>

      {/* Basic Info Card */}
      <Card className="shadow-xl border-2 border-krewup-light-blue">
        <CardHeader className="bg-gradient-to-r from-krewup-blue to-krewup-light-blue">
          <div className="flex items-center justify-between">
            <CardTitle className="text-white text-2xl">Profile</CardTitle>
            {profile.subscription_status === 'pro' && (
              <Badge variant="pro" className="text-base px-3 py-1">
                Pro Member
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex items-start gap-6 mb-6">
            {/* Profile Picture Placeholder */}
            <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-krewup-blue to-krewup-orange text-4xl font-bold text-white shadow-lg">
              {profile.name.charAt(0).toUpperCase()}
            </div>

            {/* Info Grid */}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-4">
                <h1 className="text-2xl font-bold text-gray-900">{profile.name}</h1>
                {profile.role === 'worker' && (
                  <BoostBadge
                    expiresAt={profile.boost_expires_at}
                    size="md"
                    showExpiry
                  />
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">Role</p>
                  <p className="mt-1 text-base text-gray-900 capitalize">{profile.role}</p>
                </div>
                {profile.employer_type && (
                  <div>
                    <p className="text-sm font-medium text-gray-500">Employer Type</p>
                    <p className="mt-1 text-base text-gray-900 capitalize">
                      {profile.employer_type}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium text-gray-500">Trade</p>
                  <p className="mt-1 text-base text-gray-900">{profile.trade}</p>
                </div>
                {profile.sub_trade && (
                  <div>
                    <p className="text-sm font-medium text-gray-500">Specialty</p>
                    <p className="mt-1 text-base text-gray-900">{profile.sub_trade}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium text-gray-500">Location</p>
                  <p className="mt-1 text-base text-gray-900">{profile.location}</p>
                </div>
              </div>
            </div>
          </div>

          {profile.bio && (
            <div className="mb-6 pb-6 border-b border-gray-200">
              <p className="text-sm font-medium text-gray-500 mb-2">About</p>
              <p className="text-base text-gray-700">{profile.bio}</p>
            </div>
          )}

          {/* Message Button */}
          <div className="flex justify-end">
            <MessageButton
              recipientId={profile.id}
              recipientName={profile.name}
              variant="primary"
              className="min-w-[200px]"
            />
          </div>
        </CardContent>
      </Card>

      {/* Certifications - Workers Only */}
      {profile.role === 'worker' && certifications && certifications.length > 0 && (
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Verified Certifications</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {certifications.map((cert: any) => (
                <div
                  key={cert.id}
                  className="flex items-center justify-between rounded-lg border border-gray-200 p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
                      <span className="text-lg">📜</span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{cert.certification_type}</p>
                      {cert.expires_at && (
                        <p className="text-sm text-gray-500">
                          Expires: {new Date(cert.expires_at).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                  <Badge variant="success">Verified</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Work Experience - Workers Only */}
      {profile.role === 'worker' && workExperience && workExperience.length > 0 && (
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Work Experience</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {workExperience.map((exp: any) => (
                <div key={exp.id} className="border-l-2 border-krewup-blue pl-4">
                  <h3 className="font-semibold text-gray-900">{exp.job_title}</h3>
                  <p className="text-sm text-gray-600">{exp.company_name}</p>
                  <p className="text-sm text-gray-500">
                    {new Date(exp.start_date).toLocaleDateString()} -{' '}
                    {exp.end_date ? new Date(exp.end_date).toLocaleDateString() : 'Present'}
                  </p>
                  {exp.description && (
                    <p className="mt-2 text-sm text-gray-700">{exp.description}</p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
