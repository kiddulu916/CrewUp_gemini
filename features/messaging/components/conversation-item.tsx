'use client';

import Link from 'next/link';
import { Badge } from '@/components/ui';
import type { ConversationWithDetails } from '../types';

type Props = {
  conversation: ConversationWithDetails;
  isActive?: boolean;
};

export function ConversationItem({ conversation, isActive = false }: Props) {
  const formatRelativeTime = (timestamp: string | null) => {
    if (!timestamp) return '';

    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <Link
      href={`/dashboard/messages/${conversation.id}`}
      className={`block hover:bg-gradient-to-r hover:from-blue-50 hover:to-orange-50 transition-all duration-200 ${
        isActive ? 'bg-gradient-to-r from-blue-50 to-orange-50 border-l-4 border-l-krewup-blue' : ''
      }`}
    >
      <div className="p-4">
        <div className="flex items-center justify-between gap-3">
          {/* Recipient Name */}
          <h3 className="font-semibold text-gray-900 text-base flex-1">
            {conversation.otherParticipant.name}
          </h3>

          {/* Right side: Timestamp and Unread Count */}
          <div className="flex items-center gap-2 shrink-0">
            {conversation.lastMessageAt && (
              <span className="text-xs text-gray-500">
                {formatRelativeTime(conversation.lastMessageAt)}
              </span>
            )}

            {conversation.unreadCount > 0 && (
              <Badge variant="danger" className="animate-pulse">
                {conversation.unreadCount}
              </Badge>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
