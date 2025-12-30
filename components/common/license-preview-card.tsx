'use client';

import { Card, CardContent, Badge } from '@/components/ui';
import Image from 'next/image';

type LicenseData = {
  id: string;
  certification_type: string;
  certification_number?: string | null;
  issued_by?: string | null;
  issuing_state?: string | null;
  issue_date?: string | null;
  expires_at?: string | null;
  image_url: string;
  verification_status: 'pending' | 'verified' | 'rejected';
  rejection_reason?: string | null;
  created_at: string;
};

interface LicensePreviewCardProps {
  license: LicenseData | null;
}

export function LicensePreviewCard({ license }: LicensePreviewCardProps) {
  // Empty state if no license
  if (!license) {
    return (
      <Card className="border-gray-300">
        <CardContent className="p-6">
          <div className="text-center py-8">
            <div className="text-5xl mb-3">📄</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No License on File
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Upload your contractor license to start posting jobs
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Check if license is expired
  const isExpired = license.expires_at && new Date(license.expires_at) < new Date();
  const status = isExpired ? 'expired' : license.verification_status;

  // Status styling
  const statusConfig = {
    pending: {
      badge: { variant: 'warning' as const, label: 'Pending Verification' },
      watermark: {
        text: 'PENDING VERIFICATION',
        className: 'text-yellow-600',
        bgClassName: 'bg-yellow-100',
      },
    },
    verified: {
      badge: { variant: 'success' as const, label: 'Verified' },
      watermark: null,
    },
    rejected: {
      badge: { variant: 'danger' as const, label: 'Rejected' },
      watermark: {
        text: 'REJECTED',
        className: 'text-red-600',
        bgClassName: 'bg-red-100',
      },
    },
    expired: {
      badge: { variant: 'warning' as const, label: 'Expired' },
      watermark: {
        text: 'EXPIRED',
        className: 'text-orange-600',
        bgClassName: 'bg-orange-100',
      },
    },
  };

  const config = statusConfig[status];

  return (
    <Card className="border-gray-300">
      <CardContent className="p-6 space-y-4">
        {/* Status Badge */}
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            Contractor License
          </h3>
          <Badge variant={config.badge.variant}>{config.badge.label}</Badge>
        </div>

        {/* License Image with Watermark */}
        <div className="relative w-full aspect-[4/3] bg-gray-100 rounded-lg overflow-hidden border-2 border-gray-200">
          <Image
            src={license.image_url}
            alt="Contractor License"
            fill
            className="object-contain"
            sizes="(max-width: 768px) 100vw, 600px"
            onError={(e) => {
              // Fallback on error
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
            }}
          />

          {/* Watermark Overlay */}
          {config.watermark && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="transform -rotate-45">
                <div
                  className={`${config.watermark.bgClassName} ${config.watermark.className} px-8 py-4 rounded-lg opacity-80 border-4 border-current`}
                >
                  <p className="text-3xl font-black tracking-wider whitespace-nowrap">
                    {config.watermark.text}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Verified Checkmark Badge */}
          {status === 'verified' && (
            <div className="absolute top-4 right-4 bg-green-500 text-white rounded-full p-3 shadow-lg">
              <svg
                className="w-8 h-8"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={3}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
          )}
        </div>

        {/* License Metadata */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-gray-500 font-medium">License Type</p>
            <p className="text-gray-900">{license.certification_type}</p>
          </div>

          {license.certification_number && (
            <div>
              <p className="text-gray-500 font-medium">License Number</p>
              <p className="text-gray-900">{license.certification_number}</p>
            </div>
          )}

          {license.issued_by && (
            <div>
              <p className="text-gray-500 font-medium">Issuing Authority</p>
              <p className="text-gray-900">{license.issued_by}</p>
            </div>
          )}

          {license.issuing_state && (
            <div>
              <p className="text-gray-500 font-medium">Issuing State</p>
              <p className="text-gray-900">{license.issuing_state}</p>
            </div>
          )}

          {license.issue_date && (
            <div>
              <p className="text-gray-500 font-medium">Date Issued</p>
              <p className="text-gray-900">
                {new Date(license.issue_date).toLocaleDateString()}
              </p>
            </div>
          )}

          {license.expires_at && (
            <div>
              <p className="text-gray-500 font-medium">Expiration Date</p>
              <p className={`${isExpired ? 'text-red-600 font-semibold' : 'text-gray-900'}`}>
                {new Date(license.expires_at).toLocaleDateString()}
                {isExpired && ' (Expired)'}
              </p>
            </div>
          )}

          <div>
            <p className="text-gray-500 font-medium">Submitted</p>
            <p className="text-gray-900">
              {new Date(license.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Rejection Reason */}
        {status === 'rejected' && license.rejection_reason && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-4">
            <p className="text-sm font-semibold text-red-900 mb-1">
              Rejection Reason:
            </p>
            <p className="text-sm text-red-800">{license.rejection_reason}</p>
          </div>
        )}

        {/* Pending Message */}
        {status === 'pending' && (
          <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-4">
            <p className="text-sm text-yellow-800">
              Your license is being reviewed by our team. You'll be able to post jobs once
              verified, which usually takes <strong>24-48 hours</strong>. We'll send you an
              email notification when complete.
            </p>
          </div>
        )}

        {/* Expired Message */}
        {status === 'expired' && (
          <div className="rounded-lg bg-orange-50 border border-orange-200 p-4">
            <p className="text-sm text-orange-800">
              Your license has expired. Please upload a current license to continue posting
              jobs.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
