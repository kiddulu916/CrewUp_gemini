'use client';

import Link from 'next/link';
import { useUnreadCount } from '../hooks/use-unread-count';

export function NotificationBell() {
  const { data: unreadCount, isLoading } = useUnreadCount();

  return (
    <Link
      href="/dashboard/notifications"
      className="relative inline-flex items-center justify-center w-10 h-10 rounded-full hover:bg-gray-100 transition-colors"
      aria-label={`Notifications${unreadCount && unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
    >
      {/* Bell Icon */}
      <span className="text-2xl">🔔</span>

      {/* Unread Badge */}
      {!isLoading && unreadCount !== undefined && unreadCount > 0 && (
        <span className="absolute top-0 right-0 inline-flex items-center justify-center w-5 h-5 text-[10px] font-bold text-white bg-red-600 rounded-full border-2 border-white">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </Link>
  );
}
