'use client';

import { useState } from 'react';
import { CertificationFilter } from './certification-filter';
import { getFilteredApplications } from '../actions/certification-filter-actions';
import { Badge } from '@/components/ui/badge';
import { MessageButton } from '@/features/messaging/components/message-button';
import { getFullName, getInitials } from '@/lib/utils';

type Application = {
  id: string;
  status: string;
  cover_letter?: string | null;
  created_at: string;
  applicant: {
    id: string;
    first_name: string;
    last_name: string;
    trade: string;
    sub_trade?: string | null;
    location: string;
    bio?: string | null;
    is_profile_boosted?: boolean;
    boost_expires_at?: string | null;
  };
};

type ApplicationsListWithFilterProps = {
  jobId: string;
  initialApplications: Application[];
};

export function ApplicationsListWithFilter({
  jobId,
  initialApplications,
}: ApplicationsListWithFilterProps) {
  const [filteredApplications, setFilteredApplications] = useState<Application[] | null>(null);
  const [isFiltering, setIsFiltering] = useState(false);

  // Handle certification filter changes
  const handleFilterChange = async (certifications: string[], verifiedOnly: boolean) => {
    setIsFiltering(true);
    try {
      const result = await getFilteredApplications(jobId, {
        certificationNames: certifications,
        verifiedOnly,
      });

      if (result.success && result.data) {
        setFilteredApplications(result.data as Application[]);
      }
    } catch (error) {
      console.error('Error filtering applications:', error);
    } finally {
      setIsFiltering(false);
    }
  };

  // Use filtered applications if available, otherwise use initial applications
  const applicationsToShow = filteredApplications || initialApplications;

  // Sort: boosted first, then by created_at
  const sortedApplications = [...applicationsToShow].sort((a, b) => {
    const aIsBoosted =
      a.applicant.is_profile_boosted &&
      a.applicant.boost_expires_at &&
      new Date(a.applicant.boost_expires_at) > new Date();
    const bIsBoosted =
      b.applicant.is_profile_boosted &&
      b.applicant.boost_expires_at &&
      new Date(b.applicant.boost_expires_at) > new Date();

    if (aIsBoosted && !bIsBoosted) return -1;
    if (!aIsBoosted && bIsBoosted) return 1;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  return (
    <div className="space-y-6">
      {/* Certification Filter */}
      <CertificationFilter
        onFilterChange={handleFilterChange}
      />

      {/* Loading state */}
      {isFiltering && (
        <div className="text-center py-4">
          <p className="text-gray-600">Filtering applications...</p>
        </div>
      )}

      {/* Applications List */}
      {sortedApplications.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">
            {filteredApplications ? 'No applications match your filters' : 'No applications yet'}
          </p>
          <p className="text-gray-400 text-sm mt-2">
            {filteredApplications
              ? 'Try adjusting your filter criteria'
              : 'Check back later for worker applications'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedApplications.map((app) => (
            <div
              key={app.id}
              className="bg-white border-2 border-gray-200 rounded-xl p-4 hover:border-krewup-blue hover:shadow-lg transition-all"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-krewup-blue to-krewup-orange text-white font-bold text-lg shadow-lg">
                      {getInitials(app.applicant)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-lg font-bold text-gray-900">{getFullName(app.applicant)}</h4>
                        {app.applicant.is_profile_boosted &&
                          app.applicant.boost_expires_at &&
                          new Date(app.applicant.boost_expires_at) > new Date() && (
                            <Badge
                              variant="warning"
                              className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white border-none"
                            >
                              ⭐ Boosted
                            </Badge>
                          )}
                      </div>
                      <p className="text-sm text-gray-600">
                        {app.applicant.trade}
                        {app.applicant.sub_trade && ` - ${app.applicant.sub_trade}`}
                      </p>
                    </div>
                  </div>

                  <div className="ml-15 space-y-2">
                    <p className="text-sm text-gray-700">
                      <span className="font-semibold">Location:</span> {app.applicant.location}
                    </p>
                    {app.applicant.bio && (
                      <p className="text-sm text-gray-600 italic">{app.applicant.bio}</p>
                    )}
                    {app.cover_letter && (
                      <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm font-semibold text-gray-700 mb-1">Cover Letter:</p>
                        <p className="text-sm text-gray-700">{app.cover_letter}</p>
                      </div>
                    )}
                    <p className="text-xs text-gray-500 mt-2">
                      Applied on {new Date(app.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="ml-4 flex flex-col gap-2 items-end">
                  <Badge
                    variant={
                      app.status === 'pending'
                        ? 'warning'
                        : app.status === 'hired'
                        ? 'success'
                        : app.status === 'rejected'
                        ? 'danger'
                        : 'info'
                    }
                    className="capitalize"
                  >
                    {app.status}
                  </Badge>
                  <MessageButton
                    recipientId={app.applicant.id}
                    recipientName={getFullName(app.applicant)}
                    variant="secondary"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
