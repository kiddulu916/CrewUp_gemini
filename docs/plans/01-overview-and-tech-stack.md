# 01 - Overview & Tech Stack

## Project Overview

KrewUp is being rebuilt as a production-ready full-stack application connecting skilled trade workers with employers (contractors and recruiters). This is a real business venture aiming for production deployment with revenue generation through Pro subscriptions.

## Business Model

- **Free Tier**: Job posting, job browsing, basic messaging, basic profiles
- **Pro Tier**:
  - Monthly: $15/month
  - Annual: $150/year (save $30)
- **Pro Features**:
  - Workers: Real-time proximity alerts, profile boost, "Who Viewed Me" analytics, advanced job compatibility scoring, direct contact sharing
  - Employers: Advanced certification filtering, unlimited candidate search, bulk job posting templates, candidate analytics dashboard, custom screening questions

## Core Technology Stack

### Frontend
- **Framework**: Next.js 14+ with App Router
- **Language**: TypeScript
- **UI Components**: React Server Components + Client Components
- **Styling**: Tailwind CSS with shadcn/ui component library
- **State Management**:
  - TanStack Query (React Query) for server state
  - Zustand for UI state (modals, current view, etc.)

### Backend
- **API**: Next.js API Routes (REST)
- **Database**: Supabase (PostgreSQL)
- **Real-time**: Supabase Real-time subscriptions
- **Authentication**: Supabase Auth (Google OAuth + email/password)
- **File Storage**: Supabase Storage (certification images)
- **Geospatial**: PostGIS (built into Supabase)

### Payments
- **Provider**: Stripe
- **Method**: Stripe Checkout (upgradeable to Stripe Elements later)
- **Features**: Subscriptions API, webhooks, customer portal

### Testing
- **Unit/Integration**: Vitest + React Testing Library
- **Strategy**: Pragmatic core coverage - focus on critical paths (auth, payments, business logic)
- **E2E**: Playwright (for critical flows if needed)

### DevOps & Deployment
- **Hosting**: Vercel (Next.js) + Supabase (database/auth/storage)
- **CI/CD**: GitHub Actions
- **Monitoring**: Vercel Analytics + Sentry (error tracking)
- **Environment Management**: `.env.local` for development, Vercel environment variables for production

## Build Strategy

**Approach**: Clean slate rebuild with phased feature rollout

1. **Phase 0 - Foundation**: Design complete database schema and infrastructure upfront
2. **Phase 1 - Free MVP**: Build and ship free features (auth, profiles, job posting, basic messaging)
3. **Phase 2 - Monetization**: Add payment infrastructure and basic Pro features
4. **Phase 3 - Advanced Pro**: Implement advanced Pro features (proximity alerts, analytics)

## Key Architectural Decisions

### Why Next.js?
- Modern React with Server Components for performance
- Built-in API routes eliminate need for separate backend
- Easy to add marketing/landing pages with SEO
- Excellent deployment options (Vercel)
- Great developer experience

### Why Supabase?
- PostgreSQL with real-time subscriptions (no custom WebSocket server needed)
- Built-in authentication (supports Google OAuth)
- File storage for certification uploads
- Row Level Security for data protection
- Better pricing model than Firebase
- SQL power for complex queries and analytics

### Why TanStack Query + Zustand?
- TanStack Query handles server state with automatic caching, background refetching, and optimistic updates
- Zustand handles simple UI state without boilerplate
- Modern best practice for React applications
- Pairs perfectly with Supabase real-time

### Why Stripe Checkout first?
- Fastest time to market
- Stripe handles PCI compliance, payment methods, receipts
- Can upgrade to Stripe Elements later for better UX
- Subscription management is the same either way

## Success Criteria

- **Phase 1**: Working MVP with 50+ beta users posting/browsing jobs
- **Phase 2**: First paid Pro subscriber within 2 weeks of launch
- **Phase 3**: 100+ Pro subscribers, validate which features users value most

## Development Timeline Estimate

- **Phase 0** (Foundation): Setup project, database, auth - 3-5 days
- **Phase 1** (Free MVP): Core features - 2-3 weeks
- **Phase 2** (Monetization): Payment + basic Pro features - 1-2 weeks
- **Phase 3** (Advanced Pro): Advanced features - 2-3 weeks

Total: 6-9 weeks for full production-ready application with all Pro features
