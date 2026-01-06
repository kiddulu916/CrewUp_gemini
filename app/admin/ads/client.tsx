'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  LineChart,
  Line,
} from 'recharts';
import { MousePointerClick, Eye, TrendingUp } from 'lucide-react';

type ChartDataPoint = {
  date: string;
  impressions: number;
  clicks: number;
};

type PlacementMetrics = Record<string, { impressions: number; clicks: number }>;

type Props = {
  chartData: ChartDataPoint[];
  placementMetrics: PlacementMetrics;
};

const PLACEMENT_LABELS: Record<string, string> = {
  'job-feed-banner': 'Job Feed Banner',
  'job-feed-in-feed': 'In-Feed Ads',
  'profile-sidebar': 'Profile Sidebar',
  'search-results': 'Search Results',
  'messages-sidebar': 'Messages Sidebar',
  'dashboard-footer': 'Dashboard Footer',
};

export function AdMetricsClient({ chartData, placementMetrics }: Props) {
  // Format date for display
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Prepare placement data for chart
  const placementData = Object.entries(placementMetrics).map(([placement, metrics]) => ({
    name: PLACEMENT_LABELS[placement] || placement,
    impressions: metrics.impressions,
    clicks: metrics.clicks,
    ctr: metrics.impressions > 0 
      ? ((metrics.clicks / metrics.impressions) * 100).toFixed(2) 
      : '0',
  }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Daily Impressions Chart */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-600" />
            Daily Performance (Last 7 Days)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {chartData.length > 0 ? (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData.map(d => ({ ...d, date: formatDate(d.date) }))}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="impressions" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    name="Impressions"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="clicks" 
                    stroke="#f97316" 
                    strokeWidth={2}
                    name="Clicks"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-80 flex items-center justify-center text-gray-400">
              No data available yet. Start showing ads to collect metrics.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Impressions by Placement */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5 text-purple-600" />
            Impressions by Placement
          </CardTitle>
        </CardHeader>
        <CardContent>
          {placementData.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={placementData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={120} />
                  <Tooltip />
                  <Bar dataKey="impressions" fill="#8b5cf6" name="Impressions" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-400">
              No data available
            </div>
          )}
        </CardContent>
      </Card>

      {/* CTR by Placement */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MousePointerClick className="h-5 w-5 text-green-600" />
            Click-Through Rate by Placement
          </CardTitle>
        </CardHeader>
        <CardContent>
          {placementData.length > 0 ? (
            <div className="space-y-4">
              {placementData.map((placement) => (
                <div key={placement.name} className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{placement.name}</p>
                    <div className="mt-1 h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-green-400 to-green-600 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(parseFloat(placement.ctr) * 10, 100)}%` }}
                      />
                    </div>
                  </div>
                  <div className="ml-4 text-right">
                    <p className="text-lg font-bold text-green-600">{placement.ctr}%</p>
                    <p className="text-xs text-gray-400">
                      {placement.clicks} / {placement.impressions}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-400">
              No data available
            </div>
          )}
        </CardContent>
      </Card>

      {/* Ad Configuration Status */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Configuration Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-blue-50 border border-blue-100">
              <p className="text-sm font-medium text-blue-800">Provider</p>
              <p className="text-lg font-bold text-blue-900 mt-1">
                {process.env.NEXT_PUBLIC_AD_PROVIDER || 'Google AdSense'}
              </p>
            </div>
            <div className="p-4 rounded-lg bg-green-50 border border-green-100">
              <p className="text-sm font-medium text-green-800">Status</p>
              <p className="text-lg font-bold text-green-900 mt-1">
                {process.env.NEXT_PUBLIC_ADS_ENABLED === 'true' ? '✅ Enabled' : '⏸️ Disabled'}
              </p>
            </div>
            <div className="p-4 rounded-lg bg-orange-50 border border-orange-100">
              <p className="text-sm font-medium text-orange-800">In-Feed Frequency</p>
              <p className="text-lg font-bold text-orange-900 mt-1">
                Every 5 items
              </p>
            </div>
          </div>
          
          <div className="mt-6 p-4 rounded-lg bg-gray-50 border border-gray-200">
            <p className="text-sm font-medium text-gray-700 mb-2">Environment Variables</p>
            <code className="text-xs text-gray-600 block">
              NEXT_PUBLIC_ADS_ENABLED={process.env.NEXT_PUBLIC_ADS_ENABLED || 'false'}<br/>
              NEXT_PUBLIC_AD_PROVIDER={process.env.NEXT_PUBLIC_AD_PROVIDER || 'adsense'}<br/>
              NEXT_PUBLIC_ADSENSE_CLIENT_ID={process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID ? '***configured***' : 'not set'}
            </code>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

