'use client';

import { useState } from 'react';
import { Button } from '@/components/ui';
import { deleteEducation } from '../actions/education-actions';
import { useRouter } from 'next/navigation';

type Props = {
  education: any;
  showActions?: boolean;
};

export function EducationItem({ education, showActions = true }: Props) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  async function handleDelete() {
    setIsDeleting(true);
    const result = await deleteEducation(education.id);

    if (result.success) {
      router.refresh();
    } else {
      alert(result.error || 'Failed to delete education entry');
      setIsDeleting(false);
    }
  }

  return (
    <div className="flex items-start justify-between p-4 bg-gray-50 rounded-lg">
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <h4 className="font-medium text-gray-900">{education.degree_type}</h4>
          {education.is_currently_enrolled && (
            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
              Current
            </span>
          )}
        </div>
        <p className="text-sm text-gray-700 mt-1">{education.institution_name}</p>
        {education.field_of_study && (
          <p className="text-sm text-gray-600 mt-0.5">{education.field_of_study}</p>
        )}
        {education.graduation_year && (
          <p className="text-xs text-gray-500 mt-1">
            {education.is_currently_enrolled ? 'Expected: ' : 'Graduated: '}
            {education.graduation_year}
          </p>
        )}
      </div>

      {showActions && (
        <div>
          {showConfirm ? (
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowConfirm(false)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                variant="danger"
                onClick={handleDelete}
                isLoading={isDeleting}
              >
                Delete
              </Button>
            </div>
          ) : (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowConfirm(true)}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              Delete
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
