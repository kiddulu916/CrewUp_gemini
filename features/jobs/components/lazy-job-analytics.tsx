'use client';

import dynamic from 'next/dynamic';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Card } from '@/components/ui/card';

/**
 * Lazy-loaded JobAnalyticsDashboard component.
 * This component uses Recharts which adds ~500KB to the bundle.
 * By lazy loading, we only load it when actually needed.
 */

// Loading placeholder
const AnalyticsLoading = () => (
  <Card className="p-6">
    <div className="flex items-center justify-center h-[400px]">
      <LoadingSpinner />
    </div>
  </Card>
);

export const LazyJobAnalyticsDashboard = dynamic(
  () => import('./job-analytics-dashboard').then((mod) => ({ default: mod.JobAnalyticsDashboard })),
  {
    loading: AnalyticsLoading,
    ssr: false,
  }
);

