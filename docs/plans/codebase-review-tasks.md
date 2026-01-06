# KrewUp Codebase Review - Task Tracker

**Review Date:** January 6, 2026  
**Status:** In Progress

This document tracks all issues, improvements, and tasks identified during the comprehensive codebase review.

---

## Table of Contents

1. [Database & Schema](#1-database--schema)
2. [Code Refactoring](#2-code-refactoring)
3. [Security](#3-security)
4. [Pro Features](#4-pro-features)
5. [Real-time & Polling](#5-real-time--polling)
6. [Testing](#6-testing)
7. [Performance](#7-performance)
8. [UI/UX](#8-uiux)
9. [Documentation & Types](#9-documentation--types)
10. [Marketing & SEO](#10-marketing--seo)
11. [Admin Dashboard](#11-admin-dashboard)
12. [Ad Monetization](#12-ad-monetization)

---

## 1. Database & Schema

### Completed ✅

- [x] **Add missing columns to `job_applications` table**
  - Added `form_data` (jsonb)
  - Added `custom_answers` (jsonb)
  - Added `resume_extracted_text` (text)
  - Added `cover_letter_url` (text)

- [x] **Add `custom_questions` column to `jobs` table**
  - For employer-defined screening questions (Pro feature)

- [x] **Enable RLS on unprotected tables** (11 tables)
  - certifications, licenses, home_owners, recruiters, developers
  - experiences, education, portfolio_images
  - conversations, messages, notifications

- [x] **Add RLS policies for all tables**
  - Certifications & licenses policies
  - Employer type tables (home_owners, recruiters, developers)
  - Profile data tables (experiences, education, portfolio_images)
  - Messaging tables (conversations, messages)
  - Notifications table

- [x] **Add missing database indexes**
  - job_applications indexes (status, created_at)
  - jobs indexes (employer_id + status)
  - messages indexes (read_at, conversation_id + created_at)
  - notifications indexes (user_id + read_at)
  - conversations indexes (participant_1_id, participant_2_id)
  - experiences, education, portfolio_images indexes

- [x] **Create `update_user_coords` RPC function**
  - Replaced non-existent `supabase.rpc('sql', ...)` call
  - Created `update_job_coords` function as well

### Pending ⏳

- [ ] **Review and update existing RLS policies**
  - Audit `jobs` table policies for completeness
  - Audit `job_applications` table policies
  - Ensure service role operations work correctly

- [ ] **Add `stripe_processed_events` table migration** (if not exists)
  - For webhook idempotency

- [ ] **Add `subscription_history` table migration** (if not exists)
  - For tracking subscription events

- [ ] **Add `content_reports` table policies** (if missing)
  - Users can create reports
  - Only admins can update/view all

- [ ] **Add `user_moderation_actions` table policies** (if missing)

- [ ] **Database query optimization**
  - Review N+1 query patterns
  - Add composite indexes where needed
  - Consider materialized views for analytics

---

## 2. Code Refactoring

### Completed ✅

- [x] **Add `getFullName` helper to `lib/utils.ts`**
  - `getFullName(user)` - Gets full name from first_name/last_name
  - `getInitials(user)` - Gets initials from user name
  - `getFirstName(user)` - Gets first name only
  - Added `UserName` type definition

- [x] **Refactor `app/dashboard/layout.tsx`**
  - Updated to use `getFullName()` instead of `profile.name`
  - Updated to use `profile.first_name` for sidebar display

- [x] **Refactor `app/admin/moderation/page.tsx`**
  - Updated query to fetch `first_name, last_name`
  - Compute `name` using `getFullName()`

- [x] **Refactor `app/admin/certifications/page.tsx`**
  - Updated query to use correct schema (workers → users join)
  - Compute `name` using `getFullName()`

- [x] **Fix `features/profiles/actions/profile-actions.ts`**
  - Updated to use new `update_user_coords` RPC function

- [x] **Refactor remaining `profile.name` usages**
  - Updated admin pages (users, settings, moderation)
  - Updated public profile page
  - Updated about-tab component
  - Updated moderation components

- [x] **Refactor messaging components**
  - Messaging hooks already fetch first_name/last_name
  - Types updated to use ParticipantInfo

- [x] **Update TypeScript types**
  - Updated PublicProfile type to remove computed `name` field
  - Created central types/index.ts with common types
  - Updated messaging types with ParticipantInfo types

- [x] **Refactor job-related components**
  - Updated job detail page (`app/dashboard/jobs/[id]/page.tsx`)
  - Updated application detail page (`app/dashboard/applications/[id]/page.tsx`)
  - Updated applications list with filter component
  - Updated certification filter actions
  - All components now use `getFullName()` helper

- [x] **Refactor notification components**
  - Notification components use notification title/message (no user names)
  - No changes needed

- [x] **Refactor messaging components**
  - Updated chat-window.tsx to use `getFullName()` and `getInitials()`
  - Updated use-messages.ts to fetch `first_name, last_name`
  - Updated messages page to use new patterns
  - ConversationItem and MessageBubble use computed `name` from hooks

### Pending ⏳

- [x] **Standardize error handling in server actions**
  - Created `lib/utils/action-response.ts` with:
    - `success()` and `error()` response helpers
    - `getUserFriendlyError()` for safe error messages
    - `requireAuth()`, `requireAdmin()`, `requirePro()` guards
    - `handleActionError()` wrapper for try/catch
  - Refactored `suspendUser` as example implementation

- [x] **Add input validation to server actions**
  - Created `lib/validation/schemas.ts` with Zod schemas
  - Added `validateInput()` helper to action-response.ts
  - Refactored `suspendUser` and `banUser` to use Zod validation
  - Field-level error support in ActionResponse type

---

## 3. Security

### Completed ✅

- [x] **Enabled RLS on all public tables**
- [x] **Added RLS policies for data protection**

- [x] **Fix hardcoded Supabase project ID in `sentry.client.config.ts`**
  - Now dynamically finds Supabase auth token key using regex pattern

- [x] **Environment variable validation**
  - Created `lib/env.ts` with Zod schemas for all env vars
  - Added startup validation in `instrumentation.ts`
  - Provides type-safe access to environment variables

- [x] **Implement rate limiting**
  - Created `lib/security/rate-limit.ts` utility
  - Added rate limiting to authentication (5/min), signup (3/min), password reset (5/min)
  - Added rate limiting to messaging (30/min) and file uploads (10/min)
  - Logs rate limit exceeded events to Sentry
  - Supports per-IP and per-user rate limiting

- [x] **Add CSRF protection**
  - Verified Next.js Server Actions include automatic CSRF protection
  - All mutations use Server Actions (not raw API routes)

- [x] **Audit webhook security**
  - Stripe webhook already has signature verification
  - Added timeout handling (30 second limit)
  - Created `webhook_logs` table for audit logging
  - Added suspicious activity logging to Sentry
  - Logs all webhook events with status (received/processed/failed/timeout)

- [x] **Review file upload security**
  - Created `lib/security/file-validation.ts` utility
  - Added magic bytes verification (validates actual file content, not just extension)
  - Added file name sanitization (path traversal, dangerous extensions)
  - Existing file type and size validation
  - Logs suspicious file type mismatches to Sentry

- [x] **Add SQL injection protection**
  - All Supabase queries use parameterized queries by default
  - Fixed buggy `.rpc('sql', ...)` calls in onboarding and job actions
  - Now use proper RPC functions (`update_user_coords`, `update_job_coords`)
  - Removed potential for raw SQL execution

---

## 4. Pro Features

### Completed ✅

- [x] **Update boost logic for continuous Pro boosting**
  - Changed from 7-day expiring boost to continuous
  - Set `boost_expires_at: null` for continuous boosting
  - Updated Stripe webhook handler

- [x] **Update cron job for boost sync**
  - Now syncs boosts with subscription status
  - Removes boosts from users without active Pro
  - Protects lifetime Pro users

- [x] **Update BoostBadge component**
  - Added `isActive` prop
  - Removed expiry countdown display

- [x] **Update BoostManager component**
  - Removed manual activation/deactivation
  - Shows continuous boost status
  - Updated messaging

### Pending ⏳

- [ ] **Implement proximity alerts**
  - Create proximity alert settings UI
  - Implement notification trigger logic
  - Add cron job for proximity checking

- [ ] **Complete job analytics dashboard**
  - Job view tracking
  - Application conversion rates
  - Date range filtering

- [ ] **Implement profile view tracking**
  - Track unique profile views
  - Display view count to Pro workers

- [ ] **Advanced candidate filtering (employers)**
  - Filter by verified certifications
  - Filter by experience level
  - Filter by skills/trades

---

## 5. Real-time & Polling

### Completed ✅

- [x] **Optimize polling for messages**
  - Created `lib/hooks/use-smart-polling.ts` with intelligent intervals
  - Active interval: 2s when chatting, 10s when idle
  - Exponential backoff on errors (up to 60s max)
  - Tab visibility handling (pauses when hidden)

- [x] **Optimize polling for notifications**
  - Active interval: 30s, idle: 60s
  - Same smart polling pattern as messages
  - Pauses when tab hidden

- [x] **Add polling status indicators**
  - Created `components/ui/polling-status.tsx`
  - Shows sync status (Live, Idle, Paused, Syncing, Error)
  - Shows last sync time
  - Connection error banner with retry button

- [x] **Implement stale-while-revalidate pattern**
  - Smart polling hook includes staleTime based on interval
  - Shows cached data immediately while refreshing
  - Visual indicator when fetching in background

- [x] **Consider WebSocket fallback preparation**
  - Abstracted polling into reusable `useSmartPolling` hook
  - Clean interface that can be swapped for WebSocket later
  - Status object compatible with real-time updates

---

## 6. Testing

### Completed ✅

- [x] **Add unit tests for lib/utils.ts**
  - Tests for `cn`, `formatDate`, `formatRelativeTime`
  - Tests for `sleep`, `truncate`
  - Tests for `getFullName`, `getInitials`, `getFirstName`
  - All 39 tests passing

- [x] **Expand unit tests further**
  - Added tests for `lib/ads/config.ts` (shouldShowAds, getAdSlotId)
  - Added tests for `lib/security/file-validation.ts` (validateFile, sanitizeFileName)
  - Added tests for `lib/hooks/use-smart-polling.ts` (POLLING_CONFIGS, formatLastSyncTime)
  - Added tests for `lib/utils/action-response.ts` (success, error, validateInput)
  - Total: 134+ unit tests passing

- [x] **Add integration tests**
  - Added `message-actions.test.ts` - Send, mark read, conversations
  - Added `application-actions.test.ts` - Submit, withdraw, get applications
  - Added `auth-actions.test.ts` - User creation, sessions, roles
  - Added `notification-actions.test.ts` - Get, mark read, delete notifications

- [x] **Expand E2E tests**
  - Added `admin.spec.ts` - Admin dashboard, access control, navigation
  - Added `error-states.spec.ts` - 404 pages, auth errors, empty states

- [x] **Add mobile-specific E2E tests**
  - Added `mobile-interactions.spec.ts` - Bottom nav, touch, gestures
  - Enhanced existing `mobile-responsiveness.spec.ts`

- [x] **Add accessibility tests**
  - Added `accessibility.spec.ts` with axe-core integration
  - Keyboard navigation tests
  - Screen reader support tests
  - Color contrast tests
  - Installed `@axe-core/playwright`

- [x] **Add performance tests**
  - Enhanced `lighthouserc.json` with desktop preset
  - Added `lighthouserc.mobile.json` for mobile testing
  - Created `.github/workflows/lighthouse-ci.yml` for CI integration
  - Added `e2e/performance.spec.ts` for Core Web Vitals with Playwright
  - Added `performance-budget.json` with resource budgets
  - Added npm scripts: `test:perf`, `test:perf:lhci`, `test:perf:all`

### Pending ⏳

---

## 7. Performance

### Completed ✅

- [x] **Image optimization**
  - Created `components/ui/avatar.tsx` with Next.js Image and blur placeholders
  - Replaced all raw `<img>` tags with optimized Avatar component
  - Updated next.config.ts with AVIF/WebP formats and optimized device sizes
  - Added minimum cache TTL for better performance

- [x] **Code splitting**
  - Added @next/bundle-analyzer with `npm run analyze` command
  - Created lazy-loaded chart components (`components/admin/lazy-charts.tsx`)
  - Created lazy-loaded job analytics (`features/jobs/components/lazy-job-analytics.tsx`)
  - Created lazy-loaded portfolio manager (`features/portfolio/components/lazy-portfolio.tsx`)
  - Updated admin pages and profile tabs to use lazy components

- [x] **Database query optimization**
  - Fixed N+1 query in `use-messages.ts` - now uses JOIN for sender data
  - Optimized `use-conversations.ts` - batch fetches participants, messages, unread counts
  - Added pagination to jobs query with `useInfiniteJobs` hook
  - Added limits to all major queries

- [x] **React Query optimization**
  - Improved global config in `providers/query-provider.tsx`
  - Increased gcTime to 15 minutes for better cache retention
  - Added prefetch context and `usePrefetch` hook
  - Created prefetch hooks for jobs, conversations, profiles (`lib/hooks/use-prefetch-job.ts`)
  - Structural sharing enabled for query deduplication

### Pending ⏳

- [ ] **Run and fix Lighthouse audits**
  - Performance score > 90
  - Accessibility score > 90
  - Best practices score > 90
  - SEO score > 90

---

## 8. UI/UX

### Pending ⏳

- [~] **Replace emoji icons with proper icons** (In Progress)
  - ✅ Installed lucide-react (already present)
  - ✅ Updated `notification-bell.tsx` - Bell icon
  - ✅ Updated `boost-manager.tsx` - Rocket, AlertTriangle, CheckCircle, Star icons
  - Remaining: Job detail page, Application detail page emojis
  - Pattern established - continue replacing `<span className="text-2xl">emoji</span>` with Lucide components

- [ ] **Add proper loading states**
  - Skeleton loaders for lists
  - Loading indicators for buttons
  - Page-level loading states

- [ ] **Add empty states**
  - No jobs found
  - No applications
  - No messages
  - No notifications

- [ ] **Add error boundaries**
  - Implement error boundary components
  - Add fallback UI for errors
  - Log errors to Sentry

- [ ] **Improve form validation UX**
  - Real-time validation feedback
  - Clear error messages
  - Focus management on errors

- [ ] **Add toast notifications**
  - Success notifications
  - Error notifications
  - Action confirmations

- [ ] **Improve mobile navigation**
  - Review bottom nav usability
  - Add swipe gestures
  - Improve touch targets

---

## 9. Documentation & Types

### Completed ✅

- [x] **Consolidate type definitions**
  - Created `types/index.ts` with common types
  - Added ActionResponse, PaginationParams, etc.
  - Updated feature-specific types

### Pending ⏳

- [ ] **Remove `as any` type casts**
  - Fix type casts in Stripe webhook handler
  - Fix type casts in admin components
  - Add proper type definitions

- [x] **Generate TypeScript types from Supabase**
  - Generated types using `mcp_supabase_generate_typescript_types`
  - Created `types/database.ts` with all table types
  - Added convenient type exports (User, Job, etc.)

- [ ] **Add JSDoc comments**
  - Document all exported functions
  - Document complex logic
  - Add usage examples

- [ ] **Update README**
  - Add setup instructions
  - Document environment variables
  - Add contribution guidelines

---

## 10. Marketing & SEO

### Completed ✅

- [x] **Complete landing page**
  - Hero section with value proposition
  - Feature highlights (6 key features)
  - Testimonials/social proof (3 testimonials)
  - Stats section (users, jobs, employers, match rate)
  - How It Works section (for workers and employers)
  - Trade ticker animation
  - Call to action sections
  - Responsive navigation
  - Footer with links

- [x] **Complete pricing page**
  - Side-by-side Free vs Pro comparison
  - Feature comparison table (workers and employers)
  - FAQ section (6 common questions)
  - Call to action section
  - Responsive navigation

- [x] **Implement SEO best practices**
  - Added meta descriptions and keywords
  - Implemented Open Graph tags
  - Implemented Twitter card tags
  - Created `sitemap.ts` (dynamic sitemap.xml)
  - Created `robots.ts` (dynamic robots.txt)

### Pending ⏳

- [ ] **Add analytics**
  - Set up conversion tracking
  - Track user journeys
  - Monitor funnel drop-offs

---

## 11. Admin Dashboard

### Completed ✅

- [x] **Complete user management**
  - Search and filter users by name, email, role, subscription
  - View user details (profile info, moderation history)
  - Suspend/ban users with reasons
  - Grant/revoke Pro subscriptions
  - Moderation history tracking

- [x] **Complete certification verification**
  - Review pending certifications
  - Approve/reject workflow with status filters
  - Verification notes support
  - Count displays per status (pending/verified/rejected/flagged)

- [x] **Complete content moderation**
  - Review reported content with status filters
  - Take action on reports (action/dismiss/review)
  - Track moderation history
  - Reporter and reported user info display

- [x] **Add analytics dashboard**
  - User activity metrics (DAU/WAU/MAU)
  - Subscription metrics (free/pro/conversion/MRR)
  - Conversion funnel visualization
  - Operational load (pending certifications, moderation queue)
  - Weekly trend charts

- [x] **Add platform settings**
  - Configuration settings with edit capabilities
  - Admin user management (grant/revoke access)
  - Activity log with detailed action history
  - Search users for admin granting

- [x] **Sentry monitoring integration**
  - System health status
  - Error rate metrics and charts
  - Recent issues with links to Sentry
  - Filter by user segment (role/subscription)

---

## 12. Ad Monetization

### Completed ✅

- [x] **Create ad infrastructure**
  - Created `lib/ads/` module with types, config, consent, hooks, tracking
  - Created `components/ads/` with AdUnit, InFeedAd, SidebarAd, ConsentBanner
  - Added Google AdSense support with consent mode v2
  - Created `ad_impressions` database table with RLS policies

- [x] **Implement ad placements for free tier**
  - `AdUnit` - Base component with responsive sizing
  - `InFeedAd` - For job feed (every N items)
  - `SidebarAd` - For sidebars with upgrade CTA
  - `AdPlaceholder` - For Pro users (shows appreciation)
  - IAB standard ad sizes supported

- [x] **Create ad-free experience for Pro users**
  - `shouldShowAds()` helper checks subscription status
  - All ad components respect Pro subscription
  - "Go Pro to remove ads" CTAs included

- [x] **Ad performance tracking**
  - `trackAdImpression()` server action
  - `trackAdClick()` server action  
  - `getAdMetrics()` for admin dashboard
  - Indexes for efficient analytics queries

- [x] **Ad policy & compliance**
  - GDPR/CCPA consent banner component
  - `getConsentStatus()` / `saveConsentStatus()` for localStorage
  - Region detection (EU/California/Other)
  - Google Consent Mode v2 integration
  - Blocked ad categories configurable

- [x] **Integrate ads into pages**
  - Added ConsentBanner to root layout (`app/layout.tsx`)
  - Added AdScripts to root layout for Google AdSense
  - Added InFeedAd to job listings (`page-client.tsx`)
  - Added FeedAdBanner to feed page
  - Added SidebarAd to public profile pages

- [x] **Create admin ad metrics dashboard**
  - Created `/admin/ads` page with metrics
  - Impressions over time chart (last 7 days)
  - CTR by placement visualization
  - Revenue estimates (based on $2 CPM)
  - Configuration status display
  - Added link in admin dashboard

---

## Summary Statistics

| Category | Completed | Pending | Total |
|----------|-----------|---------|-------|
| Database & Schema | 6 | 6 | 12 |
| Code Refactoring | 13 | 1 | 14 |
| Security | 9 | 0 | 9 |
| Pro Features | 4 | 4 | 8 |
| Real-time & Polling | 5 | 0 | 5 |
| Testing | 7 | 0 | 7 |
| Performance | 4 | 1 | 5 |
| UI/UX | 1 | 6 | 7 |
| Documentation & Types | 2 | 3 | 5 |
| Marketing & SEO | 3 | 1 | 4 |
| Admin Dashboard | 6 | 0 | 6 |
| Ad Monetization | 7 | 0 | 7 |
| **TOTAL** | **67** | **23** | **90** |

---

## Priority Order (Recommended)

### High Priority (Do First)
1. ~~**Admin Dashboard**~~ ✅ Complete!
2. ~~**Marketing & SEO**~~ ✅ (Landing, pricing, SEO done - analytics pending)
3. ~~**Real-time & Polling**~~ ✅ Complete!
4. ~~**Security Hardening**~~ ✅ Complete!
5. ~~**Performance**~~ ✅ (4/5 complete - Lighthouse audits pending)

### Medium Priority
6. **Ad Monetization** - Implement ad placements for free tier users
7. **Testing** - Expand unit, integration, E2E, and accessibility tests

### Lower Priority
8. UI/UX improvements (loading states, empty states, error boundaries)
9. Documentation updates (JSDoc, README)

---

*Last Updated: January 6, 2026 - Session 5*

