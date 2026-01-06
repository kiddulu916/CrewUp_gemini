'use client';

import React from 'react';
import { useIsPro } from '@/features/subscriptions/hooks/use-subscription';
import { useIsWorker } from '@/features/auth/hooks/use-auth';
import { calculateCompatibility } from '../utils/compatibility-scoring';
import { CompatibilityBreakdown } from './compatibility-breakdown';
import type { CompatibilityInput } from '../types/compatibility';
import type { Certification } from '@/lib/types/profile.types';

interface CompatibilityBreakdownWrapperProps {
  job: {
    trade: string;
    sub_trade: string | null;
    required_certs?: string[];
    location: string;
    coords?: any;
  };
  currentUser: {
    trade?: string | null;
    sub_trade?: string | null;
    location?: string | null;
    coords?: any;
    years_of_experience?: number | null;
    certifications?: Certification[];
  } | null;
  distance: number | null;
}

export function CompatibilityBreakdownWrapper({
  job,
  currentUser,
  distance
}: CompatibilityBreakdownWrapperProps) {
  const isPro = useIsPro();
  const isWorker = useIsWorker();

  const compatibilityScore = React.useMemo(() => {
    if (!isPro || !isWorker || !currentUser) return null;

    const input: CompatibilityInput = {
      job: {
        trade: job.trade,
        sub_trade: job.sub_trade,
        required_certifications: job.required_certs || [],
        years_experience_required: null, // Field doesn't exist yet
        location: job.location,
        coords: job.coords,
      },
      worker: {
        trade: currentUser.trade || '',
        sub_trade: currentUser.sub_trade || null,
        location: currentUser.location || '',
        coords: currentUser.coords,
      },
      workerCerts: (currentUser.certifications || []).map(c => c.certification_type || c.name).filter((c): c is string => Boolean(c)),
      workerExperience: currentUser.years_of_experience || 0,
      distance: distance !== null ? distance : 999,
    };

    return calculateCompatibility(input);
  }, [isPro, isWorker, currentUser, job, distance]);

  if (!compatibilityScore) return null;

  return <CompatibilityBreakdown score={compatibilityScore} />;
}
