import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Utility function to merge Tailwind CSS classes
 *
 * Combines clsx and tailwind-merge to handle conditional classes
 * and resolve Tailwind class conflicts.
 *
 * @example
 * ```tsx
 * cn('px-4 py-2', isActive && 'bg-blue-500', className)
 * // Result: "px-4 py-2 bg-blue-500 custom-class"
 * ```
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a date to a human-readable string
 *
 * @example
 * ```tsx
 * formatDate(new Date()) // "Jan 1, 2024"
 * ```
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Format a date to a relative time string (e.g., "2 hours ago")
 *
 * @example
 * ```tsx
 * formatRelativeTime(new Date(Date.now() - 3600000)) // "1 hour ago"
 * ```
 */
export function formatRelativeTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - d.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return 'just now';
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes} ${diffInMinutes === 1 ? 'minute' : 'minutes'} ago`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours} ${diffInHours === 1 ? 'hour' : 'hours'} ago`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return `${diffInDays} ${diffInDays === 1 ? 'day' : 'days'} ago`;
  }

  return formatDate(d);
}

/**
 * Sleep for a specified number of milliseconds
 *
 * @example
 * ```tsx
 * await sleep(1000); // Wait 1 second
 * ```
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Truncate a string to a specified length
 *
 * @example
 * ```tsx
 * truncate('Hello World', 5) // "Hello..."
 * ```
 */
export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + '...';
}

/**
 * User name type for getFullName helper
 */
export type UserName = {
  first_name: string;
  last_name: string;
};

/**
 * Get full name from user object with first_name and last_name
 *
 * @example
 * ```tsx
 * const user = { first_name: 'John', last_name: 'Doe' };
 * getFullName(user) // "John Doe"
 * 
 * const userNoLast = { first_name: 'John', last_name: '' };
 * getFullName(userNoLast) // "John"
 * ```
 */
export function getFullName(user: UserName | null | undefined): string {
  if (!user) return '';
  const { first_name, last_name } = user;
  return `${first_name || ''} ${last_name || ''}`.trim();
}

/**
 * Get initials from user object with first_name and last_name
 *
 * @example
 * ```tsx
 * const user = { first_name: 'John', last_name: 'Doe' };
 * getInitials(user) // "JD"
 * 
 * const userNoLast = { first_name: 'John', last_name: '' };
 * getInitials(userNoLast) // "J"
 * ```
 */
export function getInitials(user: UserName | null | undefined): string {
  if (!user) return '';
  const first = user.first_name?.charAt(0)?.toUpperCase() || '';
  const last = user.last_name?.charAt(0)?.toUpperCase() || '';
  return `${first}${last}`;
}

/**
 * Get first name only from user object
 *
 * @example
 * ```tsx
 * const user = { first_name: 'John', last_name: 'Doe' };
 * getFirstName(user) // "John"
 * ```
 */
export function getFirstName(user: UserName | null | undefined): string {
  return user?.first_name || '';
}
