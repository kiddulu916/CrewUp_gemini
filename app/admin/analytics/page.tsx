import { getUserGrowthData, getEngagementMetrics } from '@/features/admin/actions/analytics-actions';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui';
import { LazyUserGrowthChart } from '@/components/admin/lazy-charts';
import { MetricCard } from '@/components/admin/metric-card';

export default async function AnalyticsPage() {
  const [growthData, metrics] = await Promise.all([
    getUserGrowthData(),
    getEngagementMetrics(),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Analytics</h1>
        <p className="text-gray-600 mt-2">Platform insights and trends</p>
      </div>

      {/* Engagement Metrics */}
      <div className="grid grid-cols-3 gap-6">
        <MetricCard title="Total Jobs" value={metrics.jobs || 0} icon="💼" />
        <MetricCard title="Applications" value={metrics.apps || 0} icon="📝" />
        <MetricCard title="Messages" value={metrics.messages || 0} icon="💬" />
      </div>

      {/* User Growth Chart */}
      <Card>
        <CardHeader>
          <CardTitle>User Growth</CardTitle>
        </CardHeader>
        <CardContent>
          <LazyUserGrowthChart data={growthData} />
        </CardContent>
      </Card>
    </div>
  );
}
