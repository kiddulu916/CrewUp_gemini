'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { ProximityAlertSettings } from '@/features/proximity-alerts/components/proximity-alert-settings';
import { BoostManager } from '@/features/subscriptions/components/boost-manager';

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="mt-2 text-gray-600">
          Manage your account preferences and notifications
        </p>
      </div>

      {/* Profile Boost */}
      <section>
        <BoostManager />
      </section>

      {/* Proximity Alerts */}
      <section>
        <ProximityAlertSettings />
      </section>

      {/* Notification Preferences */}
      <Card>
        <CardHeader>
          <CardTitle>Notification Preferences</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 mb-4">
            Customize how and when you receive notifications from KrewUp
          </p>
          <a
            href="/dashboard/settings/notifications"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Manage Notification Settings
          </a>
        </CardContent>
      </Card>
    </div>
  );
}
