'use client';

import React from 'react';
import Link from 'next/link';
import { Badge, Card, CardContent } from '@/components/ui';
import { calculateDistance, formatDistance } from '../utils/distance';
import { useIsPro } from '@/features/subscriptions/hooks/use-subscription';
import { useIsWorker } from '@/features/auth/hooks/use-auth';
import { calculateCompatibility, getScoreBadgeColor } from '../utils/compatibility-scoring';
import type { CompatibilityInput } from '../types/compatibility';
import type { Certification } from '@/features/profiles/types';

type JobCardProps = {
  job: {
    id: string;
    title: string;
    trade: string;
    sub_trade?: string | null;
    job_type: string;
    location: string;
    coords?: { lat: number; lng: number } | null;
    pay_rate: string;
    employer_name: string;
    required_certs?: string[];
    created_at: string;
    status: string;
  };
  userCoords?: { lat: number; lng: number } | null;
  currentUser?: {
    trade?: string | null;
    sub_trade?: string | null;
    location?: string | null;
    coords?: any; // PostGIS point
    years_of_experience?: number | null;
    certifications?: Certification[];
  } | null;
};

export function JobCard({ job, userCoords, currentUser }: JobCardProps) {
  const distance = calculateDistance(userCoords || null, job.coords || null);
  const distanceText = formatDistance(distance);

  const isPro = useIsPro();
  const isWorker = useIsWorker();

  // Calculate compatibility score for Pro workers only
  const compatibilityScore = React.useMemo(() => {
    if (!isPro || !isWorker || !currentUser) return null;

    // Build compatibility input
    const input: CompatibilityInput = {
      job: {
        trade: job.trade,
        sub_trade: job.sub_trade || null,
        required_certifications: job.required_certs || [],
        years_experience_required: null, // Field doesn't exist - always gives full 20 points
        location: job.location,
        coords: job.coords,
      },
      worker: {
        trade: currentUser.trade || '',
        sub_trade: currentUser.sub_trade || null,
        location: currentUser.location || '',
        coords: currentUser.coords,
      },
      workerCerts: (currentUser.certifications || []).map(c => c.certification_type),
      workerExperience: currentUser.years_of_experience || 0,
      distance: distance !== null ? distance : 999,
    };

    return calculateCompatibility(input);
  }, [isPro, isWorker, currentUser, job, distance]);

  const badgeColor = compatibilityScore
    ? getScoreBadgeColor(compatibilityScore.totalScore)
    : null;

  return (
    <Link href={`/dashboard/jobs/${job.id}`}>
      <Card className="hover:shadow-lg transition-all duration-200 border border-gray-200 hover:border-krewup-blue cursor-pointer relative">
        <CardContent className="p-4">
          {/* Compatibility Badge - Pro Workers Only */}
          {isPro && isWorker && compatibilityScore && badgeColor && (
            <div className="absolute top-2 right-2 z-10">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${badgeColor.bg} ${badgeColor.text} shadow-md`}>
                {compatibilityScore.totalScore}% Match
              </span>
            </div>
          )}

          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 space-y-2">
              {/* Title & Badges */}
              <div>
                <h3 className="text-lg font-bold text-gray-900 hover:text-krewup-blue transition-colors mb-1.5">
                  {job.title}
                </h3>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Badge variant="default" className="bg-krewup-blue text-white text-xs px-2 py-0.5">
                    {job.trade}
                  </Badge>
                  {job.sub_trade && (
                    <Badge variant="info" className="border-krewup-blue text-krewup-blue text-xs px-2 py-0.5">
                      {job.sub_trade}
                    </Badge>
                  )}
                  <Badge variant="default" className="text-xs px-2 py-0.5">{job.job_type}</Badge>
                  <Badge
                    variant={job.status === 'active' ? 'success' : job.status === 'filled' ? 'default' : 'warning'}
                    className="capitalize text-xs px-2 py-0.5"
                  >
                    {job.status}
                  </Badge>
                </div>
              </div>

              {/* Compact Info Line */}
              <div className="flex items-center gap-3 text-sm text-gray-600 flex-wrap">
                <span className="flex items-center gap-1">
                  📍 {job.location}
                  {distance !== null && (
                    <span className="text-krewup-orange font-semibold">({distanceText})</span>
                  )}
                </span>
                <span className="text-gray-400">•</span>
                <span>👤 {job.employer_name}</span>
                <span className="text-gray-400">•</span>
                <span>📅 {new Date(job.created_at).toLocaleDateString()}</span>
              </div>

              {/* Required Certifications */}
              {job.required_certs && job.required_certs.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1">
                  {job.required_certs.map((cert) => (
                    <Badge key={cert} variant="warning" className="text-xs px-1.5 py-0.5">
                      📜 {cert}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
