import { createClient } from '@/lib/supabase/server';
import { MetricCard } from '@/components/admin/metric-card';
import { cookies } from 'next/headers';

 

export default async function AdminDashboardPage() {
  const supabase = await createClient(await cookies());

  // Fetch metrics
  const [
    { count: totalUsers },
    { count: activeJobs },
    { count: pendingCerts },
    { count: proSubs },
  ] = await Promise.all([
    supabase.from('users').select('*', { count: 'exact', head: true }),
    supabase
      .from('jobs')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'open'),
    supabase
      .from('certifications')
      .select('*', { count: 'exact', head: true })
      .eq('verification_status', 'pending'),
    supabase
      .from('subscriptions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active'),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-600 mt-2">Platform overview and key metrics</p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard title="Total Users" value={totalUsers || 0} icon="👥" />
        <MetricCard title="Active Jobs" value={activeJobs || 0} icon="💼" />
        <MetricCard
          title="Pending Certifications"
          value={pendingCerts || 0}
          subtitle="Awaiting review"
          icon="⏳"
          href="/admin/certifications"
        />
        <MetricCard title="Pro Subscribers" value={proSubs || 0} icon="⭐" />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <a
          href="/admin/certifications"
          className="p-6 bg-white rounded-lg border border-gray-200 hover:border-blue-500 hover:shadow-lg transition-all"
        >
          <h3 className="font-semibold text-lg mb-2">Review Certifications</h3>
          <p className="text-gray-600 text-sm">
            {pendingCerts || 0} certifications pending verification
          </p>
        </a>

        <a
          href="/admin/users"
          className="p-6 bg-white rounded-lg border border-gray-200 hover:border-blue-500 hover:shadow-lg transition-all"
        >
          <h3 className="font-semibold text-lg mb-2">Manage Users</h3>
          <p className="text-gray-600 text-sm">Search, view, and moderate user accounts</p>
        </a>

        <a
          href="/admin/monitoring"
          className="p-6 bg-white rounded-lg border border-gray-200 hover:border-blue-500 hover:shadow-lg transition-all"
        >
          <h3 className="font-semibold text-lg mb-2">View Errors</h3>
          <p className="text-gray-600 text-sm">Monitor platform health and errors</p>
        </a>

        <a
          href="/admin/ads"
          className="p-6 bg-white rounded-lg border border-gray-200 hover:border-orange-500 hover:shadow-lg transition-all"
        >
          <h3 className="font-semibold text-lg mb-2">📊 Ad Metrics</h3>
          <p className="text-gray-600 text-sm">View ad impressions, clicks, and revenue</p>
        </a>
      </div>
    </div>
  );
}
