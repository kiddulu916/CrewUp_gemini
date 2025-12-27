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

      {/* Future Settings Sections */}
      <Card>
        <CardHeader>
          <CardTitle>Notification Preferences</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600">
            Additional notification settings coming soon...
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
