import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { InitialLocationCapture } from '@/features/dashboard/components/initial-location-capture';

export const metadata = {
  title: 'Feed - CrewUp',
  description: 'Your personalized job feed',
};

export default async function FeedPage() {
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

  return (
    <div className="space-y-6">
      {/* Capture initial location on first visit */}
      <InitialLocationCapture />

      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          Welcome back, {profile?.name}! 👋
        </h1>
        <p className="mt-2 text-gray-600">
          Here's what's happening in your network
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg bg-blue-50 p-4">
              <div>
                <p className="font-medium text-gray-900">Profile Complete</p>
                <p className="text-sm text-gray-600">
                  You're all set as a {profile?.role}
                </p>
              </div>
              <div className="text-2xl">✓</div>
            </div>

            {profile?.role === 'worker' ? (
              <div className="rounded-lg border-2 border-dashed border-gray-300 p-6 text-center">
                <p className="text-gray-600">
                  Start browsing jobs to find your next opportunity
                </p>
                <a
                  href="/dashboard/jobs"
                  className="mt-2 inline-block text-crewup-blue hover:underline"
                >
                  Browse Jobs →
                </a>
              </div>
            ) : (
              <div className="rounded-lg border-2 border-dashed border-gray-300 p-6 text-center">
                <p className="text-gray-600">
                  Post your first job to start finding great workers
                </p>
                <a
                  href="/dashboard/jobs/new"
                  className="mt-2 inline-block text-crewup-blue hover:underline"
                >
                  Post a Job →
                </a>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Quick Stats</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-lg bg-gray-50 p-4 text-center">
              <p className="text-2xl font-bold text-crewup-blue">0</p>
              <p className="text-sm text-gray-600">
                {profile?.role === 'worker' ? 'Applications' : 'Job Posts'}
              </p>
            </div>
            <div className="rounded-lg bg-gray-50 p-4 text-center">
              <p className="text-2xl font-bold text-crewup-blue">0</p>
              <p className="text-sm text-gray-600">Messages</p>
            </div>
            <div className="rounded-lg bg-gray-50 p-4 text-center">
              <p className="text-2xl font-bold text-crewup-blue">0</p>
              <p className="text-sm text-gray-600">Profile Views</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
