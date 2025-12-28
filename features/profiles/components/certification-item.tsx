'use client';

import { useState } from 'react';
import { Badge, Button, ConfirmDialog } from '@/components/ui';
import { VerificationBadge } from '@/components/common';
import { deleteCertification } from '../actions/certification-actions';
import { useToast } from '@/components/providers/toast-provider';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type CertificationItemProps = {
  cert: {
    id: string;
    certification_type: string;
    certification_number?: string | null;
    issued_by?: string | null;
    expires_at?: string | null;
    is_verified: boolean;
    verification_status?: 'pending' | 'verified' | 'rejected';
    rejection_reason?: string | null;
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
      <div className="rounded-lg border border-gray-200 p-4 hover:border-krewup-blue transition-colors">
        {/* Header with certification info and verification badge */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-start gap-3 flex-1">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 shrink-0">
              <span className="text-lg">📜</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-lg text-gray-900">{cert.certification_type}</p>
              {(cert.certification_number || cert.issued_by) && (
                <p className="text-sm text-gray-600 mt-1">
                  {cert.certification_number && <span>{cert.certification_number}</span>}
                  {cert.certification_number && cert.issued_by && <span> • </span>}
                  {cert.issued_by && <span>Issued by {cert.issued_by}</span>}
                </p>
              )}
              {cert.expires_at && (
                <p className="text-sm text-gray-500 mt-1">
                  Expires: {new Date(cert.expires_at).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-4">
            {cert.verification_status && (
              <VerificationBadge
                status={cert.verification_status}
                size="sm"
              />
            )}
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

        {/* Show rejection reason if rejected */}
        {cert.verification_status === 'rejected' && cert.rejection_reason && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm font-medium text-red-900 mb-1">
              Rejection Reason:
            </p>
            <p className="text-sm text-red-800 mb-2">
              {cert.rejection_reason}
            </p>
            <Link href="/dashboard/profile/certifications">
              <button className="text-sm text-red-700 underline hover:text-red-900 font-medium">
                Upload Corrected Certification
              </button>
            </Link>
          </div>
        )}
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
