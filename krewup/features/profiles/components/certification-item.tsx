'use client';

import { useState } from 'react';
import { Badge, Button, ConfirmDialog } from '@/components/ui';
import { deleteCertification } from '../actions/certification-actions';
import { useToast } from '@/components/providers/toast-provider';
import { useRouter } from 'next/navigation';

type CertificationItemProps = {
  cert: {
    id: string;
    certification_type: string;
    expires_at?: string | null;
    is_verified: boolean;
  };
};

export function CertificationItem({ cert }: CertificationItemProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const toast = useToast();
  const router = useRouter();

  const handleDelete = async () => {
    setIsDeleting(true);

    try {
      const result = await deleteCertification(cert.id);

      if (result.success) {
        toast.success('Certification deleted successfully');
        setShowConfirm(false);
        router.refresh();
      } else {
        toast.error(result.error || 'Failed to delete certification');
        setIsDeleting(false);
      }
    } catch (error) {
      toast.error('An unexpected error occurred');
      setIsDeleting(false);
    }
  };

  return (
    <>
      <div className="flex items-center justify-between rounded-lg border border-gray-200 p-4 hover:border-crewup-blue transition-colors">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
            <span className="text-lg">📜</span>
          </div>
          <div>
            <p className="font-medium text-gray-900">{cert.certification_type}</p>
            {cert.expires_at && (
              <p className="text-sm text-gray-500">
                Expires: {new Date(cert.expires_at).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {cert.is_verified && <Badge variant="success">Verified</Badge>}
          <Button
            onClick={() => setShowConfirm(true)}
            variant="danger"
            size="sm"
            className="text-xs"
          >
            Delete
          </Button>
        </div>
      </div>

      <ConfirmDialog
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleDelete}
        title="Delete Certification"
        message={`Are you sure you want to delete "${cert.certification_type}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        isLoading={isDeleting}
      />
    </>
  );
}
