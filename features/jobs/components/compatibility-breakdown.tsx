// features/jobs/components/compatibility-breakdown.tsx
'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import type { CompatibilityScore } from '../types/compatibility';
import { getScoreBadgeColor } from '../utils/compatibility-scoring';

interface CompatibilityBreakdownProps {
  score: CompatibilityScore;
}

export function CompatibilityBreakdown({ score }: CompatibilityBreakdownProps) {
  const router = useRouter();
  const badgeColor = getScoreBadgeColor(score.totalScore);

  return (
    <Card className="p-6">
      <h3 className="text-xl font-bold mb-4">Your Compatibility</h3>

      {/* Overall Score */}
      <div className="flex items-center justify-center mb-6">
        <div className="relative w-32 h-32">
          {/* Simple percentage ring - can be enhanced with circular progress */}
          <div className={`w-full h-full rounded-full ${badgeColor.bg} flex items-center justify-center`}>
            <div className="text-center">
              <div className={`text-3xl font-bold ${badgeColor.text}`}>
                {score.totalScore}%
              </div>
              <div className={`text-sm ${badgeColor.text}`}>
                {badgeColor.label}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Breakdown */}
      <div className="space-y-3 mb-6">
        <ScoreBar
          label="Trade Match"
          score={score.breakdown.tradeMatch}
          maxScore={30}
          color="blue"
        />
        <ScoreBar
          label="Experience"
          score={score.breakdown.experienceMatch}
          maxScore={30}
          color="orange"
        />
        <ScoreBar
          label="Distance"
          score={score.breakdown.distanceMatch}
          maxScore={20}
          color="purple"
        />
        <ScoreBar
          label="Certifications"
          score={score.breakdown.certMatch}
          maxScore={20}
          color="green"
        />
      </div>

      {/* Missing Certifications */}
      {score.gaps.length > 0 && (
        <div className="border-t pt-4">
          <h4 className="font-semibold mb-2 text-gray-700">What You're Missing</h4>
          <ul className="space-y-1 mb-4">
            {score.gaps.map((cert, idx) => (
              <li key={idx} className="text-sm text-gray-600 flex items-start">
                <span className="text-red-500 mr-2">•</span>
                <span className="capitalize">{cert}</span>
              </li>
            ))}
          </ul>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push('/dashboard/profile/certifications')}
          >
            Add Certifications
          </Button>
        </div>
      )}

      {/* Perfect Match Message */}
      {score.isPerfectMatch && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
          <p className="text-green-800 font-semibold">
            🎯 Perfect Match! You meet all requirements for this job.
          </p>
        </div>
      )}
    </Card>
  );
}

interface ScoreBarProps {
  label: string;
  score: number;
  maxScore: number;
  color: 'blue' | 'green' | 'purple' | 'orange';
}

function ScoreBar({ label, score, maxScore, color }: ScoreBarProps) {
  const percentage = (score / maxScore) * 100;

  const colorClasses = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    purple: 'bg-purple-500',
    orange: 'bg-orange-500',
  };

  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="font-medium text-gray-700">{label}</span>
        <span className="text-gray-600">{score}/{maxScore}</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={`${colorClasses[color]} h-2 rounded-full transition-all duration-300`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
