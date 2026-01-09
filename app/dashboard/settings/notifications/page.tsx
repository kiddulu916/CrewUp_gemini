import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { NotificationPreferencesForm } from '@/features/notifications/components/notification-preferences-form';
import Link from 'next/link';

export const metadata = {
  title: 'Notification Settings | KrewUp',
  description: 'Manage your notification preferences',
};

export default async function NotificationSettingsPage() {
  const supabase = await createClient(await cookies());

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/dashboard/settings"
          className="text-sm text-blue-600 hover:text-blue-700 mb-2 inline-block"
        >
          ← Back to Settings
        </Link>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Notification Settings</h1>
        <p className="text-gray-600">
          Customize how and when you receive notifications from KrewUp
        </p>
      </div>

      {/* Notification Preferences Form */}
      <NotificationPreferencesForm />
    </div>
  );
}
