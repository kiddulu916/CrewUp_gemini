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
      <Card className="hover:shadow-xl transition-all duration-300 border-2 border-gray-200 hover:border-krewup-blue cursor-pointer">
        <CardContent className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-3">
              {/* Title & Trade */}
              <div>
                <h3 className="text-xl font-bold text-gray-900 group-hover:text-krewup-blue transition-colors mb-1">
                  {job.title}
                </h3>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="default" className="bg-krewup-blue text-white">
                    {job.trade}
                  </Badge>
                  {job.sub_trade && (
                    <Badge variant="info" className="border-krewup-blue text-krewup-blue">
                      {job.sub_trade}
                    </Badge>
                  )}
                  <Badge variant="default">{job.job_type}</Badge>
                </div>
              </div>

              {/* Details Grid */}
              <div className="grid md:grid-cols-2 gap-3">
                <div>
                  <p className="text-sm text-gray-500">Location</p>
                  <p className="text-base font-medium text-gray-900">{job.location}</p>
                  {distance !== null && (
                    <p className="text-sm text-krewup-orange font-semibold">{distanceText}</p>
                  )}
                </div>

                <div>
                  <p className="text-sm text-gray-500">Pay Rate</p>
                  <p className="text-lg font-bold text-krewup-orange">{job.pay_rate}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-500">Posted By</p>
                  <p className="text-base text-gray-900">{job.employer_name}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-500">Posted</p>
                  <p className="text-base text-gray-900">
                    {new Date(job.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* Required Certifications */}
              {job.required_certs && job.required_certs.length > 0 && (
                <div>
                  <p className="text-sm text-gray-500 mb-2">Required Certifications</p>
                  <div className="flex flex-wrap gap-2">
                    {job.required_certs.map((cert) => (
                      <Badge key={cert} variant="warning" className="text-xs">
                        📜 {cert}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Status Badge */}
            <div>
              <Badge
                variant={
                  job.status === 'active'
                    ? 'success'
                    : job.status === 'filled'
                    ? 'default'
                    : 'warning'
                }
                className="capitalize"
              >
                {job.status}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
