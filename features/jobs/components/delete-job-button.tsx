'use client';

import { useState } from 'react';
import { Button } from '@/components/ui';
import { deleteJob } from '../actions/job-actions';
import { useToast } from '@/components/providers/toast-provider';

type DeleteJobButtonProps = {
  jobId: string;
};

export function DeleteJobButton({ jobId }: DeleteJobButtonProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const toast = useToast();

  async function handleDelete() {
    if (!confirm('Are you sure you want to delete this job posting? This action cannot be undone.')) {
      return;
    }

    setIsDeleting(true);

    try {
      await deleteJob(jobId);
      // Redirect happens in the action
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete job');
      setIsDeleting(false);
    }
  }

  return (
    <Button
      type="button"
      variant="danger"
      onClick={handleDelete}
      isLoading={isDeleting}
      className="w-full"
    >
      {isDeleting ? 'Deleting...' : 'Delete Post'}
    </Button>
  );
}
