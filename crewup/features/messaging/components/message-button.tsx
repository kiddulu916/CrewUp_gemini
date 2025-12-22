'use client';

import { useState } from 'react';
import { Button } from '@/components/ui';
import { findOrCreateConversation } from '../actions/conversation-actions';
import { cn } from '@/lib/utils';

type Props = {
  recipientId: string;
  recipientName: string;
  variant?: 'primary' | 'secondary' | 'outline';
  className?: string;
  fullWidth?: boolean;
};

export function MessageButton({
  recipientId,
  recipientName,
  variant = 'primary',
  className = '',
  fullWidth = false,
}: Props) {
  const [isLoading, setIsLoading] = useState(false);

  async function handleClick() {
    setIsLoading(true);
    try {
      await findOrCreateConversation(recipientId);
      // findOrCreateConversation handles the redirect
    } catch (error) {
      console.error('Failed to start conversation:', error);
      setIsLoading(false);
    }
  }

  return (
    <Button
      onClick={handleClick}
      variant={variant}
      isLoading={isLoading}
      className={cn(fullWidth && 'w-full', className)}
    >
      {isLoading ? 'Starting conversation...' : `Message ${recipientName}`}
    </Button>
  );
}
