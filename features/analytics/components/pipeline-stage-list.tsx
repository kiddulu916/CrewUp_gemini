'use client';

import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import type { ApplicationWithMetrics } from '../actions/candidate-pipeline-actions';

interface PipelineStageListProps {
  applications: ApplicationWithMetrics[];
  isLoading?: boolean;
}

export function PipelineStageList({ applications, isLoading }: PipelineStageListProps) {
  const router = useRouter();

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse h-16 bg-gray-200 rounded-lg"></div>
        ))}
      </div>
    );
  }

  if (applications.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No applications in this stage</p>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-gray-100 text-gray-700';
      case 'viewed':
        return 'bg-blue-100 text-blue-700';
      case 'contacted':
        return 'bg-purple-100 text-purple-700';
      case 'hired':
        return 'bg-green-100 text-green-700';
      case 'rejected':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="space-y-3">
      {applications.map((app) => (
        <div
          key={app.id}
          className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
          onClick={() => router.push(`/dashboard/applications/${app.id}`)}
        >
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-semibold text-gray-900">{app.applicant_name}</h4>
              <Badge className={`text-xs ${getStatusColor(app.status)}`}>
                {app.status}
              </Badge>
            </div>
            <p className="text-sm text-gray-600">Applied to: {app.job_title}</p>
            <p className="text-xs text-gray-500 mt-1">
              Applied {new Date(app.created_at).toLocaleDateString()}
            </p>
          </div>

          <div className="text-right">
            <div className="text-sm font-semibold text-gray-700">
              {app.time_in_stage_days}d
            </div>
            <div className="text-xs text-gray-500">in {app.status}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
