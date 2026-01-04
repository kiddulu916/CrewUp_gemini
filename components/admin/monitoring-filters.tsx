'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { SegmentFilter, type SegmentValue } from '@/components/admin/segment-filter';
import { useCallback } from 'react';

type Props = {
  initialValue: SegmentValue;
};

export function MonitoringFilters({ initialValue }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Create a new URLSearchParams object to preserve other potential params
  const createQueryString = useCallback(
    (name: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(name, value);
      } else {
        params.delete(name);
      }
      return params.toString();
    },
    [searchParams]
  );

  const handleChange = (newValue: SegmentValue) => {
    // Update URL params based on the filter selection
    // We update multiple params at once here
    const params = new URLSearchParams(searchParams.toString());
    
    if (newValue.role) params.set('role', newValue.role);
    else params.delete('role');

    if (newValue.subscription) params.set('subscription', newValue.subscription);
    else params.delete('subscription');

    // Push the new URL - this triggers the Server Component (page.tsx) to re-render
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <SegmentFilter
      value={initialValue}
      onChange={handleChange}
      showLocation={false}
      showEmployerType={false}
    />
  );
}