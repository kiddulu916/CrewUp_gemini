# 00 - Implementation Roadmap

## Overview

This roadmap outlines the complete implementation plan for rebuilding CrewUp from a single-file React app to a production-ready Next.js application with Supabase and Stripe integration.

**Strategy**: Clean slate rebuild with phased feature rollout
- Phase 0: Foundation (infrastructure setup)
- Phase 1: Free MVP (core features for validation)
- Phase 2: Monetization (payment integration + basic Pro features)
- Phase 3: Advanced Pro (advanced premium features)

**Total Estimated Time**: 6-9 weeks

---

## Phase 0: Foundation Setup (3-5 days)

**Goal**: Set up project infrastructure, database, and authentication

### Step 1: Project Initialization (Day 1)

1. Create new Next.js project with TypeScript
   ```bash
   npx create-next-app@latest crewup-nextjs --typescript --tailwind --app --use-npm
   cd crewup-nextjs
   ```

2. Install core dependencies
   ```bash
   npm install @supabase/ssr @supabase/supabase-js
   npm install @tanstack/react-query zustand
   npm install stripe
   npm install zod date-fns
   npm install -D @types/node
   ```

3. Install shadcn/ui
   ```bash
   npx shadcn-ui@latest init
   npx shadcn-ui@latest add button input textarea select card dialog dropdown-menu avatar badge
   ```

4. Set up folder structure (reference: `03-folder-structure.md`)
   - Create `/app` routes with route groups
   - Create `/features` folders
   - Create `/components`, `/lib`, `/hooks`, `/stores` directories

5. Configure environment variables
   ```env
   # .env.local
   NEXT_PUBLIC_SUPABASE_URL=
   NEXT_PUBLIC_SUPABASE_ANON_KEY=
   SUPABASE_SERVICE_ROLE_KEY=
   NEXT_PUBLIC_URL=http://localhost:3000
   STRIPE_SECRET_KEY=
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
   STRIPE_WEBHOOK_SECRET=
   STRIPE_PRICE_MONTHLY=
   STRIPE_PRICE_ANNUAL=
   ```

6. Create constants file
   - Copy TRADES, CERTIFICATIONS, ROLES from old app
   - Path: `lib/constants.ts`

### Step 2: Supabase Setup (Day 1-2)

1. Create Supabase project at supabase.com

2. Run database migrations (reference: `02-database-schema.md`)
   - Create all 12 tables with proper indexes
   - Enable Row Level Security (RLS)
   - Create RLS policies
   - Create database triggers (handle_new_user, update_updated_at)
   - Enable PostGIS extension for geospatial queries
   - Enable real-time for messages and conversations tables

3. Configure Supabase Auth
   - Enable Google OAuth provider
   - Set redirect URLs
   - Configure email templates

4. Set up Supabase Storage
   - Create "certifications" bucket
   - Set up storage policies for authenticated uploads

5. Generate TypeScript types
   ```bash
   npx supabase gen types typescript --project-id <project-id> > lib/supabase/types.ts
   ```

6. Create Supabase client utilities
   - `lib/supabase/client.ts` (browser client)
   - `lib/supabase/server.ts` (server client)
   - `lib/supabase/middleware.ts` (middleware client)

### Step 3: Authentication Implementation (Day 2-3)

Reference: `04-authentication-flow.md`

1. Create auth components
   - `features/auth/components/login-form.tsx`
   - `features/auth/components/signup-form.tsx`
   - `features/auth/components/google-auth-button.tsx`
   - `features/auth/components/onboarding-form.tsx`

2. Create auth hooks
   - `features/auth/hooks/use-auth.ts`
   - `features/auth/hooks/use-session.ts`

3. Create auth pages
   - `app/(auth)/login/page.tsx`
   - `app/(auth)/signup/page.tsx`
   - `app/(auth)/onboarding/page.tsx`
   - `app/(auth)/layout.tsx`

4. Implement middleware for route protection
   - `app/middleware.ts`
   - Protect `/dashboard/*` routes
   - Redirect authenticated users from `/login`

5. Create OAuth callback handler
   - `app/api/auth/callback/route.ts`

6. Test authentication flow
   - Sign up with email/password
   - Sign in with Google OAuth
   - Onboarding redirect logic
   - Session persistence

### Step 4: Core Layout & Navigation (Day 3)

1. Create layout components
   - `components/layout/header.tsx`
   - `components/layout/footer.tsx`
   - `components/layout/mobile-nav.tsx`

2. Create root layout
   - `app/layout.tsx` (global providers)
   - `app/providers.tsx` (TanStack Query, Zustand)
   - `app/globals.css` (Tailwind imports)

3. Create dashboard layout
   - `app/(dashboard)/layout.tsx`
   - Navigation tabs (Feed, Profile, Messages, Post Job)
   - Role-based tab visibility

4. Create common components
   - `components/common/loading-spinner.tsx`
   - `components/common/error-boundary.tsx`
   - `components/common/empty-state.tsx`

### Step 5: Testing Infrastructure (Day 4-5)

1. Set up Vitest
   ```bash
   npm install -D vitest @testing-library/react @testing-library/jest-dom @vitejs/plugin-react jsdom
   ```

2. Configure vitest.config.ts

3. Write initial tests
   - Auth flow tests
   - Component tests for LoginForm
   - API route tests (mock Supabase)

4. Set up GitHub Actions CI
   - `.github/workflows/test.yml`
   - Run tests on push/PR

---

## Phase 1: Free MVP (2-3 weeks)

**Goal**: Ship working product with core free features to validate with users

### Week 1: Profiles & Jobs

#### Day 1-2: Profile Management

1. Create profile components
   - `features/profiles/components/profile-form.tsx`
   - `features/profiles/components/profile-card.tsx`
   - `features/profiles/components/certification-upload.tsx`
   - `features/profiles/components/experience-form.tsx`

2. Create profile hooks
   - `features/profiles/hooks/use-profile.ts`
   - `features/profiles/hooks/use-update-profile.ts`
   - `features/profiles/hooks/use-certifications.ts`

3. Create profile API routes
   - `app/api/profiles/[id]/route.ts` (GET, PATCH)
   - `app/api/certifications/route.ts` (GET, POST)
   - `app/api/certifications/upload/route.ts` (file upload to Supabase Storage)

4. Create profile pages
   - `app/(dashboard)/profile/page.tsx` (view own profile)
   - `app/(dashboard)/profile/edit/page.tsx`

5. Implement geolocation
   - `hooks/use-user-location.ts`
   - Browser Geolocation API integration
   - Update profile coords on location change

#### Day 3-5: Job Posting & Feed

1. Create job components
   - `features/jobs/components/job-card.tsx`
   - `features/jobs/components/job-form.tsx`
   - `features/jobs/components/job-filters.tsx`
   - `features/jobs/components/job-detail.tsx`

2. Create job hooks
   - `features/jobs/hooks/use-jobs.ts` (with filters)
   - `features/jobs/hooks/use-job.ts`
   - `features/jobs/hooks/use-create-job.ts`
   - `features/jobs/hooks/use-job-matching.ts`

3. Create job API routes (reference: `05-api-architecture.md`)
   - `app/api/jobs/route.ts` (GET with filters, POST)
   - `app/api/jobs/[id]/route.ts` (GET, PATCH, DELETE)
   - `app/api/jobs/nearby/route.ts` (PostGIS proximity search)

4. Create job pages
   - `app/(dashboard)/feed/page.tsx` (job feed with filters)
   - `app/(dashboard)/jobs/[id]/page.tsx` (job detail)
   - `app/(dashboard)/post-job/page.tsx` (employers only)

5. Implement job matching algorithm
   - `features/jobs/utils/job-matching-algorithm.ts`
   - Trade matching
   - Certification requirements
   - Distance calculation (Haversine formula)

6. Add job filtering
   - Filter by trade, sub-trade
   - Filter by distance (radius)
   - Filter by pay range
   - Sort by distance, date, pay

### Week 2: Job Applications & Messaging

#### Day 1-2: Job Applications

1. Create application components
   - `features/jobs/components/job-application-form.tsx`
   - `features/applications/components/application-list.tsx`
   - `features/applications/components/application-card.tsx`

2. Create application hooks
   - `features/jobs/hooks/use-apply-job.ts`
   - `features/applications/hooks/use-applications.ts`
   - `features/applications/hooks/use-update-application.ts`

3. Create application API routes
   - `app/api/jobs/[id]/apply/route.ts`
   - `app/api/applications/route.ts` (GET - role-based)
   - `app/api/applications/[id]/route.ts` (PATCH status)

4. Create application pages
   - `app/(dashboard)/applications/page.tsx`
   - Workers: see their applications
   - Employers: see applications to their jobs

#### Day 3-5: Real-Time Messaging

Reference: `06-realtime-messaging.md`

1. Create messaging components
   - `features/messaging/components/conversation-list.tsx`
   - `features/messaging/components/conversation-item.tsx`
   - `features/messaging/components/chat-window.tsx`
   - `features/messaging/components/message-list.tsx`
   - `features/messaging/components/message-input.tsx`

2. Create messaging hooks
   - `features/messaging/hooks/use-conversations.ts`
   - `features/messaging/hooks/use-messages.ts` (with real-time subscription)
   - `features/messaging/hooks/use-send-message.ts`

3. Create messaging API routes
   - `app/api/messages/route.ts` (POST - send message)
   - `app/api/messages/conversations/route.ts` (GET)
   - `app/api/messages/[conversationId]/mark-read/route.ts`

4. Create messaging pages
   - `app/(dashboard)/messages/page.tsx` (conversation list)
   - `app/(dashboard)/messages/[conversationId]/page.tsx` (chat window)

5. Implement real-time subscriptions
   - Supabase real-time channel setup
   - Listen for INSERT events on messages table
   - Update TanStack Query cache on new messages
   - Auto-scroll to bottom on new messages

### Week 3: Polish & Testing

#### Day 1-2: UI/UX Polish

1. Add loading states for all async operations
2. Add error handling and user-friendly error messages
3. Add empty states for lists
4. Add confirmation dialogs for destructive actions
5. Improve mobile responsiveness
6. Add toast notifications for success/error feedback

#### Day 3-4: Testing

1. Write tests for critical paths
   - Auth flow
   - Job posting
   - Job application
   - Message sending
2. Write API route tests
3. Fix bugs found during testing

#### Day 5: Beta Deployment

1. Set up Vercel project
2. Configure environment variables in Vercel
3. Deploy to production
4. Test all flows in production
5. Invite beta users (target: 50 users)

---

## Phase 2: Monetization (1-2 weeks)

**Goal**: Add payment infrastructure and basic Pro features to start generating revenue

### Week 1: Stripe Integration

Reference: `07-payment-subscription-system.md`

#### Day 1-2: Stripe Setup & Checkout

1. Create Stripe account and products
   - Monthly Pro: $15/month
   - Annual Pro: $150/year
   - Get price IDs

2. Configure Stripe webhook endpoint

3. Create subscription components
   - `features/subscriptions/components/pricing-card.tsx`
   - `features/subscriptions/components/subscription-manager.tsx`
   - `features/subscriptions/components/pro-badge.tsx`
   - `features/subscriptions/components/feature-gate.tsx`

4. Create subscription hooks
   - `features/subscriptions/hooks/use-subscription.ts`
   - `features/subscriptions/hooks/use-checkout.ts`
   - `features/subscriptions/hooks/use-is-pro.ts`
   - `features/subscriptions/hooks/use-cancel-subscription.ts`

5. Create subscription API routes
   - `app/api/subscriptions/route.ts` (GET current)
   - `app/api/subscriptions/checkout/route.ts` (POST - create session)
   - `app/api/subscriptions/cancel/route.ts` (POST)
   - `app/api/subscriptions/portal/route.ts` (GET - billing portal)
   - `app/api/webhooks/stripe/route.ts` (POST - handle events)

6. Create pricing page
   - `app/(marketing)/pricing/page.tsx`
   - Show both plans with feature comparison

7. Create subscription management page
   - `app/(dashboard)/subscription/page.tsx`
   - Show current plan, billing info
   - Cancel subscription button
   - Link to customer portal

#### Day 3-5: Webhook Implementation & Testing

1. Implement webhook handler
   - Handle checkout.session.completed
   - Handle customer.subscription.updated
   - Handle customer.subscription.deleted
   - Handle invoice.payment_failed

2. Test full payment flow
   - Use Stripe test cards
   - Test monthly subscription
   - Test annual subscription
   - Test subscription cancellation
   - Test failed payment

3. Test webhook locally with Stripe CLI
   ```bash
   stripe listen --forward-to localhost:3000/api/webhooks/stripe
   stripe trigger checkout.session.completed
   ```

### Week 2: Basic Pro Features

#### Day 1-2: Profile Boost (Workers)

1. Add profile boost logic
   - Update profiles table: is_profile_boosted, boost_expires_at
   - Pro users get auto-boost for 7 days per month

2. Modify job applicant queries
   - Boost boosted profiles to top of list
   - Add visual indicator on profile cards

3. Create boost management UI
   - Show boost status in profile
   - Countdown timer for boost expiration

#### Day 3-4: Certification Filtering (Employers)

1. Add verified certification badge
   - Visual indicator on worker profiles
   - Only show verified certs in filters

2. Add Pro-only filter option
   - Employers can filter by verified certifications only
   - Gate this feature with FeatureGate component

3. Implement certification verification API
   - `app/api/certifications/verify/route.ts`
   - Manual verification (admin only for now)
   - Future: automated name-matching

#### Day 5: Profile View Tracking ("Who Viewed Me")

1. Implement profile view tracking
   - `app/api/profiles/views/route.ts` (POST)
   - Track viewer_id, viewed_profile_id, timestamp

2. Create profile views component
   - `features/profiles/components/profile-views-list.tsx`
   - Show recent viewers (Pro feature)

3. Add to profile page
   - Gate with FeatureGate
   - Show "X people viewed your profile this week"

---

## Phase 3: Advanced Pro Features (2-3 weeks)

**Goal**: Implement advanced premium features to maximize subscription value

### Week 1: Proximity Alerts (Workers)

#### Day 1-3: Proximity Alert System

1. Create proximity alert components
   - `features/notifications/components/proximity-alert-settings.tsx`
   - Allow users to set radius (5-50 km)
   - Select trades to monitor

2. Create proximity alert hooks
   - `features/notifications/hooks/use-proximity-alerts.ts`
   - `features/notifications/hooks/use-update-proximity-alert.ts`

3. Create proximity alert API
   - `app/api/notifications/proximity-alerts/route.ts`
   - GET, POST, PATCH user's alert settings

4. Implement background job
   - `features/notifications/workers/proximity-checker.ts`
   - Cron job (Vercel Cron or Supabase Edge Function)
   - Runs every 10 minutes
   - Queries new jobs within user's radius
   - Creates notifications for Pro users

5. Add notification system
   - `features/notifications/components/notification-bell.tsx`
   - Show unread count
   - Notification dropdown list

6. Create notifications API
   - `app/api/notifications/route.ts` (GET)
   - `app/api/notifications/read/route.ts` (PATCH)

#### Day 4-5: Push Notifications (Optional)

1. Set up Firebase Cloud Messaging or Supabase push
2. Request notification permissions
3. Send push notifications for proximity alerts
4. Handle notification clicks (navigate to job)

### Week 2: Analytics Dashboard

#### Day 1-2: Job View Analytics (Employers)

1. Track job views
   - Enhance `app/api/jobs/[id]/route.ts`
   - Record view in job_views table
   - Deduplicate by session_id

2. Create analytics components
   - `features/analytics/components/job-views-chart.tsx`
   - Line chart showing views over time
   - Total views, unique views

3. Create analytics API
   - `app/api/analytics/job-views/route.ts`
   - Aggregate view data by date
   - Filter by date range

4. Create analytics page
   - `app/(dashboard)/analytics/page.tsx`
   - Show charts for all user's jobs
   - Gate with FeatureGate (Pro only)

#### Day 3-4: Profile Analytics (Workers)

1. Enhance profile view tracking
   - Already implemented in Phase 2
   - Add analytics aggregation

2. Create profile analytics components
   - `features/analytics/components/profile-views-chart.tsx`
   - Show views over time
   - Recent viewers list

3. Create profile analytics API
   - `app/api/analytics/profile-views/route.ts`
   - Aggregate view data

4. Add to analytics page
   - Show both job analytics (employers) and profile analytics (workers)

#### Day 5: Candidate Analytics (Employers)

1. Create employer analytics
   - Application pipeline (pending, viewed, contacted, hired)
   - Time-to-hire metrics
   - Application conversion rates

2. Create analytics components
   - `features/analytics/components/candidate-analytics.tsx`
   - Pipeline funnel chart
   - Average time-to-hire

### Week 3: Advanced Matching & Polish

#### Day 1-2: Job Compatibility Score

1. Implement compatibility algorithm
   - `features/jobs/utils/compatibility-scoring.ts`
   - Score based on:
     - Trade/sub-trade match (30%)
     - Certifications match (30%)
     - Distance (20%)
     - Experience (20%)

2. Add compatibility score to job cards
   - Show percentage match
   - Highlight perfect matches
   - Show gaps (missing certifications)

3. Gate with Pro feature
   - Free users see basic match indicator
   - Pro users see detailed score breakdown

#### Day 3-4: Custom Screening Questions (Employers)

1. Add custom questions to job form
   - `features/jobs/components/custom-questions-builder.tsx`
   - Add/remove questions
   - Mark as required/optional

2. Store questions in jobs.custom_questions (JSONB)

3. Add answers to application form
   - Show custom questions during application
   - Store answers in job_applications.custom_answers (JSONB)

4. Show answers to employer
   - Display in application view
   - Filter/sort applications by answers

#### Day 5: Bulk Job Posting (Employers)

1. Create bulk posting component
   - `features/jobs/components/bulk-job-form.tsx`
   - Save job as template
   - Duplicate job with location changes

2. Create template API
   - `app/api/jobs/templates/route.ts`
   - Save, retrieve, use templates

3. Gate with Pro feature

---

## Phase 4: Final Polish & Launch (1 week)

### Day 1-2: Testing & Bug Fixes

1. End-to-end testing
   - Test all user flows
   - Test payment flows
   - Test all Pro features
   - Cross-browser testing
   - Mobile testing

2. Fix critical bugs

3. Performance optimization
   - Image optimization
   - Code splitting
   - Database query optimization
   - Add database indexes

### Day 3-4: Marketing Preparation

1. Create landing page
   - `app/(marketing)/page.tsx`
   - Hero section
   - Features showcase
   - Testimonials (from beta users)
   - CTA to sign up

2. Create about page
   - `app/(marketing)/about/page.tsx`

3. Create how-it-works page
   - `app/(marketing)/how-it-works/page.tsx`

4. SEO optimization
   - Meta tags
   - Open Graph images
   - Sitemap
   - robots.txt

### Day 5: Production Launch

1. Final production deployment
2. Configure production Stripe webhook
3. Switch to live Stripe keys
4. Enable production database backups
5. Set up error monitoring (Sentry)
6. Set up analytics (Vercel Analytics, Google Analytics)
7. Launch announcement
8. Monitor for issues

---

## Post-Launch: Iteration

### Week 1-2 Post-Launch

1. Monitor metrics
   - User signups
   - Pro subscription conversion rate
   - Feature usage analytics
   - Error rates

2. Gather user feedback
   - User interviews
   - Support tickets
   - Feature requests

3. Bug fixes
   - Fix reported issues
   - Improve error messages

### Ongoing

1. Feature iteration based on feedback
2. Performance improvements
3. Marketing optimization
4. Customer support
5. Feature additions based on user needs

---

## Success Metrics

**Phase 1 (Free MVP)**:
- 50+ beta users
- 100+ job postings
- 50+ job applications
- 200+ messages sent

**Phase 2 (Monetization)**:
- First Pro subscriber within 2 weeks
- 10+ Pro subscribers within 1 month
- 5% conversion rate (free to Pro)

**Phase 3 (Advanced Pro)**:
- 50+ Pro subscribers
- Pro churn rate < 10%
- 80% of Pro users actively using Pro features

**Long-term**:
- 1000+ total users
- 100+ Pro subscribers
- $1500+ MRR
- Platform for expansion to other trades/regions
