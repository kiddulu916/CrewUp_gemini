'use client';

import type { Message } from '../types';
import { InitialsAvatar } from '@/lib/utils/initials-avatar';

type Props = {
  message: Message;
  isOwnMessage: boolean;
};

export function MessageBubble({ message, isOwnMessage }: Props) {
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  return (
    <div
      className={`flex gap-2 max-w-[75%] ${isOwnMessage ? 'ml-auto flex-row-reverse' : ''}`}
    >
      {/* Avatar for received messages */}
      {!isOwnMessage && message.sender && (
        <div className="flex-shrink-0">
          {message.sender.profile_image_url ? (
            <img
              src={message.sender.profile_image_url}
              alt={message.sender.name}
              className="h-8 w-8 rounded-full object-cover border-2 border-gray-200 shadow-md"
            />
          ) : (
            <InitialsAvatar name={message.sender.name} userId={message.sender.id} size="sm" />
          )}
        </div>
      )}

      <div className="flex flex-col">
        {/* Message bubble */}
        <div
          className={`rounded-xl px-4 py-2.5 shadow-md ${
            isOwnMessage
              ? 'bg-gradient-to-br from-krewup-blue to-krewup-light-blue text-white'
              : 'bg-white border-2 border-gray-200 text-gray-900'
          }`}
        >
          <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
            {message.content}
          </p>
        </div>

        {/* Timestamp */}
        <p
          className={`text-xs text-gray-500 mt-1 ${isOwnMessage ? 'text-right' : 'text-left'}`}
        >
          {formatTime(message.created_at)}
        </p>
      </div>
    </div>
  );
}
