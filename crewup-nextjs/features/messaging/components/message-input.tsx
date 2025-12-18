'use client';

import { useState } from 'react';
import { Button, Textarea } from '@/components/ui';

type Props = {
  onSend: (content: string) => Promise<void>;
  isLoading?: boolean;
};

export function MessageInput({ onSend, isLoading }: Props) {
  const [content, setContent] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim() || isLoading) return;

    await onSend(content.trim());
    setContent('');
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  }

  const isOverLimit = content.length > 1000;
  const charsRemaining = 1000 - content.length;

  return (
    <form onSubmit={handleSubmit} className="border-t-2 border-gray-200 bg-white p-4">
      <div className="flex gap-3">
        <div className="flex-1">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message... (Enter to send, Shift+Enter for new line)"
            className="resize-none"
            rows={2}
            maxLength={1100} // Allow slightly over to show error
            disabled={isLoading}
          />
          <div className="flex items-center justify-between mt-1">
            <p className="text-xs text-gray-500">
              Enter to send • Shift+Enter for new line
            </p>
            <p
              className={`text-xs font-medium ${
                isOverLimit ? 'text-red-600' : charsRemaining < 100 ? 'text-orange-600' : 'text-gray-500'
              }`}
            >
              {content.length}/1000 characters
            </p>
          </div>
        </div>
        <Button
          type="submit"
          disabled={!content.trim() || isLoading || isOverLimit}
          isLoading={isLoading}
          className="h-fit self-end shadow-lg hover:shadow-xl transition-all duration-300"
        >
          {isLoading ? 'Sending...' : 'Send'}
        </Button>
      </div>
    </form>
  );
}
