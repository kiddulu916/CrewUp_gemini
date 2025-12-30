'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useNotifications } from '../hooks/use-notifications';
import { markNotificationAsRead, deleteNotification, markAllNotificationsAsRead } from '../actions/notification-actions';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { EmptyState } from '@/components/ui/empty-state';
import { useQueryClient } from '@tanstack/react-query';
import type { Notification } from '../actions/notification-actions';

export function NotificationList() {
  const { data: notifications, isLoading, error } = useNotifications();
  const queryClient = useQueryClient();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [markingAllRead, setMarkingAllRead] = useState(false);

  const handleMarkAsRead = async (notification: Notification) => {
    if (notification.read_at) {
      // If already read, just navigate
      if (notification.data?.link) {
        window.location.href = notification.data.link;
      }
      return;
    }

    await markNotificationAsRead(notification.id);
    queryClient.invalidateQueries({ queryKey: ['notifications'] });

    // Navigate if there's a link
    if (notification.data?.link) {
      window.location.href = notification.data.link;
    }
  };

  const handleDelete = async (notificationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this notification?')) {
      return;
    }

    setDeletingId(notificationId);
    const result = await deleteNotification(notificationId);

    if (result.success) {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    } else {
      alert('Failed to delete notification');
    }
    setDeletingId(null);
  };

  const handleMarkAllAsRead = async () => {
    setMarkingAllRead(true);
    const result = await markAllNotificationsAsRead();

    if (result.success) {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    } else {
      alert('Failed to mark all as read');
    }
    setMarkingAllRead(false);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="p-6 text-center">
        <p className="text-red-600">Failed to load notifications</p>
      </Card>
    );
  }

  if (!notifications || notifications.length === 0) {
    return (
      <EmptyState
        icon="🔔"
        title="No notifications"
        description="You're all caught up! Check back later for updates."
      />
    );
  }

  const unreadCount = notifications.filter((n) => !n.read_at).length;

  return (
    <div className="space-y-4">
      {/* Header with Mark All Read button */}
      {unreadCount > 0 && (
        <div className="flex justify-between items-center">
          <p className="text-sm text-gray-600">
            {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
          </p>
          <Button
            size="sm"
            variant="outline"
            onClick={handleMarkAllAsRead}
            isLoading={markingAllRead}
          >
            Mark all as read
          </Button>
        </div>
      )}

      {/* Notification Items */}
      <div className="space-y-2">
        {notifications.map((notification) => (
          <NotificationItem
            key={notification.id}
            notification={notification}
            onMarkAsRead={() => handleMarkAsRead(notification)}
            onDelete={(e) => handleDelete(notification.id, e)}
            isDeleting={deletingId === notification.id}
          />
        ))}
      </div>
    </div>
  );
}

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead: () => void;
  onDelete: (e: React.MouseEvent) => void;
  isDeleting: boolean;
}

function NotificationItem({ notification, onMarkAsRead, onDelete, isDeleting }: NotificationItemProps) {
  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'proximity_alert':
        return '📍';
      case 'application_status':
        return '📋';
      case 'new_message':
        return '💬';
      case 'profile_view':
        return '👁️';
      default:
        return '🔔';
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInMins = Math.floor(diffInMs / 60000);
    const diffInHours = Math.floor(diffInMs / 3600000);
    const diffInDays = Math.floor(diffInMs / 86400000);

    if (diffInMins < 1) return 'Just now';
    if (diffInMins < 60) return `${diffInMins}m ago`;
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInDays < 7) return `${diffInDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <Card
      className={`p-4 cursor-pointer transition-all hover:shadow-md ${
        notification.read_at ? 'bg-white' : 'bg-blue-50 border-l-4 border-l-blue-600'
      }`}
      onClick={onMarkAsRead}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="text-2xl flex-shrink-0">{getNotificationIcon(notification.type)}</div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className={`text-sm font-semibold ${notification.read_at ? 'text-gray-900' : 'text-blue-900'}`}>
            {notification.title}
          </h3>
          <p className="text-sm text-gray-600 mt-0.5">{notification.message}</p>
          <p className="text-xs text-gray-500 mt-1">{formatTimeAgo(notification.created_at)}</p>
        </div>

        {/* Delete Button */}
        <button
          onClick={onDelete}
          disabled={isDeleting}
          className="flex-shrink-0 text-gray-400 hover:text-red-600 transition-colors p-1"
          aria-label="Delete notification"
        >
          {isDeleting ? (
            <LoadingSpinner size="sm" />
          ) : (
            <span className="text-lg">🗑️</span>
          )}
        </button>
      </div>
    </Card>
  );
}
