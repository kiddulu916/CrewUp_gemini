'use client';

import { useCertifications } from '../../hooks/use-certifications';
import { Badge } from '@/components/ui/badge';
import { Loader2, Award, CheckCircle, XCircle, Clock } from 'lucide-react';
import { format } from 'date-fns';
import Image from 'next/image';

type CertificationsTabProps = {
  userId: string;
};

export function CertificationsTab({ userId }: CertificationsTabProps) {
  const { data: certifications, isLoading, error } = useCertifications(userId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-krewup-blue" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
        <p className="text-red-600">Failed to load certifications</p>
      </div>
    );
  }

  if (!certifications || certifications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 py-12">
        <Award className="h-12 w-12 text-gray-400" />
        <p className="mt-2 text-gray-600">No certifications added yet</p>
      </div>
    );
  }

  const getVerificationBadge = (status: string) => {
    switch (status) {
      case 'verified':
        return (
          <Badge variant="success" className="gap-1">
            <CheckCircle className="h-3 w-3" />
            Verified
          </Badge>
        );
      case 'pending':
        return (
          <Badge variant="warning" className="gap-1">
            <Clock className="h-3 w-3" />
            Pending
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="danger" className="gap-1">
            <XCircle className="h-3 w-3" />
            Rejected
          </Badge>
        );
      default:
        return null;
    }
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return null;
    try {
      return format(new Date(dateString), 'MMM dd, yyyy');
    } catch {
      return dateString;
    }
  };

  return (
    <div className="space-y-6">
      {certifications.map((cert) => (
        <div
          key={cert.id}
          className="rounded-lg border border-gray-200 bg-white p-6"
        >
          <div className="flex flex-col gap-4 sm:flex-row">
            {/* Left side: Icon and info */}
            <div className="flex-1">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-krewup-blue to-krewup-light-blue">
                    <Award className="h-6 w-6 text-white" />
                  </div>
                </div>

                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-xl font-semibold text-gray-900">
                      {cert.certification_type}
                    </h3>
                    {getVerificationBadge(cert.verification_status)}
                    <Badge variant="default">
                      {cert.credential_category === 'license' ? 'License' : 'Certification'}
                    </Badge>
                  </div>

                  <div className="mt-2 space-y-1 text-sm text-gray-600">
                    {cert.issuing_organization && (
                      <p>
                        <span className="font-medium">Issued by:</span> {cert.issuing_organization}
                      </p>
                    )}
                    {cert.credential_id && (
                      <p>
                        <span className="font-medium">Number:</span> ****{cert.credential_id.slice(-4)}
                      </p>
                    )}
                    {cert.issue_date && (
                      <p>
                        <span className="font-medium">Issued:</span> {formatDate(cert.issue_date)}
                      </p>
                    )}
                    {cert.expiration_date && (
                      <p>
                        <span className="font-medium">Expires:</span> {formatDate(cert.expiration_date)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Right side: Photo */}
            {cert.image_url && (
              <div className="flex-shrink-0">
                <Image
                  src={cert.image_url}
                  alt={`${cert.certification_type} certificate`}
                  width={160}
                  height={160}
                  className="h-32 w-32 rounded-lg border border-gray-200 object-cover sm:h-40 sm:w-40"
                />
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
