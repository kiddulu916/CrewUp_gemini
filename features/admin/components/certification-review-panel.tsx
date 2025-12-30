'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Card, CardHeader, CardTitle, CardContent, Button, Textarea, Badge, ConfirmDialog } from '@/components/ui';
import {
  approveCertification,
  rejectCertification,
  flagCertification,
} from '../actions/certification-actions';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/providers/toast-provider';

type CertificationWithProfile = {
  id: string;
  user_id: string;
  credential_category: string;
  certification_type: string;
  certification_number?: string;
  issued_by?: string;
  issuing_state?: string;
  issue_date?: string;
  expires_at?: string;
  image_url: string;
  verification_status: string;
  verified_at?: string;
  verified_by?: string;
  rejection_reason?: string;
  verification_notes?: string;
  created_at: string;
  profiles: {
    id: string;
    name: string;
    email: string;
    role: string;
    employer_type?: string;
  };
};

type Props = {
  certification: CertificationWithProfile;
  onClose: () => void;
};

export function CertificationReviewPanel({ certification, onClose }: Props) {
  const router = useRouter();
  const toast = useToast();
  const [isZoomed, setIsZoomed] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [flagNotes, setFlagNotes] = useState(certification.verification_notes || '');
  const [isLoading, setIsLoading] = useState(false);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [showFlagForm, setShowFlagForm] = useState(false);
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);
  const [showRejectConfirm, setShowRejectConfirm] = useState(false);

  const handleApproveClick = () => {
    setShowApproveConfirm(true);
  };

  const handleApprove = async () => {
    setShowApproveConfirm(false);
    setIsLoading(true);
    try {
      const result = await approveCertification(certification.id);
      if (result.success) {
        toast.success('Certification approved successfully!');
        router.refresh();
        onClose();
      } else {
        toast.error('Failed to approve certification: ' + result.error);
      }
    } catch (error) {
      console.error('Error approving certification:', error);
      toast.error('An error occurred while approving the certification');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRejectClick = () => {
    if (!rejectionReason.trim()) {
      toast.warning('Please provide a rejection reason');
      return;
    }
    setShowRejectConfirm(true);
  };

  const handleReject = async () => {
    setShowRejectConfirm(false);
    setIsLoading(true);
    try {
      const result = await rejectCertification(certification.id, rejectionReason);
      if (result.success) {
        toast.success('Certification rejected');
        router.refresh();
        onClose();
      } else {
        toast.error('Failed to reject certification: ' + result.error);
      }
    } catch (error) {
      console.error('Error rejecting certification:', error);
      toast.error('An error occurred while rejecting the certification');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFlag = async () => {
    if (!flagNotes.trim()) {
      toast.warning('Please provide flag notes');
      return;
    }

    setIsLoading(true);
    try {
      const result = await flagCertification(certification.id, flagNotes);
      if (result.success) {
        toast.success('Certification flagged for review');
        router.refresh();
        setShowFlagForm(false);
      } else {
        toast.error('Failed to flag certification: ' + result.error);
      }
    } catch (error) {
      console.error('Error flagging certification:', error);
      toast.error('An error occurred while flagging the certification');
    } finally {
      setIsLoading(false);
    }
  };

  const isPending = certification.verification_status === 'pending';

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>{certification.certification_type}</CardTitle>
            <div className="flex gap-2 mt-2">
              <Badge
                variant={
                  certification.credential_category === 'license'
                    ? 'info'
                    : 'default'
                }
              >
                {certification.credential_category}
              </Badge>
              <Badge
                variant={
                  certification.verification_status === 'verified'
                    ? 'success'
                    : certification.verification_status === 'rejected'
                    ? 'danger'
                    : 'warning'
                }
              >
                {certification.verification_status}
              </Badge>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
          >
            ×
          </button>
        </div>
      </CardHeader>

      <CardContent className="p-6 space-y-6">
        {/* Image Viewer */}
        <div>
          <h3 className="font-medium text-sm text-gray-700 mb-2">
            Certification Image
          </h3>
          <div
            className={`relative bg-gray-100 rounded-lg overflow-hidden cursor-pointer ${
              isZoomed ? 'fixed inset-4 z-50' : 'aspect-video'
            }`}
            onClick={() => setIsZoomed(!isZoomed)}
          >
            {isZoomed && (
              <div className="absolute inset-0 bg-black bg-opacity-90" />
            )}
            <Image
              src={certification.image_url}
              alt={certification.certification_type}
              fill
              className={`${isZoomed ? 'object-contain' : 'object-cover'}`}
              sizes={isZoomed ? '100vw' : '600px'}
            />
            {isZoomed && (
              <button
                className="absolute top-4 right-4 text-white text-4xl hover:text-gray-300"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsZoomed(false);
                }}
              >
                ×
              </button>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Click image to {isZoomed ? 'close' : 'zoom'}
          </p>
        </div>

        {/* User Information */}
        <div>
          <h3 className="font-medium text-sm text-gray-700 mb-2">
            User Information
          </h3>
          <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Name:</span>
              <span className="font-medium">{certification.profiles.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Email:</span>
              <span className="font-medium">{certification.profiles.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Role:</span>
              <span className="font-medium capitalize">
                {certification.profiles.role}
                {certification.profiles.employer_type &&
                  ` (${certification.profiles.employer_type})`}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Submitted:</span>
              <span className="font-medium">
                {new Date(certification.created_at).toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* License/Certification Metadata */}
        {(certification.certification_number ||
          certification.issued_by ||
          certification.issuing_state ||
          certification.issue_date ||
          certification.expires_at) && (
          <div>
            <h3 className="font-medium text-sm text-gray-700 mb-2">
              {certification.credential_category === 'license'
                ? 'License Details'
                : 'Certification Details'}
            </h3>
            <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
              {certification.certification_number && (
                <div className="flex justify-between">
                  <span className="text-gray-600">
                    {certification.credential_category === 'license'
                      ? 'License Number:'
                      : 'Certification Number:'}
                  </span>
                  <span className="font-medium">
                    {certification.certification_number}
                  </span>
                </div>
              )}
              {certification.issued_by && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Issuing Authority:</span>
                  <span className="font-medium">{certification.issued_by}</span>
                </div>
              )}
              {certification.issuing_state && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Issuing State:</span>
                  <span className="font-medium">{certification.issuing_state}</span>
                </div>
              )}
              {certification.issue_date && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Date Issued:</span>
                  <span className="font-medium">
                    {new Date(certification.issue_date).toLocaleDateString()}
                  </span>
                </div>
              )}
              {certification.expires_at && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Expiration Date:</span>
                  <span className="font-medium">
                    {new Date(certification.expires_at).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Verification Details (if not pending) */}
        {!isPending && (
          <div>
            <h3 className="font-medium text-sm text-gray-700 mb-2">
              Verification Details
            </h3>
            <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
              {certification.verified_at && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Verified At:</span>
                  <span className="font-medium">
                    {new Date(certification.verified_at).toLocaleString()}
                  </span>
                </div>
              )}
              {certification.rejection_reason && (
                <div>
                  <span className="text-gray-600 block mb-1">
                    Rejection Reason:
                  </span>
                  <span className="font-medium text-red-600">
                    {certification.rejection_reason}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Admin Notes */}
        {certification.verification_notes && (
          <div>
            <h3 className="font-medium text-sm text-gray-700 mb-2">
              Admin Notes (Internal)
            </h3>
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 text-sm">
              {certification.verification_notes}
            </div>
          </div>
        )}

        {/* Action Buttons (only for pending) */}
        {isPending && (
          <div className="space-y-4 pt-4 border-t">
            {!showRejectForm && !showFlagForm && (
              <div className="flex gap-3">
                <Button
                  onClick={handleApproveClick}
                  disabled={isLoading}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  {isLoading ? 'Processing...' : 'Approve'}
                </Button>
                <Button
                  onClick={() => setShowRejectForm(true)}
                  disabled={isLoading}
                  variant="danger"
                  className="flex-1"
                >
                  Reject
                </Button>
                <Button
                  onClick={() => setShowFlagForm(true)}
                  disabled={isLoading}
                  variant="outline"
                >
                  Flag
                </Button>
              </div>
            )}

            {/* Reject Form */}
            {showRejectForm && (
              <div className="space-y-3">
                <label className="block">
                  <span className="text-sm font-medium text-gray-700">
                    Rejection Reason (visible to user)
                  </span>
                  <Textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Explain why this certification is being rejected..."
                    rows={4}
                    className="mt-1"
                  />
                </label>
                <div className="flex gap-3">
                  <Button
                    onClick={handleRejectClick}
                    disabled={isLoading || !rejectionReason.trim()}
                    variant="danger"
                    className="flex-1"
                  >
                    {isLoading ? 'Rejecting...' : 'Confirm Rejection'}
                  </Button>
                  <Button
                    onClick={() => setShowRejectForm(false)}
                    variant="outline"
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {/* Flag Form */}
            {showFlagForm && (
              <div className="space-y-3">
                <label className="block">
                  <span className="text-sm font-medium text-gray-700">
                    Flag Notes (internal only)
                  </span>
                  <Textarea
                    value={flagNotes}
                    onChange={(e) => setFlagNotes(e.target.value)}
                    placeholder="Add notes about why this certification needs review..."
                    rows={4}
                    className="mt-1"
                  />
                </label>
                <div className="flex gap-3">
                  <Button
                    onClick={handleFlag}
                    disabled={isLoading || !flagNotes.trim()}
                    className="flex-1 bg-purple-600 hover:bg-purple-700"
                  >
                    {isLoading ? 'Flagging...' : 'Flag for Review'}
                  </Button>
                  <Button
                    onClick={() => setShowFlagForm(false)}
                    variant="outline"
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {/* License Notice */}
            {certification.credential_category === 'license' && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
                <p className="font-medium text-blue-900 mb-1">
                  Contractor License
                </p>
                <p className="text-blue-700">
                  Approving this license will enable job posting for this user.
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>

      {/* Confirmation Dialogs */}
      <ConfirmDialog
        isOpen={showApproveConfirm}
        onClose={() => setShowApproveConfirm(false)}
        onConfirm={handleApprove}
        title="Approve Certification"
        message="Are you sure you want to approve this certification? This will verify the credential and update the user's profile."
        confirmText="Approve"
        isLoading={isLoading}
      />

      <ConfirmDialog
        isOpen={showRejectConfirm}
        onClose={() => setShowRejectConfirm(false)}
        onConfirm={handleReject}
        title="Reject Certification"
        message="Are you sure you want to reject this certification? The user will be notified with your rejection reason."
        confirmText="Reject"
        isLoading={isLoading}
      />
    </Card>
  );
}
