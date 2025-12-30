'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Card, Badge } from '@/components/ui';
import { CertificationReviewPanel } from './certification-review-panel';

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
  certifications: CertificationWithProfile[];
  currentStatus: string;
  counts: {
    pending: number;
    verified: number;
    rejected: number;
    flagged: number;
  };
};

const tabs = [
  { key: 'pending', label: 'Pending', color: 'bg-yellow-100 text-yellow-800' },
  { key: 'verified', label: 'Verified', color: 'bg-green-100 text-green-800' },
  { key: 'rejected', label: 'Rejected', color: 'bg-red-100 text-red-800' },
  { key: 'flagged', label: 'Flagged', color: 'bg-purple-100 text-purple-800' },
];

export function CertificationQueue({ certifications, currentStatus, counts }: Props) {
  const [selectedCert, setSelectedCert] = useState<CertificationWithProfile | null>(
    null
  );

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const count = counts[tab.key as keyof typeof counts];
            const isActive = currentStatus === tab.key;

            return (
              <Link
                key={tab.key}
                href={`/admin/certifications?status=${tab.key}`}
                className={`
                  whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
                  ${
                    isActive
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                {tab.label}
                <span
                  className={`ml-2 py-0.5 px-2 rounded-full text-xs ${tab.color}`}
                >
                  {count}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Certification List */}
        <div className="space-y-4">
          {certifications.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-gray-500">
                No {currentStatus} certifications to display
              </p>
            </Card>
          ) : (
            certifications.map((cert) => (
              <Card
                key={cert.id}
                className={`p-4 cursor-pointer hover:shadow-lg transition-all ${
                  selectedCert?.id === cert.id ? 'ring-2 ring-blue-500' : ''
                }`}
                onClick={() => setSelectedCert(cert)}
              >
                <div className="flex items-start gap-4">
                  {/* Thumbnail */}
                  <div className="relative w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
                    <Image
                      src={cert.image_url}
                      alt={cert.certification_type}
                      fill
                      className="object-cover"
                      sizes="96px"
                    />
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {cert.certification_type}
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                          {cert.profiles.name}
                        </p>
                        <p className="text-xs text-gray-500">{cert.profiles.email}</p>
                      </div>
                      <Badge
                        variant={
                          cert.credential_category === 'license'
                            ? 'info'
                            : 'default'
                        }
                      >
                        {cert.credential_category}
                      </Badge>
                    </div>

                    <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                      <span>
                        Submitted{' '}
                        {new Date(cert.created_at).toLocaleDateString()}
                      </span>
                      {cert.verification_notes && (
                        <Badge variant="warning" className="text-xs">
                          Flagged
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>

        {/* Review Panel */}
        <div className="lg:sticky lg:top-6 lg:self-start">
          {selectedCert ? (
            <CertificationReviewPanel
              certification={selectedCert}
              onClose={() => setSelectedCert(null)}
            />
          ) : (
            <Card className="p-8 text-center">
              <div className="text-6xl mb-4">📋</div>
              <p className="text-gray-500">
                Select a certification to review
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
