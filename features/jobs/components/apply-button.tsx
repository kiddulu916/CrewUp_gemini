'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui';

type Props = {
  jobId: string;
};

export function ApplyButton({ jobId }: Props) {
  const router = useRouter();

  function handleClick() {
    router.push(`/dashboard/jobs/${jobId}/apply`);
  }

  return (
    <Button
      onClick={handleClick}
      variant="secondary"
      size="lg"
      className="shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-105"
    >
      Apply Now
    </Button>
  );
}
