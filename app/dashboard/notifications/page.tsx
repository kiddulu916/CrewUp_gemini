import { NotificationList } from '@/features/notifications/components/notification-list';

      

export default function NotificationsPage() {
  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Notifications</h1>
        <p className="text-gray-600 mt-2">
          Stay updated with job alerts, application updates, and messages.
        </p>
      </div>

      <NotificationList />
    </div>
  );
}
