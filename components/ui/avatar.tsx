'use client';

import Image from 'next/image';
import { cn } from '@/lib/utils';

// Tiny transparent placeholder for blur effect
const BLUR_DATA_URL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mN88P/hfwYAAvYB+0aoT+cAAAAASUVORK5CYII=';

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

const sizeConfig: Record<AvatarSize, { container: string; text: string; pixels: number }> = {
  xs: { container: 'h-6 w-6', text: 'text-xs', pixels: 24 },
  sm: { container: 'h-8 w-8', text: 'text-sm', pixels: 32 },
  md: { container: 'h-10 w-10', text: 'text-base', pixels: 40 },
  lg: { container: 'h-12 w-12', text: 'text-lg', pixels: 48 },
  xl: { container: 'h-16 w-16', text: 'text-xl', pixels: 64 },
};

// Deterministic color based on user ID
function getAvatarColor(userId: string): string {
  const colors = [
    'bg-blue-500',
    'bg-green-500',
    'bg-purple-500',
    'bg-orange-500',
    'bg-teal-500',
    'bg-pink-500',
    'bg-indigo-500',
    'bg-cyan-500',
    'bg-rose-500',
    'bg-emerald-500',
  ];
  
  // Create a simple hash from the user ID
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = ((hash << 5) - hash) + userId.charCodeAt(i);
    hash = hash & hash; // Convert to 32bit integer
  }
  
  return colors[Math.abs(hash) % colors.length];
}

// Get initials from name
function getInitials(name: string): string {
  if (!name) return '?';
  
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase();
  }
  
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

interface AvatarProps {
  /** Image URL (optional - falls back to initials if not provided) */
  src?: string | null;
  /** Alt text / user's name */
  name: string;
  /** User ID for deterministic color */
  userId?: string;
  /** Size variant */
  size?: AvatarSize;
  /** Additional CSS classes */
  className?: string;
  /** Border style */
  border?: 'none' | 'white' | 'gray';
  /** Whether to show shadow */
  shadow?: boolean;
}

/**
 * Optimized Avatar component using Next.js Image.
 * 
 * Features:
 * - Blur placeholder for smooth loading
 * - Automatic fallback to colored initials
 * - Deterministic colors based on user ID
 * - Multiple size variants
 * - Proper Next.js Image optimization
 */
export function Avatar({
  src,
  name,
  userId = '',
  size = 'md',
  className,
  border = 'gray',
  shadow = false,
}: AvatarProps) {
  const config = sizeConfig[size];
  
  const borderStyles = {
    none: '',
    white: 'border-2 border-white',
    gray: 'border-2 border-gray-200',
  };
  
  const baseStyles = cn(
    config.container,
    'rounded-full overflow-hidden flex-shrink-0',
    borderStyles[border],
    shadow && 'shadow-md',
    className
  );

  // If we have a valid image URL, use Next.js Image
  if (src) {
    return (
      <div className={baseStyles}>
        <Image
          src={src}
          alt={name}
          width={config.pixels}
          height={config.pixels}
          className="h-full w-full object-cover"
          placeholder="blur"
          blurDataURL={BLUR_DATA_URL}
        />
      </div>
    );
  }

  // Fallback to colored initials
  const colorClass = getAvatarColor(userId || name);
  const initials = getInitials(name);

  return (
    <div className={cn(baseStyles, colorClass, 'flex items-center justify-center')}>
      <span className={cn(config.text, 'font-semibold text-white')}>
        {initials}
      </span>
    </div>
  );
}

/**
 * Avatar skeleton for loading states
 */
export function AvatarSkeleton({ size = 'md', className }: { size?: AvatarSize; className?: string }) {
  const config = sizeConfig[size];
  
  return (
    <div
      className={cn(
        config.container,
        'rounded-full bg-gray-200 animate-pulse flex-shrink-0',
        className
      )}
    />
  );
}

