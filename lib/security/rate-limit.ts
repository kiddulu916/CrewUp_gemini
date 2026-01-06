/**
 * Rate Limiting Utility
 * 
 * * In-memory rate limiter for development and single-server deployments
 * ! For production with multiple servers, use Upstash Redis instead
 * 
 * @see https://upstash.com/docs/redis/sdks/ratelimit-ts/overview
 */

import { headers } from 'next/headers';
import * as Sentry from '@sentry/nextjs';

// * Rate limit configuration per action type
export type RateLimitConfig = {
  // Maximum requests allowed in the window
  limit: number;
  // Time window in seconds
  windowSeconds: number;
  // Optional identifier function (defaults to IP)
  identifier?: () => Promise<string>;
};

// * Default configurations for different action types
export const RATE_LIMITS = {
  // ! Strict limits for authentication endpoints (brute force protection)
  auth: { limit: 5, windowSeconds: 60 }, // 5 attempts per minute
  authSignup: { limit: 3, windowSeconds: 60 }, // 3 signups per minute per IP

  // * Standard limits for general actions
  message: { limit: 30, windowSeconds: 60 }, // 30 messages per minute
  upload: { limit: 10, windowSeconds: 60 }, // 10 uploads per minute
  
  // * Relaxed limits for read operations
  search: { limit: 60, windowSeconds: 60 }, // 60 searches per minute
  
  // * Admin actions
  adminAction: { limit: 20, windowSeconds: 60 }, // 20 admin actions per minute
} as const;

// * In-memory storage for rate limits (cleared on server restart)
// ! In production, replace with Upstash Redis for distributed rate limiting
type RateLimitEntry = {
  count: number;
  windowStart: number;
};

const rateLimitStore = new Map<string, RateLimitEntry>();

// * Cleanup old entries every 5 minutes to prevent memory leaks
const CLEANUP_INTERVAL = 5 * 60 * 1000;
let cleanupIntervalId: ReturnType<typeof setInterval> | null = null;

function startCleanup() {
  if (cleanupIntervalId) return;
  
  cleanupIntervalId = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore.entries()) {
      // Remove entries older than 10 minutes
      if (now - entry.windowStart > 10 * 60 * 1000) {
        rateLimitStore.delete(key);
      }
    }
  }, CLEANUP_INTERVAL);
}

/**
 * Get client identifier (IP address) from request headers
 */
async function getClientIdentifier(): Promise<string> {
  const headersList = await headers();
  
  // * Check various headers for the real IP
  // Order matters - check most reliable sources first
  const forwardedFor = headersList.get('x-forwarded-for');
  if (forwardedFor) {
    // x-forwarded-for can contain multiple IPs, get the first one
    return forwardedFor.split(',')[0].trim();
  }

  const realIp = headersList.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  // Vercel-specific header
  const vercelForwardedFor = headersList.get('x-vercel-forwarded-for');
  if (vercelForwardedFor) {
    return vercelForwardedFor;
  }

  // Cloudflare-specific header
  const cfConnectingIp = headersList.get('cf-connecting-ip');
  if (cfConnectingIp) {
    return cfConnectingIp;
  }

  // Fallback - should not happen in production
  return 'unknown';
}

export type RateLimitResult = {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number; // Unix timestamp when the window resets
  retryAfter?: number; // Seconds until retry allowed (only set when limited)
};

/**
 * Check rate limit for an action
 * 
 * @param actionKey - Unique key for the action (e.g., 'auth:login')
 * @param config - Rate limit configuration
 * @returns Rate limit result
 * 
 * @example
 * ```ts
 * const result = await checkRateLimit('auth:login', RATE_LIMITS.auth);
 * if (!result.success) {
 *   return { success: false, error: `Too many attempts. Try again in ${result.retryAfter} seconds.` };
 * }
 * ```
 */
export async function checkRateLimit(
  actionKey: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  startCleanup();
  
  const identifier = config.identifier 
    ? await config.identifier() 
    : await getClientIdentifier();
  
  const key = `${actionKey}:${identifier}`;
  const now = Date.now();
  const windowMs = config.windowSeconds * 1000;

  let entry = rateLimitStore.get(key);

  // * Reset if window has passed
  if (!entry || now - entry.windowStart > windowMs) {
    entry = { count: 0, windowStart: now };
  }

  // * Increment count
  entry.count += 1;
  rateLimitStore.set(key, entry);

  const windowReset = Math.ceil((entry.windowStart + windowMs) / 1000);
  const remaining = Math.max(0, config.limit - entry.count);

  if (entry.count > config.limit) {
    const retryAfter = Math.ceil((entry.windowStart + windowMs - now) / 1000);
    
    // ! Log rate limit exceeded to Sentry for monitoring
    Sentry.captureMessage(`Rate limit exceeded: ${actionKey}`, {
      level: 'warning',
      tags: {
        action: actionKey,
        identifier: identifier.substring(0, 10) + '...',
      },
      extra: {
        limit: config.limit,
        count: entry.count,
        windowSeconds: config.windowSeconds,
      },
    });

    return {
      success: false,
      limit: config.limit,
      remaining: 0,
      reset: windowReset,
      retryAfter,
    };
  }

  return {
    success: true,
    limit: config.limit,
    remaining,
    reset: windowReset,
  };
}

/**
 * Rate limit wrapper for server actions
 * Returns a standard error response when rate limited
 * 
 * @example
 * ```ts
 * export async function signIn(email: string, password: string) {
 *   const rateLimitResult = await rateLimit('auth:signIn', RATE_LIMITS.auth);
 *   if (rateLimitResult) return rateLimitResult;
 *   
 *   // ... rest of action
 * }
 * ```
 */
export async function rateLimit(
  actionKey: string,
  config: RateLimitConfig
): Promise<{ success: false; error: string } | null> {
  const result = await checkRateLimit(actionKey, config);
  
  if (!result.success) {
    return {
      success: false,
      error: `Too many attempts. Please try again in ${result.retryAfter} seconds.`,
    };
  }

  return null;
}

/**
 * Create a rate limiter with user ID as identifier
 * Use for authenticated actions where you want per-user limits
 */
export function createUserRateLimiter(userId: string) {
  return async (actionKey: string, config: RateLimitConfig) => {
    return checkRateLimit(actionKey, {
      ...config,
      identifier: async () => userId,
    });
  };
}

