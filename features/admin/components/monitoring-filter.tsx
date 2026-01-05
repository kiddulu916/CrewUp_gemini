'use client';

import { SegmentFilter, type SegmentValue } from '@/components/admin/segment-filter';
import { useRouter, useSearchParams } from 'next/navigation';

export function MonitoringFilter({ initialValue }: { initialValue: SegmentValue }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleChange = (newSegment: SegmentValue) => {
    const params = new URLSearchParams(searchParams.toString());
    
    if (newSegment.role) {
      params.set('role', newSegment.role);
    } else {
      params.delete('role');
    }
    
    if (newSegment.subscription) {
      params.set('subscription', newSegment.subscription);
    } else {
      params.delete('subscription');
    }
    
    router.push(`?${params.toString()}`);
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
