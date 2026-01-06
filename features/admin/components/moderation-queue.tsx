'use client';

import { useState } from 'react';
import { Card, CardContent, Badge } from '@/components/ui';
import Link from 'next/link';
import { ModerationReviewPanel } from './moderation-review-panel';
import { getFullName } from '@/lib/utils';

type ContentReport = {
  id: string;
  reporter_id: string;
  reported_content_type: string;
  reported_content_id: string;
  reported_user_id: string;
  reason: string;
  description: string;
  status: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  action_taken: string | null;
  admin_notes: string | null;
  created_at: string;
  reporter: {
    first_name: string;
    last_name: string;
    email: string;
  };
  reported_user: {
    first_name: string;
    last_name: string;
    email: string;
    user_id: string;
  };
  reviewed_by_profile?: {
    first_name: string;
    last_name: string;
  };
};

type Props = {
  reports: ContentReport[];
  currentStatus: string;
  counts: {
    all: number;
    pending: number;
    actioned: number;
    dismissed: number;
    reviewed: number;
  };
};

export function ModerationQueue({ reports, currentStatus, counts }: Props) {
  const [selectedReport, setSelectedReport] = useState<ContentReport | null>(null);

  const tabs = [
    { id: 'all', label: 'All', count: counts.all },
    { id: 'pending', label: 'Pending', count: counts.pending },
    { id: 'actioned', label: 'Actioned', count: counts.actioned },
    { id: 'dismissed', label: 'Dismissed', count: counts.dismissed },
    { id: 'reviewed', label: 'Reviewed', count: counts.reviewed },
  ];

  const getReasonBadgeVariant = (reason: string) => {
    switch (reason) {
      case 'spam':
        return 'warning';
      case 'inappropriate':
        return 'danger';
      case 'fraud':
        return 'danger';
      case 'harassment':
        return 'danger';
      default:
        return 'default';
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'pending':
        return 'warning';
      case 'actioned':
        return 'success';
      case 'dismissed':
        return 'default';
      case 'reviewed':
        return 'info';
      default:
        return 'default';
    }
  };

  const formatContentType = (type: string) => {
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  return (
    <div className="space-y-6">
      {/* Status Tabs */}
      <div className="flex gap-2 overflow-x-auto border-b">
        {tabs.map((tab) => (
          <Link
            key={tab.id}
            href={`/admin/moderation?status=${tab.id}`}
            className={`px-4 py-2 font-medium whitespace-nowrap border-b-2 transition-colors ${
              currentStatus === tab.id
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            {tab.label}
            <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-gray-100">
              {tab.count}
            </span>
          </Link>
        ))}
      </div>

      {/* Reports List */}
      {reports.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            No reports found
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {reports.map((report) => (
            <Card
              key={report.id}
              className="hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => setSelectedReport(report)}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-3">
                    {/* Header */}
                    <div className="flex items-center gap-3 flex-wrap">
                      <Badge variant={getReasonBadgeVariant(report.reason)}>
                        {report.reason}
                      </Badge>
                      <Badge variant="info">
                        {formatContentType(report.reported_content_type)}
                      </Badge>
                      <Badge variant={getStatusBadgeVariant(report.status)}>
                        {report.status}
                      </Badge>
                      <span className="text-sm text-gray-500">
                        {new Date(report.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    {/* Description */}
                    {report.description && (
                      <p className="text-gray-700">{report.description}</p>
                    )}

                    {/* Reporter and Reported User Info */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-gray-700">
                          Reporter:
                        </span>
                        <div className="text-gray-600">
                          {getFullName(report.reporter)}
                          <br />
                          <span className="text-xs">{report.reporter.email}</span>
                        </div>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">
                          Reported User:
                        </span>
                        <div className="text-gray-600">
                          {getFullName(report.reported_user)}
                          <br />
                          <span className="text-xs">
                            {report.reported_user.email}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Action Taken */}
                    {report.action_taken && (
                      <div className="pt-3 border-t">
                        <div className="flex items-start gap-2">
                          <span className="font-medium text-gray-700">
                            Action Taken:
                          </span>
                          <span className="text-gray-600">
                            {report.action_taken.replace(/_/g, ' ')}
                          </span>
                        </div>
                        {report.reviewed_by_profile && (
                          <div className="text-sm text-gray-500 mt-1">
                            by {getFullName(report.reviewed_by_profile)} on{' '}
                            {new Date(report.reviewed_at!).toLocaleDateString()}
                          </div>
                        )}
                        {report.admin_notes && (
                          <div className="mt-2 p-3 bg-gray-50 rounded text-sm text-gray-700">
                            <span className="font-medium">Admin Notes:</span>{' '}
                            {report.admin_notes}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Status Indicator */}
                  {report.status === 'pending' && (
                    <div className="flex-shrink-0">
                      <div className="w-3 h-3 bg-yellow-500 rounded-full animate-pulse" />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Review Panel Modal */}
      {selectedReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <ModerationReviewPanel
              report={selectedReport}
              onClose={() => setSelectedReport(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
