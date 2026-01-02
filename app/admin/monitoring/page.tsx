import { Suspense } from 'react';
import { Card, CardHeader, CardTitle, CardContent, LoadingSpinner } from '@/components/ui';
import { MetricCard } from '@/components/admin/metric-card';
import { ErrorRateChart } from '@/components/admin/error-rate-chart';
import { SegmentFilter } from '@/components/admin/segment-filter';
import type { SegmentValue } from '@/components/admin/segment-filter';
import {
  getRecentIssues,
  getErrorRateData,
  getSystemHealth,
  getSentryStats,
} from '@/features/admin/actions/sentry-actions';



function getStatusColor(status: string) {
  switch (status) {
    case 'healthy':
      return 'text-green-600 bg-green-100';
    case 'degraded':
      return 'text-yellow-600 bg-yellow-100';
    case 'critical':
      return 'text-red-600 bg-red-100';
    default:
      return 'text-gray-600 bg-gray-100';
  }
}

function getLevelColor(level: string) {
  switch (level) {
    case 'fatal':
      return 'bg-red-600 text-white';
    case 'error':
      return 'bg-red-500 text-white';
    case 'warning':
      return 'bg-yellow-500 text-white';
    default:
      return 'bg-gray-500 text-white';
  }
}

type MonitoringContentProps = {
  role?: 'worker' | 'employer';
  subscription?: 'free' | 'pro';
};

async function MonitoringContent({ role, subscription }: MonitoringContentProps) {
  const [health, issues, errorRateData, stats] = await Promise.all([
    getSystemHealth(role, subscription),
    getRecentIssues(10, role, subscription),
    getErrorRateData(),
    getSentryStats(),
  ]);

  return (
    <>
      {/* System Health Status */}
      <Card>
        <CardHeader>
          <CardTitle>System Health</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div
              className={`px-4 py-2 rounded-lg font-semibold ${getStatusColor(health.status)}`}
            >
              {health.status.toUpperCase()}
            </div>
            <p className="text-gray-700">{health.message}</p>
          </div>

          {!health.sentryConfigured && (
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                <strong>Note:</strong> Sentry monitoring is not fully configured. Add{' '}
                <code className="bg-yellow-100 px-1 py-0.5 rounded">SENTRY_AUTH_TOKEN</code> to
                your environment variables to enable full monitoring capabilities.
              </p>
              <p className="text-sm text-yellow-700 mt-2">
                Get your auth token from:{' '}
                <a
                  href="https://sentry.io/settings/account/api/auth-tokens/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-yellow-900"
                >
                  https://sentry.io/settings/account/api/auth-tokens/
                </a>
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard
          title="Error Rate (7d avg)"
          value={health.errorRate}
          subtitle="errors per day"
          icon="📉"
        />
        <MetricCard
          title="Active Issues"
          value={health.activeIssues}
          subtitle="unresolved"
          icon="🔥"
        />
        <MetricCard
          title="Resolved Today"
          value={health.resolvedToday}
          subtitle="issues closed"
          icon="✅"
        />
      </div>

      {/* Error Rate Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Error Rate Trend (14 Days)</CardTitle>
        </CardHeader>
        <CardContent>
          {errorRateData.length > 0 ? (
            <ErrorRateChart data={errorRateData} />
          ) : (
            <div className="h-[300px] flex items-center justify-center text-gray-500">
              No error data available
            </div>
          )}
        </CardContent>
      </Card>

      {/* Top Issues */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent Issues</CardTitle>
          {health.sentryConfigured && (
            <a
              href={`https://sentry.io/organizations/${process.env.NEXT_PUBLIC_SENTRY_ORG || 'your-org'}/issues/`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
            >
              View All in Sentry →
            </a>
          )}
        </CardHeader>
        <CardContent>
          {issues.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              {health.sentryConfigured
                ? 'No recent issues found. Great job!'
                : 'Configure Sentry to view error reports'}
            </div>
          ) : (
            <div className="space-y-4">
              {issues.map((issue) => (
                <div
                  key={issue.id}
                  className="p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span
                          className={`px-2 py-0.5 text-xs font-semibold rounded uppercase ${getLevelColor(issue.level)}`}
                        >
                          {issue.level}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(issue.lastSeen).toLocaleString()}
                        </span>
                      </div>
                      <h3 className="font-semibold text-gray-900 mb-1 truncate">
                        {issue.title}
                      </h3>
                      <p className="text-sm text-gray-600 truncate">{issue.culprit}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      <div className="text-right">
                        <div className="text-2xl font-bold text-gray-900">{issue.count}</div>
                        <div className="text-xs text-gray-500">events</div>
                      </div>
                      {issue.userCount > 0 && (
                        <div className="text-xs text-gray-600">{issue.userCount} users</div>
                      )}
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-4">
                    <a
                      href={issue.permalink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      View Details →
                    </a>
                    <span className="text-xs text-gray-400">
                      First seen: {new Date(issue.firstSeen).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sentry Project Stats (if available) */}
      {stats && (
        <Card>
          <CardHeader>
            <CardTitle>Sentry Statistics (24h)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-gray-900">{stats.received}</div>
                <div className="text-sm text-gray-600 mt-1">Received</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-gray-900">{stats.rejected}</div>
                <div className="text-sm text-gray-600 mt-1">Rejected</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-gray-900">{stats.blacklisted}</div>
                <div className="text-sm text-gray-600 mt-1">Blacklisted</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}

type PageProps = {
  searchParams: {
    role?: string;
    subscription?: string;
  };
};

export default function MonitoringPage({ searchParams }: PageProps) {
  // Parse segment filters from searchParams
  const segment: SegmentValue = {
    role: searchParams.role as any,
    subscription: searchParams.subscription as any,
    location: null,
    employerType: null,
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Monitoring Dashboard</h1>
        <p className="text-gray-600 mt-2">Error tracking and system health</p>
      </div>

      {/* Segment Filter */}
      <Card>
        <CardHeader>
          <CardTitle>Filter by User Segment</CardTitle>
        </CardHeader>
        <CardContent>
          <SegmentFilter
            value={segment}
            onChange={() => {}}
            showLocation={false}
            showEmployerType={false}
          />
          <p className="text-sm text-gray-500 mt-2">
            Filters errors by user role and subscription tier using Sentry tags
          </p>
        </CardContent>
      </Card>

      <Suspense
        fallback={
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner />
          </div>
        }
      >
        <MonitoringContent
          role={segment.role || undefined}
          subscription={segment.subscription || undefined}
        />
      </Suspense>
    </div>
  );
}
