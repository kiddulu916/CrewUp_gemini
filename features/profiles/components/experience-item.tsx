'use client';

import { useState } from 'react';
import { Button, ConfirmDialog } from '@/components/ui';
import { deleteExperience } from '../actions/experience-actions';
import { RequestEndorsementButton } from '@/features/endorsements/components/request-endorsement-button';
import { EndorsementBadge } from '@/features/endorsements/components/endorsement-badge';
import { useToast } from '@/components/providers/toast-provider';
import { useRouter } from 'next/navigation';

type ExperienceItemProps = {
  exp: {
    id: string;
    job_title: string;
    company: string; // DB column is 'company', not 'company_name'
    start_date: string;
    end_date?: string | null;
    description?: string | null;
  };
  isOwnProfile?: boolean;
};

export function ExperienceItem({ exp, isOwnProfile = true }: ExperienceItemProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const toast = useToast();
  const router = useRouter();

  const handleDelete = async () => {
    setIsDeleting(true);

    try {
      const result = await deleteExperience(exp.id);

      if (result.success) {
        toast.success('Work experience deleted successfully');
        setShowConfirm(false);
        router.refresh();
      } else {
        toast.error(result.error || 'Failed to delete work experience');
        setIsDeleting(false);
      }
    } catch (error) {
      toast.error('An unexpected error occurred');
      setIsDeleting(false);
    }
  };

  return (
    <>
      <div className="border-l-2 border-krewup-blue pl-4 relative group">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900">{exp.job_title}</h3>
            <p className="text-sm text-gray-600">{exp.company}</p>
            <p className="text-sm text-gray-500">
              {new Date(exp.start_date).toLocaleDateString()} -{' '}
              {exp.end_date ? new Date(exp.end_date).toLocaleDateString() : 'Present'}
            </p>
            {exp.description && (
              <p className="mt-2 text-sm text-gray-700">{exp.description}</p>
            )}

            {/* Endorsement Badge */}
            <div className="mt-3">
              <EndorsementBadge
                experienceId={exp.id}
                showDetails={isOwnProfile}
              />
            </div>

            {/* Request Endorsement Button (only on own profile) */}
            {isOwnProfile && (
              <div className="mt-3">
                <RequestEndorsementButton
                  experienceId={exp.id}
                  onSuccess={() => router.refresh()}
                />
              </div>
            )}
          </div>
          {isOwnProfile && (
            <Button
              onClick={() => setShowConfirm(true)}
              variant="danger"
              size="sm"
              className="text-xs opacity-0 group-hover:opacity-100 transition-opacity"
            >
              Delete
            </Button>
          )}
        </div>
      </div>

      <ConfirmDialog
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleDelete}
        title="Delete Work Experience"
        message={`Are you sure you want to delete "${exp.job_title}" at ${exp.company}? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        isLoading={isDeleting}
      />
    </>
  );
}
