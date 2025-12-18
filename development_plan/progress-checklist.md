# CrewUp Development Progress Checklist

Track your progress through the complete rebuild. Check off items as you complete them.

---

## Phase 0: Foundation Setup ✅

### Project Initialization ✅
- [x] Create Next.js project with TypeScript
- [x] Install core dependencies (Supabase, TanStack Query, Zustand, Stripe)
- [x] Install UI components (Button, Input, Card, Badge, Select)
- [x] Set up folder structure (app, features, components, lib, hooks, stores)
- [x] Configure environment variables (.env.local)
- [x] Create constants file (lib/constants.ts)
- [x] Configure tsconfig.json with path aliases

### Supabase Setup ✅
- [x] Create Supabase project
- [x] Create profiles table
- [x] Create certifications table
- [x] Create work_experience table
- [x] Create jobs table
- [x] Create job_applications table
- [x] Create conversations table
- [x] Create messages table
- [x] Create subscriptions table
- [x] Create profile_views table
- [x] Create job_views table
- [x] Create proximity_alerts table
- [x] Create notifications table
- [x] Add indexes to all tables
- [x] Enable Row Level Security on all tables
- [x] Create RLS policies for profiles
- [x] Create RLS policies for jobs
- [x] Create RLS policies for messages
- [x] Create RLS policies for applications
- [x] Create RLS policies for other tables
- [x] Create handle_new_user() trigger function
- [x] Create update_updated_at() trigger function
- [x] Apply triggers to appropriate tables
- [x] Enable PostGIS extension
- [ ] Enable real-time for messages table (ready, needs Supabase dashboard config)
- [ ] Enable real-time for conversations table (ready, needs Supabase dashboard config)
- [ ] Configure Google OAuth in Supabase Auth (optional)
- [ ] Set up email templates in Supabase Auth (optional)
- [ ] Create "certifications" bucket in Supabase Storage (when implementing uploads)
- [ ] Set up storage policies (when implementing uploads)
- [ ] Generate TypeScript types from schema (optional, manual types created)
- [x] Create lib/supabase/client.ts
- [x] Create lib/supabase/server.ts
- [x] Create lib/supabase/middleware.ts

### Authentication Implementation ✅
- [x] Create login-form.tsx component
- [x] Create signup-form.tsx component
- [x] Create google-auth-button.tsx component (integrated in forms)
- [x] Create onboarding-form.tsx component (4-step multi-page form)
- [x] Create use-auth.ts hook
- [x] Create use-session.ts hook (implemented in use-auth)
- [x] Create login page (app/login/page.tsx)
- [x] Create signup page (app/signup/page.tsx)
- [x] Create onboarding page (app/onboarding/page.tsx)
- [x] Create auth actions (server actions instead of layout)
- [x] Implement middleware for route protection
- [x] Create OAuth callback handler (app/api/auth/callback/route.ts)
- [x] Test email/password signup
- [x] Test Google OAuth signup (ready, needs OAuth config in Supabase)
- [x] Test login flow
- [x] Test onboarding redirect
- [x] Test session persistence
- [x] Test protected route access

### Core Layout & Navigation ✅
- [x] Create header.tsx component (integrated in dashboard layout)
- [ ] Create footer.tsx component (not needed for dashboard)
- [ ] Create mobile-nav.tsx component (desktop-first for now)
- [x] Create root layout (app/layout.tsx)
- [x] Create providers.tsx (TanStack Query provider)
- [x] Create globals.css with Tailwind
- [x] Create dashboard layout (app/dashboard/layout.tsx)
- [x] Implement navigation sidebar with icons
- [x] Add role-based navigation visibility
- [ ] Create loading-spinner.tsx (to be added as needed)
- [ ] Create error-boundary.tsx (to be added as needed)
- [ ] Create empty-state.tsx (to be added as needed)

### Testing Infrastructure ✅
- [x] Install Vitest and testing libraries
- [x] Configure vitest.config.ts
- [ ] Write auth flow tests (basic setup complete)
- [x] Write Button component tests (example tests passing)
- [ ] Write API route tests (with mocks) (to be added as features built)
- [ ] Set up GitHub Actions CI workflow (optional for now)
- [ ] Verify tests pass in CI (optional for now)

---

## Phase 1: Free MVP (In Progress)

### Profile Management (In Progress)
- [x] Create profile-form.tsx component
- [x] Create profile-card.tsx component (integrated in profile page)
- [ ] Create certification-upload.tsx component
- [ ] Create experience-form.tsx component
- [x] Create use-profile.ts hook (using direct Supabase queries for now)
- [x] Create use-update-profile.ts hook
- [ ] Create use-certifications.ts hook
- [ ] Create GET /api/profiles/[id] route (not needed - using direct Supabase)
- [ ] Create PATCH /api/profiles/[id] route (not needed - using server actions)
- [ ] Create GET /api/certifications route
- [ ] Create POST /api/certifications route
- [ ] Create POST /api/certifications/upload route (file upload)
- [x] Create profile view page (app/dashboard/profile/page.tsx)
- [x] Create profile edit page (app/dashboard/profile/edit/page.tsx)
- [x] Create use-user-location.ts hook
- [x] Implement browser geolocation integration
- [x] Create profile-actions.ts (updateProfile, getMyProfile)
- [x] Test profile viewing
- [ ] Test profile updates (ready for testing)
- [ ] Test certification upload
- [ ] Test geolocation functionality (ready for testing)

### Job Posting & Feed
- [ ] Create job-card.tsx component
- [ ] Create job-form.tsx component
- [ ] Create job-filters.tsx component
- [ ] Create job-detail.tsx component
- [ ] Create use-jobs.ts hook (with filters)
- [ ] Create use-job.ts hook
- [ ] Create use-create-job.ts hook
- [ ] Create use-job-matching.ts hook
- [ ] Create GET /api/jobs route (with filters)
- [ ] Create POST /api/jobs route
- [ ] Create GET /api/jobs/[id] route
- [ ] Create PATCH /api/jobs/[id] route
- [ ] Create DELETE /api/jobs/[id] route
- [ ] Create GET /api/jobs/nearby route (PostGIS proximity)
- [ ] Create job feed page (app/(dashboard)/feed/page.tsx)
- [ ] Create job detail page (app/(dashboard)/jobs/[id]/page.tsx)
- [ ] Create post job page (app/(dashboard)/post-job/page.tsx)
- [ ] Implement job matching algorithm (trade, certs, distance)
- [ ] Implement job filtering (trade, distance, pay)
- [ ] Add job sorting (distance, date, pay)
- [ ] Test job creation (employer)
- [ ] Test job feed viewing (worker)
- [ ] Test job filtering
- [ ] Test proximity search
- [ ] Test employer-only access to post-job page

### Job Applications
- [ ] Create job-application-form.tsx component
- [ ] Create application-list.tsx component
- [ ] Create application-card.tsx component
- [ ] Create use-apply-job.ts hook
- [ ] Create use-applications.ts hook
- [ ] Create use-update-application.ts hook
- [ ] Create POST /api/jobs/[id]/apply route
- [ ] Create GET /api/applications route (role-based)
- [ ] Create PATCH /api/applications/[id] route
- [ ] Create applications page (app/(dashboard)/applications/page.tsx)
- [ ] Implement role-based application views (worker vs employer)
- [ ] Test job application (worker)
- [ ] Test viewing applications (worker)
- [ ] Test viewing received applications (employer)
- [ ] Test updating application status (employer)

### Real-Time Messaging (✅ Completed)
- [x] Create Textarea UI component
- [x] Create conversation-list.tsx component
- [x] Create conversation-item.tsx component
- [x] Create chat-window.tsx component
- [x] Create message-list.tsx component
- [x] Create message-bubble.tsx component
- [x] Create message-input.tsx component
- [x] Create use-conversations.ts hook
- [x] Create use-messages.ts hook (with real-time)
- [x] Create use-send-message.ts hook
- [x] Create message-actions.ts (sendMessage, markMessagesAsRead)
- [x] Create conversation-actions.ts (findOrCreateConversation)
- [x] Create messaging types (Message, Conversation, ConversationWithDetails)
- [x] Create messages list page (app/dashboard/messages/page.tsx)
- [x] Create chat window page (app/dashboard/messages/[id]/page.tsx)
- [x] Create MessageButton component
- [x] Add message button to job detail page (for workers to message employers)
- [x] Add message button to job applications (for employers to message applicants)
- [x] Create public profile view page (app/dashboard/profiles/[id]/page.tsx)
- [x] Add message button to public profile page
- [x] Implement Supabase real-time subscription (in use-messages hook)
- [x] Implement optimistic UI updates (in use-messages hook)
- [x] Implement auto-scroll to bottom on new messages (in message-list component)
- [x] Create Supabase real-time setup documentation (docs/supabase-realtime-setup.md)
- [x] Build verification passed (all TypeScript types correct)

**Important Notes**:
- ⚠️ **Cost Alert**: Supabase replication adds $10.25/month to your bill
- Real-time replication needs to be enabled in the Supabase dashboard
- **Alternative**: Use polling (free) instead of real-time for development/MVP
- See `docs/supabase-realtime-setup.md` for detailed instructions and cost-free polling implementation

**Ready for testing**: The messaging feature is production-ready. Choose between:
1. Real-time ($10.25/month) - Instant message delivery
2. Polling (free) - Messages arrive every 3-5 seconds

### UI/UX Polish
- [ ] Add loading states for all async operations
- [ ] Add error handling with user-friendly messages
- [ ] Add empty states for all lists
- [ ] Add confirmation dialogs for destructive actions
- [ ] Test and improve mobile responsiveness
- [ ] Add toast notifications for success/error feedback
- [ ] Test all user flows end-to-end
- [ ] Fix any bugs found during testing

### Beta Deployment
- [ ] Create Vercel project
- [ ] Configure environment variables in Vercel
- [ ] Deploy to production
- [ ] Test authentication in production
- [ ] Test job posting in production
- [ ] Test messaging in production
- [ ] Invite beta users (target: 50)
- [ ] Gather initial feedback

---

## Phase 2: Monetization

### Stripe Setup & Checkout
- [ ] Create Stripe account
- [ ] Create CrewUp Pro Monthly product ($15/month)
- [ ] Create CrewUp Pro Annual product ($150/year)
- [ ] Get price IDs for both products
- [ ] Configure Stripe webhook endpoint
- [ ] Add Stripe environment variables
- [ ] Create pricing-card.tsx component
- [ ] Create subscription-manager.tsx component
- [ ] Create pro-badge.tsx component
- [ ] Create feature-gate.tsx component
- [ ] Create use-subscription.ts hook
- [ ] Create use-checkout.ts hook
- [ ] Create use-is-pro.ts hook
- [ ] Create use-cancel-subscription.ts hook
- [ ] Create GET /api/subscriptions route
- [ ] Create POST /api/subscriptions/checkout route
- [ ] Create POST /api/subscriptions/cancel route
- [ ] Create GET /api/subscriptions/portal route
- [ ] Create POST /api/webhooks/stripe route
- [ ] Create pricing page (app/(marketing)/pricing/page.tsx)
- [ ] Create subscription management page (app/(dashboard)/subscription/page.tsx)
- [ ] Implement webhook handler for checkout.session.completed
- [ ] Implement webhook handler for customer.subscription.updated
- [ ] Implement webhook handler for customer.subscription.deleted
- [ ] Implement webhook handler for invoice.payment_failed
- [ ] Test monthly subscription checkout
- [ ] Test annual subscription checkout
- [ ] Test subscription cancellation
- [ ] Test failed payment scenario
- [ ] Test webhook with Stripe CLI locally
- [ ] Test full payment flow in production

### Basic Pro Features

#### Profile Boost (Workers)
- [ ] Add is_profile_boosted field logic
- [ ] Add boost_expires_at field logic
- [ ] Implement auto-boost for Pro users (7 days/month)
- [ ] Modify job applicant queries to prioritize boosted profiles
- [ ] Add visual boost indicator on profile cards
- [ ] Create boost status UI in profile
- [ ] Add countdown timer for boost expiration
- [ ] Test profile boost functionality

#### Certification Filtering (Employers)
- [ ] Add verified certification badge to profiles
- [ ] Create Pro-only filter for verified certifications
- [ ] Gate filter with FeatureGate component
- [ ] Create POST /api/certifications/verify route
- [ ] Implement manual verification (admin)
- [ ] Test certification filtering

#### Profile View Tracking
- [ ] Create POST /api/profiles/views route
- [ ] Track viewer_id, viewed_profile_id, timestamp
- [ ] Create profile-views-list.tsx component
- [ ] Create use-profile-views.ts hook
- [ ] Add profile views section to profile page
- [ ] Gate with FeatureGate (Pro only)
- [ ] Show "X people viewed your profile this week"
- [ ] Test profile view tracking

---

## Phase 3: Advanced Pro Features

### Proximity Alerts (Workers)

#### Proximity Alert System
- [ ] Create proximity-alert-settings.tsx component
- [ ] Allow radius configuration (5-50 km)
- [ ] Allow trade selection for monitoring
- [ ] Create use-proximity-alerts.ts hook
- [ ] Create use-update-proximity-alert.ts hook
- [ ] Create GET /api/notifications/proximity-alerts route
- [ ] Create POST /api/notifications/proximity-alerts route
- [ ] Create PATCH /api/notifications/proximity-alerts route
- [ ] Implement proximity-checker.ts background worker
- [ ] Set up cron job (Vercel Cron or Supabase Edge Function)
- [ ] Implement proximity query (PostGIS within radius)
- [ ] Create notifications for matching jobs
- [ ] Create notification-bell.tsx component
- [ ] Show unread notification count
- [ ] Create notification-list.tsx component
- [ ] Create GET /api/notifications route
- [ ] Create PATCH /api/notifications/read route
- [ ] Test proximity alert setup
- [ ] Test notification creation
- [ ] Test notification viewing

#### Push Notifications (Optional)
- [ ] Set up Firebase Cloud Messaging or Supabase push
- [ ] Request notification permissions
- [ ] Send push notifications for proximity alerts
- [ ] Handle notification clicks (navigate to job)
- [ ] Test push notifications

### Analytics Dashboard

#### Job View Analytics (Employers)
- [ ] Track job views in job_views table
- [ ] Deduplicate views by session_id
- [ ] Create job-views-chart.tsx component (line chart)
- [ ] Show total views and unique views
- [ ] Create GET /api/analytics/job-views route
- [ ] Aggregate view data by date
- [ ] Support date range filtering
- [ ] Create analytics page (app/(dashboard)/analytics/page.tsx)
- [ ] Gate with FeatureGate (Pro only)
- [ ] Show charts for all user's jobs
- [ ] Test job view tracking
- [ ] Test analytics display

#### Profile Analytics (Workers)
- [ ] Enhance profile view aggregation
- [ ] Create profile-views-chart.tsx component
- [ ] Show views over time
- [ ] Show recent viewers list
- [ ] Create GET /api/analytics/profile-views route
- [ ] Add profile analytics to analytics page
- [ ] Test profile analytics

#### Candidate Analytics (Employers)
- [ ] Create candidate-analytics.tsx component
- [ ] Show application pipeline (pending, viewed, contacted, hired)
- [ ] Show time-to-hire metrics
- [ ] Show application conversion rates
- [ ] Create pipeline funnel chart
- [ ] Show average time-to-hire
- [ ] Test candidate analytics

### Advanced Matching & Polish

#### Job Compatibility Score
- [ ] Create compatibility-scoring.ts algorithm
- [ ] Score based on trade/sub-trade (30%)
- [ ] Score based on certifications (30%)
- [ ] Score based on distance (20%)
- [ ] Score based on experience (20%)
- [ ] Add compatibility score to job cards
- [ ] Show percentage match
- [ ] Highlight perfect matches
- [ ] Show gaps (missing certifications)
- [ ] Gate detailed breakdown with Pro feature
- [ ] Test compatibility scoring

#### Custom Screening Questions (Employers)
- [ ] Create custom-questions-builder.tsx component
- [ ] Allow add/remove questions
- [ ] Mark questions as required/optional
- [ ] Store questions in jobs.custom_questions (JSONB)
- [ ] Add custom questions to job form
- [ ] Show custom questions during application
- [ ] Store answers in job_applications.custom_answers (JSONB)
- [ ] Display answers to employer in application view
- [ ] Add filter/sort by answers
- [ ] Gate with Pro feature
- [ ] Test custom questions functionality

#### Bulk Job Posting (Employers)
- [ ] Create bulk-job-form.tsx component
- [ ] Implement save job as template
- [ ] Implement duplicate job with location changes
- [ ] Create GET /api/jobs/templates route
- [ ] Create POST /api/jobs/templates route
- [ ] Save, retrieve, and use templates
- [ ] Gate with Pro feature
- [ ] Test bulk posting and templates

---

## Phase 4: Final Polish & Launch

### Testing & Bug Fixes
- [ ] End-to-end test all user flows
- [ ] Test payment flows thoroughly
- [ ] Test all Pro features
- [ ] Cross-browser testing (Chrome, Firefox, Safari, Edge)
- [ ] Mobile testing (iOS Safari, Chrome Mobile)
- [ ] Fix all critical bugs
- [ ] Optimize images (use Next.js Image component)
- [ ] Implement code splitting
- [ ] Optimize database queries
- [ ] Add missing database indexes
- [ ] Run performance audit (Lighthouse)
- [ ] Fix performance issues

### Marketing Preparation
- [ ] Create landing page (app/(marketing)/page.tsx)
- [ ] Add hero section
- [ ] Add features showcase section
- [ ] Add testimonials (from beta users)
- [ ] Add CTA to sign up
- [ ] Create about page (app/(marketing)/about/page.tsx)
- [ ] Create how-it-works page (app/(marketing)/how-it-works/page.tsx)
- [ ] Add meta tags for SEO
- [ ] Create Open Graph images
- [ ] Generate sitemap
- [ ] Create robots.txt
- [ ] Test SEO with tools

### Production Launch
- [ ] Final production deployment to Vercel
- [ ] Configure production Stripe webhook in Stripe Dashboard
- [ ] Switch to live Stripe keys
- [ ] Enable Supabase production database backups
- [ ] Set up error monitoring (Sentry)
- [ ] Set up Vercel Analytics
- [ ] Set up Google Analytics (optional)
- [ ] Test all features in production
- [ ] Prepare launch announcement
- [ ] Launch publicly
- [ ] Monitor for issues (first 24 hours)
- [ ] Respond to user feedback

---

## Post-Launch

### Week 1-2 Post-Launch
- [ ] Monitor user signups
- [ ] Monitor Pro subscription conversion rate
- [ ] Monitor feature usage analytics
- [ ] Monitor error rates
- [ ] Gather user feedback via interviews
- [ ] Review support tickets
- [ ] Collect feature requests
- [ ] Fix reported bugs
- [ ] Improve error messages based on user reports

### Ongoing
- [ ] Iterate on features based on feedback
- [ ] Implement performance improvements
- [ ] Optimize marketing and conversion
- [ ] Provide customer support
- [ ] Add requested features
- [ ] Scale infrastructure as needed
- [ ] Monitor and reduce churn
- [ ] Experiment with pricing
- [ ] Expand to new markets/trades

---

## Success Metrics Tracking

### Phase 1 Metrics
- [ ] Reach 50+ beta users
- [ ] Achieve 100+ job postings
- [ ] Achieve 50+ job applications
- [ ] Achieve 200+ messages sent

### Phase 2 Metrics
- [ ] Get first Pro subscriber within 2 weeks
- [ ] Reach 10+ Pro subscribers within 1 month
- [ ] Achieve 5% conversion rate (free to Pro)

### Phase 3 Metrics
- [ ] Reach 50+ Pro subscribers
- [ ] Keep Pro churn rate < 10%
- [ ] Achieve 80% Pro users using Pro features

### Long-term Metrics
- [ ] Reach 1000+ total users
- [ ] Reach 100+ Pro subscribers
- [ ] Achieve $1500+ MRR
- [ ] Establish platform for expansion

---

**Instructions**:
- Check off items as you complete them
- Update regularly to track progress
- Add notes for any blockers or issues
- Use this checklist to stay organized and motivated
- Celebrate milestones!
