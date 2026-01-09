'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { CandidatePipelineChart } from './candidate-pipeline-chart';
import { PipelineStageList } from './pipeline-stage-list';
import { getCandidatePipelineMetrics, getPipelineApplications } from '../actions/candidate-pipeline-actions';
import type { PipelineStage } from '../actions/candidate-pipeline-actions';

export function CandidatePipelineDashboard() {
  const router = useRouter();
  const [dateRange, setDateRange] = useState<'7d' | '30d' | 'all'>('30d');
  const [selectedStage, setSelectedStage] = useState<PipelineStage | 'all'>('all');

  // Fetch pipeline metrics
  const { data: metricsData, isLoading: metricsLoading } = useQuery({
    queryKey: ['candidate-pipeline-metrics', dateRange],
    queryFn: async () => {
      const result = await getCandidatePipelineMetrics(dateRange);
      if (!result.success) throw new Error(result.error);
      return result.data!;
    },
    staleTime: 60000, // 1 minute
  });

  // Fetch applications for selected stage
  const { data: applicationsData, isLoading: applicationsLoading } = useQuery({
    queryKey: ['pipeline-applications', selectedStage, dateRange],
    queryFn: async () => {
      const result = await getPipelineApplications(selectedStage, dateRange);
      if (!result.success) throw new Error(result.error);
      return result.data!;
    },
    staleTime: 60000,
  });

  if (metricsLoading) {
    return (
      <div className="space-y-6">
        <Card className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-gray-200 rounded w-1/3"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </Card>
      </div>
    );
  }

  if (!metricsData) {
    return (
      <Card className="p-6 text-center">
        <p className="text-gray-600 mb-4">No pipeline data available</p>
        <Button onClick={() => router.push('/dashboard/jobs/new')}>
          Post Your First Job
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Date Range Filter */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Candidate Pipeline</h2>
        <div className="flex gap-2">
          <Button
            variant={dateRange === '7d' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setDateRange('7d')}
          >
            Last 7 Days
          </Button>
          <Button
            variant={dateRange === '30d' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setDateRange('30d')}
          >
            Last 30 Days
          </Button>
          <Button
            variant={dateRange === 'all' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setDateRange('all')}
          >
            All Time
          </Button>
        </div>
      </div>

      {/* Pipeline Funnel Chart */}
      <CandidatePipelineChart metrics={metricsData} />

      {/* Stage Breakdown Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="text-sm text-gray-600 mb-1">Pending</div>
          <div className="text-2xl font-bold text-gray-900">{metricsData.pending}</div>
          <div className="text-xs text-gray-500 mt-1">Awaiting review</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-gray-600 mb-1">Viewed</div>
          <div className="text-2xl font-bold text-gray-900">{metricsData.viewed}</div>
          <div className="text-xs text-gray-500 mt-1">Profiles reviewed</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-gray-600 mb-1">Contacted</div>
          <div className="text-2xl font-bold text-gray-900">{metricsData.contacted}</div>
          <div className="text-xs text-gray-500 mt-1">In discussion</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-gray-600 mb-1">Hired</div>
          <div className="text-2xl font-bold text-green-600">{metricsData.hired}</div>
          <div className="text-xs text-gray-500 mt-1">Successful hires</div>
        </Card>
      </div>

      {/* Stage Conversion Rates */}
      <Card className="p-6">
        <h3 className="text-lg font-bold mb-4">Stage Conversion Rates</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-600">Applied → Viewed</span>
              <span className="text-lg font-bold text-gray-900">
                {metricsData.stageConversionRates.pendingToViewed}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full"
                style={{ width: `${metricsData.stageConversionRates.pendingToViewed}%` }}
              />
            </div>
          </div>
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-600">Viewed → Contacted</span>
              <span className="text-lg font-bold text-gray-900">
                {metricsData.stageConversionRates.viewedToContacted}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-purple-500 h-2 rounded-full"
                style={{ width: `${metricsData.stageConversionRates.viewedToContacted}%` }}
              />
            </div>
          </div>
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-600">Contacted → Hired</span>
              <span className="text-lg font-bold text-gray-900">
                {metricsData.stageConversionRates.contactedToHired}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-green-500 h-2 rounded-full"
                style={{ width: `${metricsData.stageConversionRates.contactedToHired}%` }}
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Application List by Stage */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold">Applications by Stage</h3>
          <div className="flex gap-2">
            <Button
              variant={selectedStage === 'all' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setSelectedStage('all')}
            >
              All
            </Button>
            <Button
              variant={selectedStage === 'pending' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setSelectedStage('pending')}
            >
              Pending ({metricsData.pending})
            </Button>
            <Button
              variant={selectedStage === 'viewed' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setSelectedStage('viewed')}
            >
              Viewed ({metricsData.viewed})
            </Button>
            <Button
              variant={selectedStage === 'contacted' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setSelectedStage('contacted')}
            >
              Contacted ({metricsData.contacted})
            </Button>
            <Button
              variant={selectedStage === 'hired' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setSelectedStage('hired')}
            >
              Hired ({metricsData.hired})
            </Button>
          </div>
        </div>

        <PipelineStageList
          applications={applicationsData || []}
          isLoading={applicationsLoading}
        />
      </Card>
    </div>
  );
}
