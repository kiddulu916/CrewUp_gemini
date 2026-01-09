# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Local Development

```bash
npm run dev                 # Start Next.js dev server (port 3000)
npm run build               # Production build
npm start                   # Start production server (requires .env.local)
```

### Type Checking & Linting

```bash
npm run type-check          # Run TypeScript compiler without emitting files
npm run lint                # Run ESLint
```

### Testing

```bash
# Unit/Component Tests (Vitest)
npm test                    # Run component tests in __tests__/components/
npm run test:watch          # Run tests in watch mode
npm run test:ui             # Run tests with Vitest UI
npm run test:components     # Explicitly run component tests

# E2E Tests (Playwright)
npm run test:e2e            # Run all E2E tests headless
npm run test:e2e:ui         # Run E2E tests with Playwright UI
npm run test:e2e:headed     # Run E2E tests with browser visible
npm run test:e2e:mobile     # Run mobile-specific E2E tests
npm run test:e2e:tablet     # Run tablet-specific E2E tests

# Performance Tests
npm run lighthouse          # Run Lighthouse performance audit
npm run lighthouse:mobile   # Mobile Lighthouse audit
npm run lighthouse:desktop  # Desktop Lighthouse audit
npm run test:perf          # Alias for lighthouse

# All Tests
npm run test:all            # Run component tests + E2E tests sequentially
```

### Running Individual Tests

```bash
# Run specific Vitest test file
npx vitest __tests__/components/ui/button.test.tsx

# Run specific Playwright test
npx playwright test e2e/auth.spec.ts

# Run single test case by name
npx playwright test -g "should allow user to login"
```

These examples should be used as guidance when configuring Sentry functionality within a project.

## Exception Catching

Use `Sentry.captureException(error)` to capture an exception and log the error in Sentry.
Use this in try catch blocks or areas where exceptions are expected

## Tracing Examples

Spans should be created for meaningful actions within applications like button clicks, API calls, and function calls
Use the `Sentry.startSpan` function to create a span
Child spans can exist within a parent span

## Custom Span instrumentation in component actions

The `name` and `op` properties should be meaningful for the activities in the call.
Attach attributes based on relevant information and metrics from the request

```javascript
function TestComponent() {
  const handleTestButtonClick = () => {
    // Create a transaction/span to measure performance
    Sentry.startSpan(
      {
        op: "ui.click",
        name: "Test Button Click",
      },
      (span) => {
        const value = "some config";
        const metric = "some metric";
        // Metrics can be added to the span
        span.setAttribute("config", value);
        span.setAttribute("metric", metric);
        doSomething();
      },
    );
  };
  return (
    <button type="button" onClick={handleTestButtonClick}>
      Test Sentry
    </button>
  );
}
```

## Custom span instrumentation in API calls

The `name` and `op` properties should be meaningful for the activities in the call.
Attach attributes based on relevant information and metrics from the request

```javascript
async function fetchUserData(userId) {
  return Sentry.startSpan(
    {
      op: "http.client",
      name: `GET /api/users/${userId}`,
    },
    async () => {
      const response = await fetch(`/api/users/${userId}`);
      const data = await response.json();
      return data;
    },
  );
}
```

## Logs

Where logs are used, ensure Sentry is imported using `import * as Sentry from "@sentry/nextjs"`
Enable logging in Sentry using `Sentry.init({ enableLogs: true })`
Reference the logger using `Sentry.logger`
Sentry offers a consoleLoggingIntegration that can be used to log specific console error types automatically without instrumenting the individual logger calls

## Configuration

In NextJS the client side Sentry initialization is in `instrumentation-client.ts`, the server initialization is in `sentry.server.config.ts` and the edge initialization is in `sentry.edge.config.ts`
Initialization does not need to be repeated in other files, it only needs to happen the files mentioned above. You should use `import * as Sentry from "@sentry/nextjs"` to reference Sentry functionality

### Baseline

```javascript
import * as Sentry from "@sentry/nextjs";
Sentry.init({
  dsn: "https://examplePublicKey@o0.ingest.sentry.io/0",
  enableLogs: true,
});
```

### Logger Integration

```javascript
Sentry.init({
  dsn: "https://examplePublicKey@o0.ingest.sentry.io/0",
  integrations: [
    // send console.log, console.error, and console.warn calls as logs to Sentry
    Sentry.consoleLoggingIntegration({ levels: ["log", "error", "warn"] }),
  ],
});
```

## Logger Examples

`logger.fmt` is a template literal function that should be used to bring variables into the structured logs.

```javascript
logger.trace("Starting database connection", { database: "users" });
logger.debug(logger.fmt`Cache miss for user: ${userId}`);
logger.info("Updated profile", { profileId: 345 });
logger.warn("Rate limit reached for endpoint", {
  endpoint: "/api/results/",
  isEnterprise: false,
});
logger.error("Failed to process payment", {
  orderId: "order_123",
  amount: 99.99,
});
logger.fatal("Database connection pool exhausted", {
  database: "users",
  activeConnections: 100,
});
```

## Architecture Overview

### Feature-Based Structure

KrewUp uses a **domain-driven feature architecture** where each feature module is self-contained:

```
features/[feature-name]/
├── actions/         # Server Actions ('use server')
├── components/      # Feature-specific React components
├── hooks/          # Custom React hooks for data fetching
├── types/          # TypeScript type definitions
└── utils/          # Feature-specific utilities
```

Each feature owns its full stack: from UI components to server-side data mutations. This keeps related code co-located and makes features easy to understand and modify.

### Server Actions Pattern

**All data mutations use Next.js Server Actions** (not API routes). Server Actions are preferred because:
- Automatic cookie-based authentication handling
- Better TypeScript support end-to-end
- Simpler than API routes for internal operations
- No need to manage request/response serialization

**Standard Server Action Pattern:**
```typescript
'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';

export async function myAction(data: FormData): Promise<{ success: boolean; error?: string }> {
  // 1. Create authenticated Supabase client
  const supabase = await createClient(await cookies());

  // 2. Get and verify current user
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false, error: 'Not authenticated' };
  }

  // 3. Perform authorization checks if needed
  const { data: profile } = await supabase
    .from('users')
    .select('role, subscription_status')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'employer') {
    return { success: false, error: 'Unauthorized' };
  }

  // 4. Execute database operation
  const { error } = await supabase.from('table').insert({ ... });

  if (error) {
    return { success: false, error: error.message };
  }

  // 5. Revalidate Next.js cache for affected routes
  revalidatePath('/dashboard/jobs');

  return { success: true };
}
```

**Key conventions:**
- Always return `{ success: boolean; error?: string; data?: T }` shape
- Always verify authentication first
- Check authorization (role, subscription status) before mutations
- Call `revalidatePath()` after successful mutations
- Use `createClient(await cookies())` for user-scoped operations
- Use `createServiceClient()` only for admin/webhook operations that bypass RLS

### Supabase Client Architecture

**Three client types** with different purposes:

1. **Server Client** (`lib/supabase/server.ts`):
   ```typescript
   import { createClient } from '@/lib/supabase/server';
   import { cookies } from 'next/headers';

   const supabase = await createClient(await cookies());
   ```
   - Use in: Server Components, Server Actions, API routes
   - Respects Row Level Security (RLS)
   - Authenticated as current user via cookies
   - Must await both `cookies()` and `createClient()`

2. **Service Role Client** (`lib/supabase/server.ts`):
   ```typescript
   import { createServiceClient } from '@/lib/supabase/server';

   const supabase = await createServiceClient();
   ```
   - Use in: Admin operations, webhooks, cron jobs
   - **Bypasses RLS** - has full database access
   - Never uses user cookies
   - Use with caution - only for trusted server-side operations

3. **Browser Client** (`lib/supabase/client.ts`):
   ```typescript
   import { createClient } from '@/lib/supabase/client';

   const supabase = createClient();
   ```
   - Use in: Client Components only
   - Handles real-time subscriptions
   - Authenticated via browser cookies
   - Memoized to prevent multiple instances

### Authentication & Authorization

**Multi-Layer Protection:**

1. **Middleware** (`middleware.ts` + `lib/supabase/middleware.ts`):
   - Refreshes Supabase sessions on every request
   - Protects `/dashboard/*` routes (redirects to `/login` if not authenticated)
   - Protects `/admin/*` routes (returns 404 if not admin to hide existence)
   - Runs on all routes except static files and Next.js internals

2. **Server Actions**:
   - Every action verifies `user` exists via `supabase.auth.getUser()`
   - Role checks: `profile.role === 'worker'` or `'employer'`
   - Admin checks: `profile.is_admin === true`
   - Subscription checks: `profile.subscription_status === 'pro'` for Pro features

3. **Database (RLS)**:
   - Row Level Security policies enforce data access at database level
   - Service role client bypasses RLS (use only for admin operations)
   - Policies ensure users can only read/write their own data

4. **Moderation System**:
   - `user_moderation_actions` table tracks warnings, suspensions, bans
   - `ModerationGuard` component (client-side) checks status every 5 minutes
   - Logs out and redirects banned/suspended users
   - Admin can issue moderation actions via admin dashboard

### Database Patterns

**PostGIS for Location:**
```typescript
// Creating a job with coordinates
const { lat, lng } = coords;
await supabase.rpc('create_job_with_coords', {
  p_employer_id: user.id,
  p_location: location,
  p_lat: lat,
  p_lng: lng,
  // ... other fields
});

// Behind the scenes (in Postgres function):
// ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)
```

**JSONB for Flexible Data:**
- `job_applications.form_data` - Complete application form as JSON
- `job_applications.custom_answers` - Answers to custom screening questions
- `jobs.custom_questions` - Employer's custom screening questions
- `jobs.trade_selections` - Structured array of trade + subtrades

**Key Tables:**
- `profiles` - User profiles (role, subscription_status, is_admin, coords)
- `jobs` - Job postings with PostGIS geometry for location
- `job_applications` - Applications with comprehensive form_data
- `certifications` - Worker certifications with verification_status
- `subscriptions` - Stripe subscription data synced via webhook
- `messages` - Direct messaging between users
- `notifications` - In-app notifications
- `content_reports` - User-submitted moderation reports
- `user_moderation_actions` - Moderation history (warnings, bans, suspensions)
- `admin_activity_log` - Audit trail for all admin actions

### Stripe Integration

**Checkout Flow:**
1. User clicks upgrade to Pro on `/pricing` page
2. `createCheckoutSession` Server Action creates Stripe Checkout session
3. User completes payment on Stripe-hosted page
4. Webhook receives `checkout.session.completed` event
5. Webhook creates `subscriptions` record and updates `profiles.subscription_status = 'pro'`

**Webhook Handler** (`app/api/webhooks/stripe/route.ts`):
- Handles: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`
- Uses service role client to bypass RLS
- Updates `subscriptions` table and `profiles.subscription_status`
- For workers: activates 7-day profile boost on subscription start/renewal
- Validates webhook signature with `STRIPE_WEBHOOK_SECRET`

**Pro Feature Gating:**
```typescript
// In Server Action
const { data: profile } = await supabase
  .from('users')
  .select('subscription_status')
  .eq('id', user.id)
  .single();

if (profile?.subscription_status !== 'pro') {
  return { success: false, error: 'This feature requires a Pro subscription' };
}
```

### Admin Dashboard

**Access Control:**
- `profiles.is_admin` boolean flag determines admin status
- Middleware returns 404 for `/admin/*` if not admin (hides existence)
- All admin Server Actions verify `is_admin` flag
- Service role client used for admin operations

**Key Admin Features:**
- **User Management** (`/admin/users`): View users, suspend/ban accounts
- **Certification Verification** (`/admin/certifications`): Approve/reject worker certifications
- **Content Moderation** (`/admin/moderation`): Review reports, take action (warn/suspend/ban), remove content
- **Analytics** (`/admin/analytics`): Platform metrics and usage statistics
- **Sentry Monitoring** (`/admin/monitoring`): Error tracking and performance monitoring
- **Platform Settings** (`/admin/settings`): Configuration (maintenance mode, signup control, etc.)

**Audit Trail:**
- All admin actions logged to `admin_activity_log`
- Includes: admin_id, action_type, target_user_id, details (JSONB), timestamp

### Testing Strategy

**Three-Layer Testing:**

1. **Unit/Component Tests** (Vitest + Testing Library):
   - Located in `__tests__/components/`
   - Test individual components in isolation
   - Mock Supabase clients and external dependencies
   - Run fast, no database required

2. **E2E Tests** (Playwright):
   - Located in `e2e/`
   - Test complete user flows against real UI
   - Multi-device: Desktop Chrome, iPhone 13 Pro, iPad Pro
   - Covers: auth, profiles, jobs, applications, messaging, payments, admin
   - Requires Supabase database (test users created/cleaned up)

3. **Performance Tests** (Lighthouse):
   - Configuration in `lighthouserc.json`
   - Automated performance, accessibility, SEO audits
   - Separate mobile/desktop configurations

**Test Database Setup:**
- E2E tests use real Supabase instance
- Test users created in `beforeAll` hooks
- Cleaned up in `afterAll` hooks
- Seed data created per-test as needed

### Pro Features

**Gated by `profiles.subscription_status === 'pro'`:**

**For Workers:**
- Profile boost (continuous for entire Pro subscription)
  - Boosted profiles shown first to employers
  - `is_profile_boosted` flag, `boost_expires_at` is null (no expiration)
  - Activated on subscription start, lasts entire Pro duration
  - Removed automatically when subscription cancels/expires
  - Managed by cron job at `/api/cron/reset-expired-boosts`
- Proximity alerts for new jobs within radius
  - Configurable radius and trade filters
  - Checked by cron at `/api/cron/check-proximity-alerts`
- Profile view tracking ("X people viewed your profile")

**For Employers:**
- Custom screening questions (max 5 per job)
  - Stored in `jobs.custom_questions` JSONB
  - Answers in `job_applications.custom_answers` JSONB
- Advanced candidate filtering
  - Filter by verified certifications
  - Filter by experience level
- Job analytics dashboard
  - Total views, unique visitors, applications
  - Conversion rate tracking
  - Date range filtering (7/30/all time)

### Sentry Integration

**Comprehensive Monitoring:**
- Client: Browser errors, performance, session replay
- Server: Error tracking, performance monitoring
- Edge: Separate edge runtime configuration
- User context automatically added from Supabase auth
- Configured in `sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`
- Tunnel route: `/monitoring` (avoids ad blockers)

## Important Implementation Details

### Environment Variables

Required variables (see `.env.example`):
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=      # Server-only, bypasses RLS

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_ID_PRO_MONTHLY=
STRIPE_PRICE_ID_PRO_ANNUAL=

# Google Maps (for location autocomplete)
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=

# Application
NEXT_PUBLIC_APP_URL=            # For OAuth redirects
NODE_ENV=development
```

### Data Fetching Pattern

**React Query for client-side data:**
```typescript
// Custom hook in features/[feature]/hooks/
export function useJobs(filters: JobFilters) {
  return useQuery({
    queryKey: ['jobs', filters],
    queryFn: async () => {
      const supabase = createClient(); // Browser client
      const query = supabase.from('jobs').select('*');

      // Apply filters...

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
```

**Global React Query config** (`app/layout.tsx`):
- `staleTime: 5 * 60 * 1000` (5 minutes)
- `gcTime: 10 * 60 * 1000` (10 minutes cache)

### Image Handling

**Supabase Storage Buckets:**
- `profile-images` - User profile pictures
- `certification-photos` - Certification document uploads
- `application-files` - Resume/document uploads for applications

**Upload Pattern:**
```typescript
// Browser compression first
import imageCompression from 'browser-image-compression';
const compressedFile = await imageCompression(file, { maxSizeMB: 1 });

// Server action upload
export async function uploadImage(formData: FormData) {
  const file = formData.get('file') as File;
  const supabase = await createClient(await cookies());

  const fileName = `${userId}/${Date.now()}.${ext}`;
  const { data, error } = await supabase.storage
    .from('bucket-name')
    .upload(fileName, file);

  if (error) return { success: false, error: error.message };

  const publicUrl = supabase.storage.from('bucket-name').getPublicUrl(fileName);
  return { success: true, url: publicUrl.data.publicUrl };
}
```

### Mobile Responsiveness

**Layout Approach:**
- Mobile-first design with Tailwind CSS
- Dashboard uses responsive sidebar
  - Mobile: Bottom navigation bar
  - Tablet+: Left sidebar
- Tested across viewports: iPhone 13 Pro, iPad Pro, Desktop (1920x1080)
- Automated E2E tests for mobile in `e2e/mobile-responsiveness.spec.ts`

### API Routes vs Server Actions

**Use Server Actions for:**
- All internal mutations (create job, update profile, etc.)
- Authentication checks
- Database queries

**Use API Routes only for:**
- **Webhooks** (external services calling in): `/api/webhooks/stripe`
- **Cron jobs** (scheduled tasks): `/api/cron/reset-expired-boosts`
- **External integrations** that must be HTTP endpoints

## Common Development Tasks

### Adding a New Feature

1. Create feature module in `features/[feature-name]/`
2. Add Server Actions in `actions/` with auth/authorization
3. Create UI components in `components/`
4. Add custom hooks for data fetching in `hooks/`
5. Add TypeScript types in `types/`
6. Create route page in `app/dashboard/[route]/page.tsx`
7. Write E2E tests in `e2e/[feature].spec.ts`
8. Update `revalidatePath()` calls as needed

### Adding a Database Table

1. Create migration in `supabase/migrations/XXX_table_name.sql`
2. Include: table schema, RLS policies, indexes, triggers
3. Apply migration: Run locally first, then in production
4. Add TypeScript types in feature's `types/` directory
5. Create Server Actions for CRUD operations
6. Test with E2E tests

### Debugging Authentication Issues

1. Check middleware is running: `console.log` in `middleware.ts`
2. Verify cookies are being set: Check browser DevTools → Application → Cookies
3. Check Supabase client type:
   - Server Actions: `createClient(await cookies())`
   - Admin operations: `createServiceClient()`
   - Client Components: browser `createClient()`
4. Verify RLS policies in Supabase dashboard
5. Check user session: `await supabase.auth.getUser()` in Server Action

### Testing Stripe Locally

1. Install Stripe CLI: `brew install stripe/stripe-cli/stripe`
2. Login: `stripe login`
3. Forward webhooks: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`
4. Use test cards: `4242 4242 4242 4242` (Visa success)
5. Check webhook logs in terminal and Stripe dashboard

### Deploying to Production

1. Push to main branch (Vercel auto-deploys)
2. Ensure environment variables are set in Vercel dashboard
3. Configure Stripe webhook in Stripe dashboard to point to production URL
4. Test authentication flows in production
5. Monitor Sentry for errors
6. Check Vercel logs for build/runtime issues

## Migration Strategy

Database migrations are in `supabase/migrations/` numbered sequentially:
- `001_` through `044_` applied in order
- Latest migrations add storage buckets, RLS policies, notification system
- Apply new migrations via Supabase dashboard or CLI
- Always test migrations locally first

## Current Project Status

See `docs/plans/progress-checklist.md` for detailed phase-by-phase progress tracking.

**Completed:**
- ✅ Phase 0: Foundation (Next.js, Supabase, Auth, Testing)
- ✅ Phase 1: Free MVP (Profiles, Jobs, Applications, Messaging)
- ✅ Phase 2: Monetization (Stripe integration, Pro subscriptions)
- ✅ Phase 3: Advanced Pro Features (Analytics, custom questions, proximity alerts)

**In Progress:**
- Admin dashboard enhancements (analytics, Sentry integration)
- Performance optimization
- Production testing and bug fixes

**Tech Stack:**
- Next.js 16 (App Router)
- React 19
- TypeScript
- Tailwind CSS 4
- Supabase (PostgreSQL + PostGIS + Auth + Storage + Realtime)
- TanStack Query v5
- Stripe (payments)
- Sentry (monitoring)
- Vitest + Playwright (testing)
- Deployed on Vercel
