'use client';

import { useEffect, useRef } from 'react';
import type { Message } from '../types';
import { MessageBubble } from './message-bubble';

type Props = {
  messages: Message[];
  currentUserId?: string;
  isLoading?: boolean;
};

export function MessageList({ messages, currentUserId, isLoading }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-crewup-blue border-r-transparent"></div>
          <p className="mt-2 text-sm text-gray-500">Loading messages...</p>
        </div>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-blue-50 to-orange-50 mb-4">
            <span className="text-3xl">💬</span>
          </div>
          <p className="text-gray-500 font-medium">No messages yet</p>
          <p className="text-sm text-gray-400 mt-1">Send a message to start the conversation</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-br from-gray-50 to-blue-50/30"
    >
      {messages.map((message) => {
        const isOwnMessage = message.sender_id === currentUserId;
        return <MessageBubble key={message.id} message={message} isOwnMessage={isOwnMessage} />;
      })}
      <div ref={bottomRef} />
    </div>
  );
}
