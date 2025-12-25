# 03 - Folder Structure

## Overview

Hybrid architecture combining Next.js App Router conventions with feature-based organization for complex business logic.

## Complete Structure

```
krewup-nextjs/
├── .env.local                    # Environment variables (gitignored)
├── .env.example                  # Example env vars for setup
├── next.config.js                # Next.js configuration
├── tailwind.config.ts            # Tailwind CSS configuration
├── tsconfig.json                 # TypeScript configuration
├── package.json
│
├── public/                       # Static assets
│   ├── images/
│   └── icons/
│
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Route group for auth pages
│   │   ├── layout.tsx            # Auth layout (centered, no nav)
│   │   ├── login/
│   │   │   └── page.tsx
│   │   ├── signup/
│   │   │   └── page.tsx
│   │   └── onboarding/
│   │       └── page.tsx
│   │
│   ├── (dashboard)/              # Route group - shared layout
│   │   ├── layout.tsx            # Dashboard shell with header/nav
│   │   ├── feed/                 # Job feed
│   │   │   └── page.tsx
│   │   ├── profile/              # User profile
│   │   │   ├── page.tsx          # View own profile
│   │   │   └── edit/page.tsx    # Edit profile
│   │   ├── messages/             # Messaging interface
│   │   │   ├── page.tsx          # Conversation list
│   │   │   └── [conversationId]/
│   │   │       └── page.tsx      # Chat window
│   │   ├── post-job/             # Job posting (employers only)
│   │   │   └── page.tsx
│   │   ├── jobs/
│   │   │   └── [id]/
│   │   │       └── page.tsx      # Job detail page
│   │   ├── applications/         # Worker: my applications, Employer: received applications
│   │   │   └── page.tsx
│   │   ├── subscription/         # Subscription management
│   │   │   └── page.tsx
│   │   └── analytics/            # Pro feature: analytics dashboard
│   │       └── page.tsx
│   │
│   ├── (marketing)/              # Public pages
│   │   ├── layout.tsx            # Marketing layout
│   │   ├── page.tsx              # Landing page
│   │   ├── pricing/
│   │   │   └── page.tsx
│   │   ├── about/
│   │   │   └── page.tsx
│   │   └── how-it-works/
│   │       └── page.tsx
│   │
│   ├── api/                      # API routes
│   │   ├── auth/
│   │   │   └── callback/route.ts # OAuth callback
│   │   ├── jobs/
│   │   │   ├── route.ts          # GET, POST /api/jobs
│   │   │   ├── [id]/
│   │   │   │   ├── route.ts      # GET, PATCH, DELETE /api/jobs/:id
│   │   │   │   └── apply/route.ts # POST /api/jobs/:id/apply
│   │   │   └── nearby/route.ts   # GET /api/jobs/nearby (proximity search)
│   │   ├── profiles/
│   │   │   ├── route.ts
│   │   │   ├── [id]/
│   │   │   │   └── route.ts
│   │   │   └── views/route.ts    # POST /api/profiles/views (track view)
│   │   ├── applications/
│   │   │   ├── route.ts
│   │   │   └── [id]/route.ts
│   │   ├── messages/
│   │   │   ├── route.ts          # POST /api/messages (send)
│   │   │   └── conversations/
│   │   │       └── route.ts      # GET /api/messages/conversations
│   │   ├── certifications/
│   │   │   ├── route.ts
│   │   │   ├── upload/route.ts   # POST /api/certifications/upload
│   │   │   └── verify/route.ts   # POST /api/certifications/verify
│   │   ├── subscriptions/
│   │   │   ├── route.ts          # GET /api/subscriptions (current)
│   │   │   ├── checkout/route.ts # POST /api/subscriptions/checkout
│   │   │   ├── cancel/route.ts   # POST /api/subscriptions/cancel
│   │   │   └── portal/route.ts   # GET /api/subscriptions/portal
│   │   ├── notifications/
│   │   │   ├── route.ts          # GET /api/notifications
│   │   │   └── read/route.ts     # PATCH /api/notifications/read
│   │   ├── webhooks/
│   │   │   └── stripe/route.ts   # POST /api/webhooks/stripe
│   │   └── analytics/
│   │       ├── job-views/route.ts
│   │       └── profile-views/route.ts
│   │
│   ├── layout.tsx                # Root layout (providers, fonts)
│   ├── providers.tsx             # TanStack Query, Zustand providers
│   ├── globals.css               # Global styles, Tailwind imports
│   └── middleware.ts             # Auth middleware for protected routes
│
├── features/                     # Feature-based modules
│   ├── auth/
│   │   ├── components/
│   │   │   ├── login-form.tsx
│   │   │   ├── signup-form.tsx
│   │   │   ├── google-auth-button.tsx
│   │   │   └── onboarding-form.tsx
│   │   ├── hooks/
│   │   │   ├── use-auth.ts
│   │   │   └── use-session.ts
│   │   └── utils/
│   │       └── auth-helpers.ts
│   │
│   ├── jobs/
│   │   ├── components/
│   │   │   ├── job-card.tsx
│   │   │   ├── job-form.tsx
│   │   │   ├── job-filters.tsx
│   │   │   ├── job-detail.tsx
│   │   │   └── job-application-form.tsx
│   │   ├── hooks/
│   │   │   ├── use-jobs.ts
│   │   │   ├── use-job.ts
│   │   │   ├── use-create-job.ts
│   │   │   ├── use-apply-job.ts
│   │   │   └── use-job-matching.ts
│   │   ├── types/
│   │   │   └── index.ts
│   │   └── utils/
│   │       ├── job-matching-algorithm.ts
│   │       └── job-filters.ts
│   │
│   ├── messaging/
│   │   ├── components/
│   │   │   ├── chat-window.tsx
│   │   │   ├── message-list.tsx
│   │   │   ├── message-input.tsx
│   │   │   ├── conversation-list.tsx
│   │   │   └── conversation-item.tsx
│   │   ├── hooks/
│   │   │   ├── use-conversations.ts
│   │   │   ├── use-messages.ts
│   │   │   ├── use-send-message.ts
│   │   │   └── use-realtime-messages.ts
│   │   └── store/
│   │       └── messaging-store.ts   # Zustand: current conversation, typing indicators
│   │
│   ├── profiles/
│   │   ├── components/
│   │   │   ├── profile-card.tsx
│   │   │   ├── profile-form.tsx
│   │   │   ├── certification-upload.tsx
│   │   │   ├── certification-list.tsx
│   │   │   ├── experience-form.tsx
│   │   │   └── profile-boost-badge.tsx
│   │   ├── hooks/
│   │   │   ├── use-profile.ts
│   │   │   ├── use-update-profile.ts
│   │   │   ├── use-certifications.ts
│   │   │   └── use-profile-views.ts   # Pro feature
│   │   └── types/
│   │       └── index.ts
│   │
│   ├── subscriptions/
│   │   ├── components/
│   │   │   ├── pricing-card.tsx
│   │   │   ├── subscription-manager.tsx
│   │   │   ├── pro-badge.tsx
│   │   │   └── feature-gate.tsx      # Wraps Pro features
│   │   ├── hooks/
│   │   │   ├── use-subscription.ts
│   │   │   ├── use-checkout.ts
│   │   │   ├── use-cancel-subscription.ts
│   │   │   └── use-is-pro.ts
│   │   └── utils/
│   │       └── stripe-helpers.ts
│   │
│   ├── notifications/
│   │   ├── components/
│   │   │   ├── notification-bell.tsx
│   │   │   ├── notification-list.tsx
│   │   │   └── notification-item.tsx
│   │   ├── hooks/
│   │   │   ├── use-notifications.ts
│   │   │   ├── use-mark-read.ts
│   │   │   └── use-proximity-alerts.ts  # Pro feature
│   │   └── workers/
│   │       └── proximity-checker.ts     # Background job
│   │
│   └── analytics/
│       ├── components/
│       │   ├── analytics-dashboard.tsx
│       │   ├── job-views-chart.tsx
│       │   └── profile-views-list.tsx
│       └── hooks/
│           ├── use-job-analytics.ts
│           └── use-profile-analytics.ts
│
├── components/                   # Shared UI components
│   ├── ui/                       # shadcn/ui components
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── select.tsx
│   │   ├── dialog.tsx
│   │   ├── dropdown-menu.tsx
│   │   ├── card.tsx
│   │   ├── badge.tsx
│   │   ├── avatar.tsx
│   │   └── ... (other shadcn components)
│   ├── layout/
│   │   ├── header.tsx
│   │   ├── footer.tsx
│   │   ├── sidebar.tsx
│   │   └── mobile-nav.tsx
│   └── common/
│       ├── loading-spinner.tsx
│       ├── error-boundary.tsx
│       ├── empty-state.tsx
│       └── confirmation-dialog.tsx
│
├── lib/                          # Shared utilities
│   ├── supabase/
│   │   ├── client.ts             # Client-side Supabase
│   │   ├── server.ts             # Server-side Supabase
│   │   ├── middleware.ts         # Middleware Supabase
│   │   └── types.ts              # Generated DB types
│   ├── stripe/
│   │   └── client.ts             # Stripe initialization
│   ├── utils/
│   │   ├── geolocation.ts        # Haversine distance, PostGIS helpers
│   │   ├── validation.ts         # Zod schemas
│   │   ├── formatters.ts         # Date, currency formatting
│   │   └── cn.ts                 # Class name utility
│   └── constants.ts              # TRADES, CERTIFICATIONS, etc.
│
├── hooks/                        # Global shared hooks
│   ├── use-user-location.ts
│   ├── use-media-query.ts
│   └── use-debounce.ts
│
├── stores/                       # Zustand stores
│   └── ui-store.ts               # Current view, modals, drawer state
│
├── types/                        # Global TypeScript types
│   └── index.ts
│
└── tests/                        # Test files
    ├── unit/
    ├── integration/
    └── e2e/
```

## Key Principles

1. **App Router for routing** - Pages live in `app/`, organized by route groups
2. **Features for business logic** - Complex domains (messaging, jobs) get feature folders
3. **Shared components** - Truly generic UI components in `components/`
4. **Colocation** - Keep related code together within features
5. **Type safety** - Generated types from Supabase schema

## File Naming Conventions

- **Components**: `kebab-case.tsx` (e.g., `job-card.tsx`)
- **Hooks**: `use-kebab-case.ts` (e.g., `use-jobs.ts`)
- **Utils**: `kebab-case.ts` (e.g., `auth-helpers.ts`)
- **Types**: `index.ts` within feature folders
- **Pages**: `page.tsx` (Next.js convention)
- **Layouts**: `layout.tsx` (Next.js convention)

## Import Aliases

Configure in `tsconfig.json`:

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./*"],
      "@/components/*": ["components/*"],
      "@/features/*": ["features/*"],
      "@/lib/*": ["lib/*"],
      "@/hooks/*": ["hooks/*"],
      "@/stores/*": ["stores/*"],
      "@/types/*": ["types/*"]
    }
  }
}
```

Usage:
```typescript
import { Button } from '@/components/ui/button'
import { useJobs } from '@/features/jobs/hooks/use-jobs'
import { supabase } from '@/lib/supabase/client'
```
