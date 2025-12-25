// features/subscriptions/components/profile-views-list.tsx
'use client';

import { useQuery } from '@tanstack/react-query';
import { getMyProfileViews, getProfileViewCount } from '../actions/profile-views-actions';
import { useIsPro } from '../hooks/use-subscription';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

function formatTimeAgo(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;
  return date.toLocaleDateString();
}

export function ProfileViewsList() {
  const router = useRouter();
  const isPro = useIsPro();

  // Fetch view count for free users (teaser)
  const { data: countData } = useQuery({
    queryKey: ['profile-view-count'],
    queryFn: async () => {
      const result = await getProfileViewCount();
      if (!result.success) throw new Error(result.error);
      return result.count;
    },
    enabled: !isPro,
  });

  // Fetch full views list for Pro users
  const { data: viewsData, isLoading, error } = useQuery({
    queryKey: ['profile-views'],
    queryFn: async () => {
      const result = await getMyProfileViews();
      if (!result.success) throw new Error(result.error);
      return { views: result.views || [], weeklyCount: result.weeklyCount || 0 };
    },
    enabled: isPro,
    refetchInterval: 60000, // Refetch every minute
  });

  // Free user teaser
  if (!isPro) {
    return (
      <Card className="p-6 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 mb-4 bg-blue-100 rounded-full">
          <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        </div>
        <h3 className="text-xl font-bold mb-2">Who Viewed Your Profile</h3>
        <p className="text-3xl font-bold text-blue-600 mb-2">{countData || 0}</p>
        <p className="text-gray-600 mb-4">
          {countData === 1 ? 'employer has' : 'employers have'} viewed your profile
        </p>
        <p className="text-gray-600 mb-4">
          Upgrade to Pro to see who viewed your profile and send them a message.
        </p>
        <Button onClick={() => router.push('/pricing')}>
          Upgrade to Pro - $15/month
        </Button>
      </Card>
    );
  }

  // Pro user loading state
  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </Card>
    );
  }

  // Pro user error state
  if (error) {
    return (
      <Card className="p-6 text-center">
        <p className="text-red-600 mb-4">
          Unable to load profile views. Please try again.
        </p>
        <Button onClick={() => window.location.reload()}>
          Retry
        </Button>
      </Card>
    );
  }

  const { views = [], weeklyCount = 0 } = viewsData || {};

  // Pro user - no views yet
  if (views.length === 0) {
    return (
      <Card className="p-6 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 mb-4 bg-gray-100 rounded-full">
          <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold mb-2">No views yet</h3>
        <p className="text-gray-600">
          When employers view your profile, they'll appear here.
        </p>
      </Card>
    );
  }

  // Pro user - show views list
  return (
    <Card className="p-6">
      <div className="mb-4">
        <h3 className="text-xl font-bold mb-1">Who Viewed Your Profile</h3>
        <p className="text-sm text-gray-600">
          <strong>{weeklyCount}</strong> {weeklyCount === 1 ? 'view' : 'views'} this week
        </p>
      </div>

      <div className="space-y-3">
        {views.map((view) => (
          <div
            key={view.id}
            className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-semibold">{view.viewer.name}</h4>
                {view.viewer.employer_type && (
                  <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
                    {view.viewer.employer_type}
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-600">{view.viewer.location}</p>
              <p className="text-xs text-gray-500 mt-1">{formatTimeAgo(view.viewed_at)}</p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => router.push(`/dashboard/profiles/${view.viewer.id}`)}
            >
              View Profile
            </Button>
          </div>
        ))}
      </div>
    </Card>
  );
}
