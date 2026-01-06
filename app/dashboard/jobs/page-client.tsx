'use client';

import { useState } from 'react';
import { JobCard } from '@/features/jobs/components/job-card';
import { JobFilters } from '@/features/jobs/components/job-filters';
import { useJobs } from '@/features/jobs/hooks/use-jobs';
import { useAutoUserLocation } from '@/hooks/use-user-location';
import { sortJobsByDistance } from '@/features/jobs/utils/distance';

      

type Job = {
  id: string;
  title: string;
  trade: string;
  sub_trade?: string | null;
  job_type: string;
  location: string;
  coords?: { lat: number; lng: number } | string | null;
  pay_rate: string;
  employer_name: string;
  required_certs?: string[];
  created_at: string;
  status: string;
};

export function JobsPageClient({ initialJobs }: { initialJobs: Job[] }) {
  const { location: userCoords } = useAutoUserLocation();
  const [filters, setFilters] = useState({ 
    trade: '', 
    subTrade: '', 
    jobType: '',
    maxDistance: '',
    minPay: ''
  });

  const { data: jobs, isLoading } = useJobs({
    trade: filters.trade || undefined,
    subTrade: filters.subTrade || undefined,
    jobType: filters.jobType || undefined,
    minPay: filters.minPay ? parseInt(filters.minPay, 10) : undefined,
  });

  const displayJobs: Job[] = (jobs as Job[]) || initialJobs;
  
  // 1. Sort by distance first (this also adds distance property to each job)
  let processedJobs = sortJobsByDistance(displayJobs, userCoords) as (Job & { distance?: number | null })[];

  // 2. Apply client-side distance filter if specified
  if (filters.maxDistance && userCoords) {
    const maxDist = parseFloat(filters.maxDistance);
    processedJobs = processedJobs.filter(job => 
      job.distance !== null && job.distance <= maxDist
    );
  }

  const sortedJobs = processedJobs;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Filters Sidebar */}
      <div className="lg:col-span-1">
        <div className="lg:sticky lg:top-6">
          <JobFilters 
            filters={filters} 
            onFilterChange={setFilters} 
            hasLocation={!!userCoords}
          />
        </div>
      </div>

      {/* Jobs List */}
      <div className="lg:col-span-3 space-y-3">
        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-krewup-blue border-r-transparent"></div>
            <p className="mt-2 text-sm text-gray-500">Loading jobs...</p>
          </div>
        ) : sortedJobs.length === 0 ? (
          <div className="text-center py-12">
            <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-gray-100 to-gray-200 mb-6">
              <span className="text-5xl">💼</span>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">No jobs found</h3>
            <p className="text-gray-600">
              {filters.trade || filters.subTrade || filters.jobType || filters.maxDistance || filters.minPay
                ? 'Try adjusting your filters to see more results'
                : 'No jobs are currently available'}
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">
                Showing {sortedJobs.length} job{sortedJobs.length !== 1 ? 's' : ''}
                {filters.trade && ` in ${filters.trade}`}
              </p>
              {userCoords && (
                <p className="text-sm text-gray-500">Sorted by distance from your location</p>
              )}
            </div>

            {sortedJobs.map((job) => (
              <JobCard key={job.id} job={job} userCoords={userCoords} />
            ))}
          </>
        )}
      </div>
    </div>
  );
}
