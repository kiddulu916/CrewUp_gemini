'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui';

type EditJobButtonProps = {
  jobId: string;
};

export function EditJobButton({ jobId }: EditJobButtonProps) {
  const router = useRouter();

  function handleEdit() {
    router.push(`/dashboard/jobs/${jobId}/edit`);
  }

  return (
    <Button
      type="button"
      variant="primary"
      onClick={handleEdit}
      className="w-full"
    >
      Edit Post
    </Button>
  );
}
