'use client';

import dynamic from 'next/dynamic';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

/**
 * Lazy-loaded chart components to reduce initial bundle size.
 * Recharts is a heavy dependency (~500KB) that should only be loaded when needed.
 */

// Loading placeholder for charts
const ChartLoading = () => (
  <div className="flex items-center justify-center h-[300px] bg-gray-50 rounded-lg">
    <LoadingSpinner />
  </div>
);

// Lazy load UserGrowthChart
export const LazyUserGrowthChart = dynamic(
  () => import('./user-growth-chart').then((mod) => ({ default: mod.UserGrowthChart })),
  {
    loading: ChartLoading,
    ssr: false,
  }
);

// Lazy load ErrorRateChart
export const LazyErrorRateChart = dynamic(
  () => import('./error-rate-chart').then((mod) => ({ default: mod.ErrorRateChart })),
  {
    loading: ChartLoading,
    ssr: false,
  }
);

// Lazy load FunnelChart
export const LazyFunnelChart = dynamic(
  () => import('./funnel-chart').then((mod) => ({ default: mod.FunnelChart })),
  {
    loading: ChartLoading,
    ssr: false,
  }
);

