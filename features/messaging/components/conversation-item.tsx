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

  const truncateMessage = (text: string, maxLength = 50) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  return (
    <Link
      href={`/dashboard/messages/${conversation.id}`}
      className={`block border-b border-gray-200 hover:bg-gradient-to-r hover:from-blue-50 hover:to-orange-50 transition-all duration-200 ${
        isActive ? 'bg-gradient-to-r from-blue-50 to-orange-50 border-l-4 border-l-krewup-blue' : ''
      }`}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Avatar */}
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-krewup-blue to-krewup-orange text-white font-bold shadow-md">
            {conversation.otherParticipant.name.charAt(0).toUpperCase()}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-semibold text-gray-900 truncate">
                {conversation.otherParticipant.name}
              </h3>
              {conversation.lastMessageAt && (
                <span className="text-xs text-gray-500 shrink-0 ml-2">
                  {formatRelativeTime(conversation.lastMessageAt)}
                </span>
              )}
            </div>

            <div className="flex items-center justify-between gap-2">
              {conversation.lastMessage ? (
                <p className="text-sm text-gray-600 truncate">
                  {truncateMessage(conversation.lastMessage.content)}
                </p>
              ) : (
                <p className="text-sm text-gray-400 italic">No messages yet</p>
              )}

              {conversation.unreadCount > 0 && (
                <Badge
                  variant="danger"
                  className="shrink-0 animate-pulse"
                >
                  {conversation.unreadCount}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
