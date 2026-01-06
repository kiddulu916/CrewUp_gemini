'use client';

import { useState, useEffect } from 'react';
import { RefreshCw, Wifi, WifiOff, Clock, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { type PollingStatus, formatLastSyncTime } from '@/lib/hooks/use-smart-polling';

type PollingStatusIndicatorProps = {
  status: PollingStatus;
  isFetching?: boolean;
  showLastSync?: boolean;
  compact?: boolean;
  className?: string;
  onRefresh?: () => void;
};

/**
 * Polling status indicator component
 * 
 * Shows the current sync status with visual feedback
 * 
 * @example
 * ```tsx
 * <PollingStatusIndicator
 *   status={status}
 *   isFetching={isFetching}
 *   onRefresh={refetchNow}
 * />
 * ```
 */
export function PollingStatusIndicator({
  status,
  isFetching = false,
  showLastSync = true,
  compact = false,
  className,
  onRefresh,
}: PollingStatusIndicatorProps) {
  const [lastSyncText, setLastSyncText] = useState('');

  // * Update last sync time display every 10 seconds
  useEffect(() => {
    const updateText = () => {
      setLastSyncText(formatLastSyncTime(status.lastSyncTime));
    };
    updateText();
    const interval = setInterval(updateText, 10000);
    return () => clearInterval(interval);
  }, [status.lastSyncTime]);

  // * Determine status color and icon
  const getStatusConfig = () => {
    if (status.errorCount > 0) {
      return {
        color: 'text-red-500',
        bgColor: 'bg-red-50',
        icon: AlertCircle,
        label: 'Connection issue',
      };
    }
    if (status.isPaused) {
      return {
        color: 'text-gray-400',
        bgColor: 'bg-gray-50',
        icon: WifiOff,
        label: 'Paused',
      };
    }
    if (isFetching) {
      return {
        color: 'text-blue-500',
        bgColor: 'bg-blue-50',
        icon: RefreshCw,
        label: 'Syncing',
      };
    }
    if (status.isIdle) {
      return {
        color: 'text-gray-500',
        bgColor: 'bg-gray-50',
        icon: Clock,
        label: 'Idle',
      };
    }
    return {
      color: 'text-green-500',
      bgColor: 'bg-green-50',
      icon: Wifi,
      label: 'Live',
    };
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  if (compact) {
    return (
      <div
        className={cn(
          'flex items-center gap-1.5 text-xs',
          config.color,
          className
        )}
        title={`${config.label}${showLastSync ? ` • Last sync: ${lastSyncText}` : ''}`}
      >
        <Icon
          className={cn('h-3 w-3', isFetching && 'animate-spin')}
        />
        <span className="sr-only">{config.label}</span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex items-center gap-2 px-2 py-1 rounded-full text-xs',
        config.bgColor,
        config.color,
        className
      )}
    >
      <Icon
        className={cn('h-3.5 w-3.5', isFetching && 'animate-spin')}
      />
      <span className="font-medium">{config.label}</span>
      {showLastSync && status.lastSyncTime && (
        <>
          <span className="text-gray-300">•</span>
          <span className="text-gray-500">{lastSyncText}</span>
        </>
      )}
      {onRefresh && (
        <button
          onClick={onRefresh}
          className="ml-1 p-0.5 rounded hover:bg-black/5 transition-colors"
          title="Refresh now"
          disabled={isFetching}
        >
          <RefreshCw className={cn('h-3 w-3', isFetching && 'animate-spin')} />
        </button>
      )}
    </div>
  );
}

/**
 * Simple syncing indicator for inline use
 */
export function SyncingIndicator({
  isSyncing,
  className,
}: {
  isSyncing: boolean;
  className?: string;
}) {
  if (!isSyncing) return null;

  return (
    <div className={cn('flex items-center gap-1.5 text-xs text-blue-500', className)}>
      <RefreshCw className="h-3 w-3 animate-spin" />
      <span>Syncing...</span>
    </div>
  );
}

/**
 * Connection error banner
 */
export function ConnectionErrorBanner({
  errorCount,
  onRetry,
  className,
}: {
  errorCount: number;
  onRetry?: () => void;
  className?: string;
}) {
  if (errorCount === 0) return null;

  return (
    <div
      className={cn(
        'flex items-center justify-between gap-3 px-4 py-2 bg-red-50 border-b border-red-100 text-sm text-red-700',
        className
      )}
    >
      <div className="flex items-center gap-2">
        <AlertCircle className="h-4 w-4" />
        <span>
          Connection issue. {errorCount > 1 && `${errorCount} failed attempts.`}
        </span>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-3 py-1 rounded bg-red-100 hover:bg-red-200 font-medium transition-colors"
        >
          Retry
        </button>
      )}
    </div>
  );
}

