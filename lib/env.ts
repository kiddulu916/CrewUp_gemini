import { z } from 'zod';

/**
 * Schema for client-side environment variables (NEXT_PUBLIC_*)
 * These are available in both client and server environments
 */
const clientEnvSchema = z.object({
  // * Supabase - Required
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('Invalid Supabase URL'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, 'Supabase anon key is required'),

  // * Application - Required
  NEXT_PUBLIC_APP_URL: z.string().url('Invalid app URL'),

  // * Stripe Price IDs - Required for subscriptions
  NEXT_PUBLIC_STRIPE_PRICE_ID_PRO_MONTHLY: z.string().min(1, 'Monthly price ID is required'),
  NEXT_PUBLIC_STRIPE_PRICE_ID_PRO_ANNUAL: z.string().min(1, 'Annual price ID is required'),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().optional(),

  // * Google Maps - Optional
  NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: z.string().optional(),

  // * Sentry - Optional
  NEXT_PUBLIC_SENTRY_DSN: z.string().url().optional().or(z.literal('')),
  NEXT_PUBLIC_SENTRY_ORG: z.string().optional(),
});

/**
 * Schema for server-side environment variables
 * These are only available in server contexts (API routes, Server Actions, Server Components)
 */
const serverEnvSchema = z.object({
  // * Supabase - Required
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'Supabase service role key is required'),

  // * Stripe - Required
  STRIPE_SECRET_KEY: z.string().startsWith('sk_', 'Invalid Stripe secret key format'),
  STRIPE_WEBHOOK_SECRET: z.string().startsWith('whsec_', 'Invalid Stripe webhook secret format'),

  // * Email - Optional
  RESEND_API_KEY: z.string().optional(),
  RESEND_FROM_EMAIL: z.string().email().optional(),

  // * Sentry - Optional
  SENTRY_AUTH_TOKEN: z.string().optional(),

  // * Cron Jobs - Optional (required in production)
  CRON_SECRET: z.string().optional(),

  // * Node.js - Auto set
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

/**
 * Combined schema for all environment variables
 */
const envSchema = clientEnvSchema.merge(serverEnvSchema);

type ClientEnv = z.infer<typeof clientEnvSchema>;
type ServerEnv = z.infer<typeof serverEnvSchema>;
type Env = z.infer<typeof envSchema>;

/**
 * Validated client-side environment variables
 * Safe to use in both client and server contexts
 */
export function getClientEnv(): ClientEnv {
  // * Only validate on first access
  const result = clientEnvSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_STRIPE_PRICE_ID_PRO_MONTHLY: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_PRO_MONTHLY,
    NEXT_PUBLIC_STRIPE_PRICE_ID_PRO_ANNUAL: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_PRO_ANNUAL,
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
    NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
    NEXT_PUBLIC_SENTRY_ORG: process.env.NEXT_PUBLIC_SENTRY_ORG,
  });

  if (!result.success) {
    console.error('❌ Invalid client environment variables:');
    console.error(result.error.flatten().fieldErrors);
    throw new Error('Invalid client environment configuration');
  }

  return result.data;
}

/**
 * Validated server-side environment variables
 * Only use in server contexts (API routes, Server Actions, Server Components)
 * 
 * @throws Error if called from client-side code
 */
export function getServerEnv(): ServerEnv {
  // ! This should only be called on the server
  if (typeof window !== 'undefined') {
    throw new Error('getServerEnv() can only be called on the server');
  }

  const result = serverEnvSchema.safeParse({
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL,
    SENTRY_AUTH_TOKEN: process.env.SENTRY_AUTH_TOKEN,
    CRON_SECRET: process.env.CRON_SECRET,
    NODE_ENV: process.env.NODE_ENV,
  });

  if (!result.success) {
    console.error('❌ Invalid server environment variables:');
    console.error(result.error.flatten().fieldErrors);
    throw new Error('Invalid server environment configuration');
  }

  return result.data;
}

/**
 * Get all validated environment variables (server-side only)
 * Combines client and server environment variables
 */
export function getEnv(): Env {
  return {
    ...getClientEnv(),
    ...getServerEnv(),
  };
}

/**
 * Type-safe environment variable access for client-side use
 * Exported as a simple object for easier consumption
 */
export const clientEnv = {
  get supabaseUrl() {
    return process.env.NEXT_PUBLIC_SUPABASE_URL!;
  },
  get supabaseAnonKey() {
    return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  },
  get appUrl() {
    return process.env.NEXT_PUBLIC_APP_URL!;
  },
  get stripePriceIdMonthly() {
    return process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_PRO_MONTHLY!;
  },
  get stripePriceIdAnnual() {
    return process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_PRO_ANNUAL!;
  },
  get googleMapsApiKey() {
    return process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  },
  get sentryDsn() {
    return process.env.NEXT_PUBLIC_SENTRY_DSN;
  },
};

/**
 * Type-safe environment variable access for server-side use
 * ! Only use in server contexts
 */
export const serverEnv = {
  get supabaseServiceRoleKey() {
    return process.env.SUPABASE_SERVICE_ROLE_KEY!;
  },
  get stripeSecretKey() {
    return process.env.STRIPE_SECRET_KEY!;
  },
  get stripeWebhookSecret() {
    return process.env.STRIPE_WEBHOOK_SECRET!;
  },
  get resendApiKey() {
    return process.env.RESEND_API_KEY;
  },
  get resendFromEmail() {
    return process.env.RESEND_FROM_EMAIL;
  },
  get cronSecret() {
    return process.env.CRON_SECRET;
  },
  get nodeEnv() {
    return (process.env.NODE_ENV as 'development' | 'production' | 'test') || 'development';
  },
  get isProduction() {
    return process.env.NODE_ENV === 'production';
  },
  get isDevelopment() {
    return process.env.NODE_ENV === 'development';
  },
};

/**
 * Validate all environment variables at startup
 * Call this in your application entry point to catch missing variables early
 * 
 * @example
 * ```ts
 * // In instrumentation.ts or a similar entry point
 * import { validateEnv } from '@/lib/env';
 * validateEnv();
 * ```
 */
export function validateEnv(): void {
  try {
    // * Validate client env vars (always available)
    getClientEnv();

    // * Validate server env vars only on server
    if (typeof window === 'undefined') {
      getServerEnv();
    }

    console.log('✅ Environment variables validated successfully');
  } catch (error) {
    console.error('❌ Environment validation failed:', error);
    // ! In production, we want to fail fast
    if (process.env.NODE_ENV === 'production') {
      throw error;
    }
  }
}

// * Export schemas for external use
export { clientEnvSchema, serverEnvSchema, envSchema };
export type { ClientEnv, ServerEnv, Env };

