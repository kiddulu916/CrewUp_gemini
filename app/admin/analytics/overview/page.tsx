import React from 'react';
import { cookies } from 'next/headers';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { MetricCard } from '@/components/admin/metric-card';
import { FunnelChart } from '@/components/admin/funnel-chart';
import {
  getActiveUsers,
  getConversionFunnel,
  getSubscriptionMetrics,
  getOperationalLoad,
} from '@/features/admin/actions/analytics-actions';
import type { DateRangeValue } from '@/components/admin/date-range-picker';
import type { SegmentValue } from '@/components/admin/segment-filter';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type Props = {
  searchParams: {
    preset?: string;
    startDate?: string;
    endDate?: string;
    compareEnabled?: string;
    role?: string;
    subscription?: string;
    location?: string;
    employerType?: string;
  };
};

export default async function AnalyticsOverviewPage({ searchParams }: Props) {
  // Parse date range from searchParams
  const dateRange: DateRangeValue = {
    preset: (searchParams.preset as any) || 'last30days',
    startDate: searchParams.startDate ? new Date(searchParams.startDate) : undefined,
    endDate: searchParams.endDate ? new Date(searchParams.endDate) : undefined,
    compareEnabled: searchParams.compareEnabled === 'true',
  };

  // Parse segment filters from searchParams
  const segment: SegmentValue = {
    role: searchParams.role as any,
    subscription: searchParams.subscription as any,
    location: searchParams.location || null,
    employerType: searchParams.employerType as any,
  };

  // Fetch all analytics data in parallel
  const [activeUsers, conversionFunnel, subscriptionMetrics, operationalLoad] =
    await Promise.all([
      getActiveUsers(dateRange, segment),
      getConversionFunnel(dateRange, segment),
      getSubscriptionMetrics(dateRange),
      getOperationalLoad(dateRange),
    ]);

  // Use percentage changes from comparison data
  const dauChange = activeUsers.comparison?.dauChange || 0;
  const wauChange = activeUsers.comparison?.wauChange || 0;
  const mauChange = activeUsers.comparison?.mauChange || 0;

  // Use percentage changes from subscription comparison data
  const freeUsersChange = subscriptionMetrics.comparison?.freeUsersChange || 0;
  const proUsersChange = subscriptionMetrics.comparison?.proUsersChange || 0;
  const conversionRateChange = subscriptionMetrics.comparison?.conversionRateChange || 0;
  const mrrChange = subscriptionMetrics.comparison?.mrrChange || 0;

  return (
    <div className="space-y-6">
      {/* User Activity Metrics */}
      <section>
        <h2 className="text-2xl font-bold mb-4">User Activity Metrics</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <MetricCard
            title="Daily Active Users"
            value={activeUsers.dau}
            trend={
              dateRange.compareEnabled
                ? {
                    value: dauChange,
                    isPositive: dauChange >= 0,
                  }
                : undefined
            }
          />
          <MetricCard
            title="Weekly Active Users"
            value={activeUsers.wau}
            trend={
              dateRange.compareEnabled
                ? {
                    value: wauChange,
                    isPositive: wauChange >= 0,
                  }
                : undefined
            }
          />
          <MetricCard
            title="Monthly Active Users"
            value={activeUsers.mau}
            trend={
              dateRange.compareEnabled
                ? {
                    value: mauChange,
                    isPositive: mauChange >= 0,
                  }
                : undefined
            }
          />
        </div>
      </section>

      {/* Conversion Funnel */}
      <section>
        <Card>
          <CardHeader>
            <CardTitle>Conversion Funnel</CardTitle>
          </CardHeader>
          <CardContent>
            <FunnelChart stages={conversionFunnel} />
          </CardContent>
        </Card>
      </section>

      {/* Subscription Metrics */}
      <section>
        <h2 className="text-2xl font-bold mb-4">Subscription Metrics</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Free Users"
            value={subscriptionMetrics.freeUsers}
            trend={
              dateRange.compareEnabled
                ? {
                    value: freeUsersChange,
                    isPositive: freeUsersChange >= 0,
                  }
                : undefined
            }
          />
          <MetricCard
            title="Pro Users"
            value={subscriptionMetrics.proUsers}
            trend={
              dateRange.compareEnabled
                ? {
                    value: proUsersChange,
                    isPositive: proUsersChange >= 0,
                  }
                : undefined
            }
          />
          <MetricCard
            title="Conversion Rate"
            value={`${subscriptionMetrics.conversionRate.toFixed(1)}%`}
            trend={
              dateRange.compareEnabled
                ? {
                    value: conversionRateChange,
                    isPositive: conversionRateChange >= 0,
                  }
                : undefined
            }
          />
          <MetricCard
            title="MRR"
            value={`$${subscriptionMetrics.mrr.toLocaleString()}`}
            trend={
              dateRange.compareEnabled
                ? {
                    value: mrrChange,
                    isPositive: mrrChange >= 0,
                  }
                : undefined
            }
          />
        </div>
      </section>

      {/* Operational Load */}
      <section>
        <h2 className="text-2xl font-bold mb-4">Operational Load</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Pending Certifications"
            value={operationalLoad.pendingCertifications}
          />
          <MetricCard
            title="Avg Review Time"
            value={`${operationalLoad.avgCertificationReviewTime.toFixed(1)} hours`}
          />
          <MetricCard
            title="Moderation Backlog"
            value={operationalLoad.moderationQueueBacklog}
          />
          <MetricCard
            title="Avg Moderation Time"
            value={`${operationalLoad.avgModerationResolutionTime.toFixed(1)} hours`}
          />
        </div>

        {/* Weekly Trend Chart */}
        {operationalLoad.weeklyTrend.length > 0 && (
          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Weekly Trend - Pending Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {operationalLoad.weeklyTrend.map((day) => {
                  const totalPending = day.pendingCerts + day.pendingReports;
                  return (
                    <div key={day.date} className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">{day.date}</span>
                      <div className="flex items-center gap-2">
                        <div
                          className="bg-blue-500 h-4 rounded"
                          style={{ width: `${Math.min((totalPending / 30) * 100, 200)}px` }}
                        />
                        <span className="text-sm font-medium w-8">{totalPending}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  );
}
