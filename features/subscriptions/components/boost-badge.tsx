// features/subscriptions/components/boost-badge.tsx
'use client';

/**
 * BoostBadge component
 * 
 * Displays a visual indicator that a worker's profile is boosted.
 * 
 * * Profile boost is continuous for the entire Pro subscription duration
 * * The `isActive` prop takes precedence over `expiresAt` for determining if boost is shown
 * * For backwards compatibility, if only `expiresAt` is provided, it falls back to date checking
 */
interface BoostBadgeProps {
  /** Whether the boost is currently active (preferred way to control visibility) */
  isActive?: boolean;
  /** @deprecated Expiration date - kept for backwards compatibility but boost is now continuous */
  expiresAt?: string | null;
  size?: 'sm' | 'md' | 'lg';
  /** @deprecated Expiry display is removed since boost is now continuous */
  showExpiry?: boolean;
}

export function BoostBadge({ isActive, expiresAt, size = 'md' }: BoostBadgeProps) {
  // * Determine if boost should be shown
  // If isActive prop is provided, use it; otherwise fall back to checking expiresAt
  const shouldShow = isActive !== undefined 
    ? isActive 
    : (expiresAt ? new Date(expiresAt) > new Date() : false);

  if (!shouldShow) {
    return null;
  }

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5',
  };

  return (
    <div className="flex items-center gap-2">
      <span
        className={`
          inline-flex items-center gap-1 rounded-full
          bg-gradient-to-r from-yellow-400 to-orange-500
          text-white font-semibold
          shadow-sm
          ${sizeClasses[size]}
        `}
      >
        <svg
          className={size === 'sm' ? 'w-3 h-3' : size === 'md' ? 'w-4 h-4' : 'w-5 h-5'}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
        Boosted
      </span>
    </div>
  );
}
