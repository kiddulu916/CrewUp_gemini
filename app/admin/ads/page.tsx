import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { redirect, notFound } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { AdMetricsClient } from './client';

export const metadata = {
  title: 'Ad Metrics - Admin | KrewUp',
  description: 'View ad performance metrics',
};

export default async function AdminAdsPage() {
  const supabase = await createClient(await cookies());

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Check if user is admin
  const { data: profile } = await supabase
    .from('users')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  if (!profile?.is_admin) {
    notFound();
  }

  // Get ad metrics for last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Get total impressions
  const { count: totalImpressions } = await supabase
    .from('ad_impressions')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', thirtyDaysAgo.toISOString());

  // Get total clicks
  const { count: totalClicks } = await supabase
    .from('ad_impressions')
    .select('*', { count: 'exact', head: true })
    .eq('clicked', true)
    .gte('created_at', thirtyDaysAgo.toISOString());

  // Get impressions by placement
  const { data: impressionsByPlacement } = await supabase
    .from('ad_impressions')
    .select('placement, clicked')
    .gte('created_at', thirtyDaysAgo.toISOString());

  // Calculate metrics by placement
  const placementMetrics: Record<string, { impressions: number; clicks: number }> = {};
  (impressionsByPlacement || []).forEach((row: any) => {
    if (!placementMetrics[row.placement]) {
      placementMetrics[row.placement] = { impressions: 0, clicks: 0 };
    }
    placementMetrics[row.placement].impressions++;
    if (row.clicked) {
      placementMetrics[row.placement].clicks++;
    }
  });

  // Get daily impressions for chart (last 7 days)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  const { data: dailyData } = await supabase
    .from('ad_impressions')
    .select('created_at, clicked')
    .gte('created_at', sevenDaysAgo.toISOString())
    .order('created_at', { ascending: true });

  // Group by day
  const dailyMetrics: Record<string, { date: string; impressions: number; clicks: number }> = {};
  (dailyData || []).forEach((row: any) => {
    const date = new Date(row.created_at).toISOString().split('T')[0];
    if (!dailyMetrics[date]) {
      dailyMetrics[date] = { date, impressions: 0, clicks: 0 };
    }
    dailyMetrics[date].impressions++;
    if (row.clicked) {
      dailyMetrics[date].clicks++;
    }
  });

  const chartData = Object.values(dailyMetrics).sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  // Calculate CTR
  const ctr = totalImpressions && totalClicks 
    ? ((totalClicks / totalImpressions) * 100).toFixed(2)
    : '0';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Ad Metrics</h1>
        <p className="mt-2 text-gray-600">
          Monitor ad performance and revenue metrics
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <p className="text-sm font-medium text-gray-500">Total Impressions</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">
              {(totalImpressions || 0).toLocaleString()}
            </p>
            <p className="text-xs text-gray-400 mt-1">Last 30 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <p className="text-sm font-medium text-gray-500">Total Clicks</p>
            <p className="text-3xl font-bold text-blue-600 mt-2">
              {(totalClicks || 0).toLocaleString()}
            </p>
            <p className="text-xs text-gray-400 mt-1">Last 30 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <p className="text-sm font-medium text-gray-500">Click-Through Rate</p>
            <p className="text-3xl font-bold text-green-600 mt-2">
              {ctr}%
            </p>
            <p className="text-xs text-gray-400 mt-1">Last 30 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <p className="text-sm font-medium text-gray-500">Est. Revenue</p>
            <p className="text-3xl font-bold text-orange-600 mt-2">
              ${((totalImpressions || 0) * 0.002).toFixed(2)}
            </p>
            <p className="text-xs text-gray-400 mt-1">Based on $2 CPM</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Details */}
      <AdMetricsClient 
        chartData={chartData}
        placementMetrics={placementMetrics}
      />
    </div>
  );
}

