import { HTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'pro';
}

/**
 * Badge Component
 *
 * A small label for displaying status, categories, or counts.
 *
 * @example
 * ```tsx
 * <Badge variant="success">Active</Badge>
 * <Badge variant="warning">Pending</Badge>
 * <Badge variant="pro">Pro</Badge>
 * ```
 */
export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'default', ...props }, ref) => {
    const variants = {
      default: 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 border-gray-300 shadow-sm',
      success: 'bg-gradient-to-r from-green-400 to-emerald-500 text-white border-green-500 shadow-md',
      warning: 'bg-gradient-to-r from-yellow-400 to-orange-400 text-white border-yellow-500 shadow-md',
      danger: 'bg-gradient-to-r from-red-400 to-red-600 text-white border-red-500 shadow-md',
      info: 'bg-gradient-to-r from-crewup-blue to-crewup-light-blue text-white border-blue-500 shadow-md',
      pro: 'bg-gradient-to-r from-crewup-blue to-crewup-orange text-white border-transparent shadow-lg animate-pulse',
    };

    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors',
          variants[variant],
          className
        )}
        {...props}
      />
    );
  }
);

Badge.displayName = 'Badge';
