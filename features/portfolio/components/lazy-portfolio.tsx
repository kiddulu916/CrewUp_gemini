'use client';

import dynamic from 'next/dynamic';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

/**
 * Lazy-loaded PortfolioManager component.
 * This component uses @dnd-kit which adds significant bundle size.
 * By lazy loading, we only load it when the user needs it.
 */

// Loading placeholder
const PortfolioLoading = () => (
  <div className="flex items-center justify-center py-12 bg-gray-50 rounded-lg">
    <LoadingSpinner />
  </div>
);

export const LazyPortfolioManager = dynamic(
  () => import('./portfolio-manager').then((mod) => ({ default: mod.PortfolioManager })),
  {
    loading: PortfolioLoading,
    ssr: false,
  }
);

