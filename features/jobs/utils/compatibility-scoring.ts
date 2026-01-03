import type { CompatibilityScore, CompatibilityInput } from '../types/compatibility';

/**
 * Calculate Trade/Sub-trade Match Score (0-30 points)
 */
function calculateTradeScore(
  jobTrade: string,
  jobSubTrade: string | null,
  workerTrade: string,
  workerSubTrade: string | null
): number {
  const jobTradeNorm = jobTrade.toLowerCase().trim();
  const workerTradeNorm = workerTrade.toLowerCase().trim();
  const jobSubTradeNorm = jobSubTrade?.toLowerCase().trim() || null;
  const workerSubTradeNorm = workerSubTrade?.toLowerCase().trim() || null;

  // Exact trade + sub-trade match
  if (jobTradeNorm === workerTradeNorm &&
      jobSubTradeNorm &&
      workerSubTradeNorm &&
      jobSubTradeNorm === workerSubTradeNorm) {
    return 30;
  }

  // Trade match, different or missing sub-trade
  if (jobTradeNorm === workerTradeNorm) {
    return 20;
  }

  // Related trades (simple heuristic - contains similar keywords)
  // This is a basic implementation - can be enhanced with a mapping table
  const relatedTrades: Record<string, string[]> = {
    'electrical': ['electrician', 'electric', 'electrical'],
    'plumbing': ['plumber', 'plumbing', 'pipefitter'],
    'carpentry': ['carpenter', 'carpentry', 'framing', 'framer'],
    'hvac': ['hvac', 'heating', 'cooling', 'air conditioning'],
  };

  for (const [key, variations] of Object.entries(relatedTrades)) {
    const jobInGroup = variations.some(v => jobTradeNorm.includes(v));
    const workerInGroup = variations.some(v => workerTradeNorm.includes(v));
    if (jobInGroup && workerInGroup) {
      return 10;
    }
  }

  return 0;
}

/**
 * Calculate Certifications Match Score (0-30 points)
 */
function calculateCertScore(
  requiredCerts: string[],
  workerCerts: string[]
): { score: number; gaps: string[] } {
  if (requiredCerts.length === 0) {
    // No certifications required - full score
    return { score: 30, gaps: [] };
  }

  const requiredSet = new Set(requiredCerts.map(c => c.toLowerCase().trim()));
  const workerSet = new Set(workerCerts.map(c => c.toLowerCase().trim()));

  const matches = [...requiredSet].filter(cert => workerSet.has(cert));
  const gaps = [...requiredSet].filter(cert => !workerSet.has(cert));

  const matchPercentage = matches.length / requiredCerts.length;
  const score = Math.round(matchPercentage * 30);

  return { score, gaps };
}

/**
 * Calculate Distance Match Score (0-20 points)
 */
function calculateDistanceScore(distanceMiles: number): number {
  if (distanceMiles <= 10) return 20;
  if (distanceMiles <= 25) return 15;
  if (distanceMiles <= 50) return 10;
  if (distanceMiles <= 100) return 5;
  return 2;
}

/**
 * Calculate Experience Match Score (0-20 points)
 */
function calculateExperienceScore(
  requiredYears: number | null,
  workerYears: number
): number {
  if (!requiredYears || requiredYears === 0) {
    // No experience requirement - full score
    return 20;
  }

  const percentage = workerYears / requiredYears;

  if (percentage >= 1.0) return 20;
  if (percentage >= 0.75) return 15;
  if (percentage >= 0.5) return 10;
  if (percentage > 0) return 5;
  return 0;
}

/**
 * Main compatibility scoring function
 */
export function calculateCompatibility(input: CompatibilityInput): CompatibilityScore {
  const { job, worker, workerCerts, workerExperience, distance } = input;

  // Calculate individual scores
  const tradeMatch = calculateTradeScore(
    job.trade,
    job.sub_trade,
    worker.trade,
    worker.sub_trade
  );

  const { score: certMatch, gaps: certGaps } = calculateCertScore(
    job.required_certifications || [],
    workerCerts
  );

  const distanceMatch = calculateDistanceScore(distance);

  const experienceMatch = calculateExperienceScore(
    job.years_experience_required,
    workerExperience
  );

  // Calculate total score
  const totalScore = tradeMatch + certMatch + distanceMatch + experienceMatch;

  return {
    totalScore,
    breakdown: {
      tradeMatch,
      certMatch,
      distanceMatch,
      experienceMatch,
    },
    gaps: certGaps,
    isPerfectMatch: totalScore >= 90,
  };
}

/**
 * Get badge color based on score
 */
export function getScoreBadgeColor(score: number): {
  bg: string;
  text: string;
  label: string;
} {
  if (score >= 90) {
    return { bg: 'bg-green-100', text: 'text-green-700', label: 'Perfect' };
  }
  if (score >= 75) {
    return { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Great' };
  }
  if (score >= 60) {
    return { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Good' };
  }
  return { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Fair' };
}
