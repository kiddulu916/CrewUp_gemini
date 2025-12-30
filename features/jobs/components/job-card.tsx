'use client';

import Link from 'next/link';
import { Badge, Card, CardContent } from '@/components/ui';
import { calculateDistance, formatDistance } from '../utils/distance';

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
};

export function JobCard({ job, userCoords }: JobCardProps) {
  const distance = calculateDistance(userCoords || null, job.coords || null);
  const distanceText = formatDistance(distance);

  return (
    <Link href={`/dashboard/jobs/${job.id}`}>
      <Card className="hover:shadow-lg transition-all duration-200 border border-gray-200 hover:border-krewup-blue cursor-pointer">
        <CardContent className="p-4">
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
