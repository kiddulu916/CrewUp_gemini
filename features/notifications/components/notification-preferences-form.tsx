'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import {
  getNotificationPreferences,
  updateNotificationPreferences,
  resetNotificationPreferences,
  type NotificationPreferences,
} from '../actions/notification-preferences-actions';

export function NotificationPreferencesForm() {
  const router = useRouter();
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Load preferences on mount
  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    setLoading(true);
    const result = await getNotificationPreferences();
    if (result.success && result.data) {
      setPreferences(result.data);
    } else {
      setMessage({ type: 'error', text: result.error || 'Failed to load preferences' });
    }
    setLoading(false);
  };

  const handleToggle = (field: keyof NotificationPreferences, value: boolean) => {
    if (preferences) {
      setPreferences({ ...preferences, [field]: value });
    }
  };

  const handleDigestChange = (value: 'immediate' | 'daily' | 'weekly' | 'never') => {
    if (preferences) {
      setPreferences({ ...preferences, email_digest: value });
    }
  };

  const handleSave = async () => {
    if (!preferences) return;

    setSaving(true);
    setMessage(null);

    const result = await updateNotificationPreferences({
      application_status_changes: preferences.application_status_changes,
      new_applications: preferences.new_applications,
      new_messages: preferences.new_messages,
      job_matches: preferences.job_matches,
      endorsement_requests: preferences.endorsement_requests,
      profile_views: preferences.profile_views,
      email_notifications: preferences.email_notifications,
      email_digest: preferences.email_digest,
      push_notifications: preferences.push_notifications,
      desktop_notifications: preferences.desktop_notifications,
      notification_sound: preferences.notification_sound,
    });

    if (result.success) {
      setMessage({ type: 'success', text: 'Preferences saved successfully!' });
      setTimeout(() => setMessage(null), 3000);
    } else {
      setMessage({ type: 'error', text: result.error || 'Failed to save preferences' });
    }

    setSaving(false);
  };

  const handleReset = async () => {
    if (!confirm('Are you sure you want to reset all notification preferences to defaults?')) {
      return;
    }

    setSaving(true);
    setMessage(null);

    const result = await resetNotificationPreferences();

    if (result.success && result.data) {
      setPreferences(result.data);
      setMessage({ type: 'success', text: 'Preferences reset to defaults!' });
      setTimeout(() => setMessage(null), 3000);
    } else {
      setMessage({ type: 'error', text: result.error || 'Failed to reset preferences' });
    }

    setSaving(false);
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </Card>
    );
  }

  if (!preferences) {
    return (
      <Card className="p-6 text-center">
        <p className="text-gray-600 mb-4">Failed to load notification preferences</p>
        <Button onClick={loadPreferences}>Retry</Button>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Success/Error Message */}
      {message && (
        <div
          className={`p-4 rounded-lg ${
            message.type === 'success'
              ? 'bg-green-50 border border-green-200 text-green-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Notification Types */}
      <Card className="p-6">
        <h3 className="text-lg font-bold mb-4 text-gray-900">Notification Types</h3>
        <p className="text-sm text-gray-600 mb-6">
          Choose which events you want to be notified about
        </p>

        <div className="space-y-4">
          <ToggleRow
            label="Application Status Changes"
            description="When your job applications are viewed, accepted, or rejected"
            checked={preferences.application_status_changes}
            onChange={(checked) => handleToggle('application_status_changes', checked)}
          />
          <ToggleRow
            label="New Applications"
            description="When someone applies to your job postings (employers only)"
            checked={preferences.new_applications}
            onChange={(checked) => handleToggle('new_applications', checked)}
          />
          <ToggleRow
            label="New Messages"
            description="When you receive a new direct message"
            checked={preferences.new_messages}
            onChange={(checked) => handleToggle('new_messages', checked)}
          />
          <ToggleRow
            label="Job Matches"
            description="When new jobs match your skills and location"
            checked={preferences.job_matches}
            onChange={(checked) => handleToggle('job_matches', checked)}
          />
          <ToggleRow
            label="Endorsement Requests"
            description="When someone requests an endorsement from you"
            checked={preferences.endorsement_requests}
            onChange={(checked) => handleToggle('endorsement_requests', checked)}
          />
          <ToggleRow
            label="Profile Views"
            description="When someone views your profile (Pro feature)"
            checked={preferences.profile_views}
            onChange={(checked) => handleToggle('profile_views', checked)}
          />
        </div>
      </Card>

      {/* Delivery Channels */}
      <Card className="p-6">
        <h3 className="text-lg font-bold mb-4 text-gray-900">Delivery Channels</h3>
        <p className="text-sm text-gray-600 mb-6">
          Choose how you want to receive notifications
        </p>

        <div className="space-y-4">
          <ToggleRow
            label="Email Notifications"
            description="Receive notifications via email"
            checked={preferences.email_notifications}
            onChange={(checked) => handleToggle('email_notifications', checked)}
          />

          {/* Email Digest Frequency */}
          {preferences.email_notifications && (
            <div className="pl-12 space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Email Digest Frequency
              </label>
              <select
                value={preferences.email_digest}
                onChange={(e) => handleDigestChange(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="immediate">Immediate (as they happen)</option>
                <option value="daily">Daily digest</option>
                <option value="weekly">Weekly digest</option>
                <option value="never">Never send emails</option>
              </select>
            </div>
          )}

          <ToggleRow
            label="Push Notifications"
            description="Receive push notifications on your mobile device"
            checked={preferences.push_notifications}
            onChange={(checked) => handleToggle('push_notifications', checked)}
          />
          <ToggleRow
            label="Desktop Notifications"
            description="Show desktop notifications in your browser"
            checked={preferences.desktop_notifications}
            onChange={(checked) => handleToggle('desktop_notifications', checked)}
          />
          <ToggleRow
            label="Notification Sound"
            description="Play a sound when receiving notifications"
            checked={preferences.notification_sound}
            onChange={(checked) => handleToggle('notification_sound', checked)}
          />
        </div>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={handleReset} disabled={saving}>
          Reset to Defaults
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Preferences'}
        </Button>
      </div>
    </div>
  );
}

interface ToggleRowProps {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

function ToggleRow({ label, description, checked, onChange }: ToggleRowProps) {
  return (
    <div className="flex items-start justify-between py-3 border-b border-gray-100 last:border-0">
      <div className="flex-1">
        <div className="font-medium text-gray-900">{label}</div>
        <div className="text-sm text-gray-600">{description}</div>
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
          checked ? 'bg-blue-600' : 'bg-gray-200'
        }`}
        role="switch"
        aria-checked={checked}
      >
        <span
          aria-hidden="true"
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}
