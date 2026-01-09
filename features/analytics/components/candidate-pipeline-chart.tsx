'use client';

import { Card } from '@/components/ui/card';
import type { PipelineMetrics } from '../actions/candidate-pipeline-actions';

interface CandidatePipelineChartProps {
  metrics: PipelineMetrics;
}

export function CandidatePipelineChart({ metrics }: CandidatePipelineChartProps) {
  const stages = [
    { label: 'Applied', count: metrics.totalApplications, color: 'bg-blue-500' },
    { label: 'Viewed', count: metrics.viewed + metrics.contacted + metrics.hired, color: 'bg-purple-500' },
    { label: 'Contacted', count: metrics.contacted + metrics.hired, color: 'bg-orange-500' },
    { label: 'Hired', count: metrics.hired, color: 'bg-green-500' },
  ];

  const maxCount = metrics.totalApplications || 1;

  return (
    <Card className="p-6">
      <h3 className="text-lg font-bold mb-6">Application Funnel</h3>

      <div className="space-y-4">
        {stages.map((stage, idx) => {
          const widthPercentage = (stage.count / maxCount) * 100;
          const conversionRate = idx > 0
            ? ((stage.count / stages[idx - 1].count) * 100).toFixed(1)
            : '100.0';

          return (
            <div key={stage.label}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-700">{stage.label}</span>
                  <span className="text-sm text-gray-500">
                    ({stage.count} candidate{stage.count !== 1 ? 's' : ''})
                  </span>
                </div>
                {idx > 0 && (
                  <span className="text-sm text-gray-600">
                    {conversionRate}% converted
                  </span>
                )}
              </div>

              <div className="relative">
                <div className="w-full bg-gray-200 rounded-lg h-12 flex items-center">
                  <div
                    className={`${stage.color} h-12 rounded-lg transition-all duration-500 flex items-center justify-center`}
                    style={{ width: `${Math.max(widthPercentage, 5)}%` }}
                  >
                    {stage.count > 0 && (
                      <span className="text-white font-bold text-sm px-2">
                        {stage.count}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Drop-off indicator */}
              {idx < stages.length - 1 && (
                <div className="flex items-center justify-center my-2">
                  <div className="text-gray-400 text-sm flex items-center gap-1">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                    <span>{stages[idx].count - stage.count} dropped</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Summary Stats */}
      <div className="mt-6 pt-6 border-t grid grid-cols-2 gap-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900">
            {metrics.conversionRate}%
          </div>
          <div className="text-sm text-gray-600">Hire Rate</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900">
            {metrics.averageTimeToHire ? `${metrics.averageTimeToHire}d` : 'N/A'}
          </div>
          <div className="text-sm text-gray-600">Avg. Time to Hire</div>
        </div>
      </div>
    </Card>
  );
}
