# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## IMPORTANT: Development Plan

**ALWAYS reference the `docs/plans` folder when working on this project.**

This project is undergoing a complete rebuild from a single-file React app to a production-ready Next.js application. The `docs/plans` folder contains comprehensive implementation guides:

- **00-implementation-roadmap.md** - Complete phased implementation plan (Phases 0-3)
- **01-overview-and-tech-stack.md** - Tech stack decisions and architecture
- **02-database-schema.md** - Complete PostgreSQL schema with all tables
- **03-folder-structure.md** - Hybrid folder architecture
- **04-authentication-flow.md** - Supabase Auth implementation
- **05-api-architecture.md** - REST API design and endpoints
- **06-realtime-messaging.md** - Real-time messaging with Supabase
- **07-payment-subscription-system.md** - Stripe integration
- **08-pro-features-implementation.md** - Pro subscription features
- **09-testing-strategy.md** - Pragmatic testing approach
- **10-deployment-strategy.md** - Deployment and operations
- **progress-checklist.md** - Complete task checklist for tracking progress

### Development Workflow

When working on this project:

1. **Always check** `progress-checklist.md` **first** to see what's been completed and what's next
2. **Follow the phases in order** as outlined in `00-implementation-roadmap.md`
3. **Update** `progress-checklist.md` by checking off tasks as you complete them
4. **Reference the specific design document** for implementation details
5. **Never skip phases** - each phase builds on the previous one

### Current Status

**Phase 1 (Free MVP) - Near Completion** ✅

The Next.js rebuild is well underway with most core features implemented:

**✅ Completed:**
- Database schema with PostGIS support
- Complete authentication flow (email/password + Google OAuth)
- Automatic profile creation via database triggers
- 3-step onboarding with automatic device location capture
- Phone number auto-formatting and email auto-fill
- Profile management (view, edit, certifications, experience)
- Job posting and feed with distance-based sorting
- Job applications system
- Real-time messaging (using polling for cost efficiency)
- Google Places Autocomplete integration
- PostGIS coordinate storage and queries
- Complete database reset script for development
- Deployed to production at https://get-krewup.vercel.app

**🔧 In Progress:**
- Manual testing of all features
- Certification photo upload (code complete, needs Supabase Storage bucket config)
- Mobile responsiveness improvements

**📋 Next Up:**
- End-to-end testing of all user flows
- Beta user invitations
- Stripe integration for Pro subscriptions (Phase 2)

**Legacy Note**: The single-file React app in `krewup.jsx` is the legacy version and should NOT be modified. All new work happens in the Next.js app following the development plan.

---

## Project Overview

KrewUp is a mobile-first Next.js web application connecting skilled trade workers with employers (contractors and recruiters). Built with Next.js 15, TypeScript, Supabase (PostgreSQL + PostGIS), and Stripe.

**Business Model**: Free job posting and messaging for all users. Pro subscription ($15/month or $150/year) offers advanced features like real-time proximity alerts, profile boosts, certification filtering, and analytics dashboards.

## Architecture

### Single-File Application Structure

The application is organized as a monolithic React component in `krewup.jsx` with the following architectural layers:

1. **Configuration Layer** (lines 8-12): Reads global variables injected at runtime:
   - `__app_id`: Application identifier for multi-tenancy
   - `__firebase_config`: Firebase project configuration
   - `__initial_auth_token`: Optional custom authentication token

2. **Data Layer** (lines 16-65): Static constants defining:
   - 10 trade categories (Carpenter, Electrician, Plumber, HVAC, Welder, Mason, Roofer, Painter, Heavy Equipment Operator, General Laborer)
   - Each trade has 4-9 specialized subcategories (e.g., Carpenter: Rough Frame, Finish, Drywall, Cabinetry)
   - Role system (Worker/Employer)
   - Employer types (Contractor/Recruiter)
   - Subscription tiers (Free/Pro)
   - Standard certifications (OSHA 10/30, First Aid/CPR, Journeyman License, etc.)

3. **Firebase Integration** (lines 87-146):
   - Multi-tenant data structure: `/artifacts/{appId}/public/data/{collection}`
   - Custom hook `useFirebase()` handles initialization and authentication
   - Supports anonymous, custom token, and Google OAuth sign-in
   - All collections are public and scoped by app ID

4. **Data Management Hooks** (lines 150-282):
   - `useProfiles()`: User profile CRUD, location services, onboarding state detection
   - `useJobs()`: Job listing queries and posting with real-time updates
   - Both use Firestore `onSnapshot` for live data synchronization

5. **UI Components** (lines 286-end):
   - Context-based state management via `AppContext`
   - View-based routing: Feed, Profile, Messages, PostJob
   - Onboarding flow triggered by profile name starting with "User-"

### Key Architectural Patterns

**Multi-Tenancy**: All Firestore paths include `appId` to isolate data between deployments. This allows the same codebase to serve multiple instances (e.g., regional markets, whitelabel partners).

**Authentication Flow**:
1. Anonymous sign-in by default (read-only access to public data)
2. Google OAuth for persistent identity
3. Custom token support for backend integration
4. Profile auto-created on first Google sign-in using display name

**State Management**:
- Single `AppContext` provides all shared state (no Redux/Zustand)
- Real-time updates via Firestore listeners
- View switching through `currentView` state
- Message recipient tracking for direct messaging UI

**Geolocation**:
- Uses browser Geolocation API with `enableHighAccuracy: true`
- Falls back to Chicago coordinates (41.8781, -87.6298) on permission denial
- Haversine formula (`haversineDistance()`) calculates distances between user location and jobs
- Distance is used to sort job feed

**Onboarding Logic**:
- Triggered when `myProfile.name.startsWith('User-')`
- Blocks all UI until user provides name and role
- Auto-populates name from Google OAuth `displayName` if available
- Sets default trade to "General Laborer" after onboarding

## Data Schema

### Profiles Collection
Path: `/artifacts/{appId}/public/data/profiles/{userId}`

Fields:
- `userId` (string): Firebase Auth UID
- `name` (string): Full name (triggers onboarding if starts with "User-")
- `role` (string): "Worker" or "Employer"
- `subscriptionStatus` (string): "Free" or "Pro"
- `employerType` (string|null): "Contractor" or "Recruiter" (only for Employer role)
- `trade` (string): Primary trade category
- `subTrade` (string|null): Specialized subcategory
- `location` (string): Human-readable address
- `coords` (object|null): `{lat: number, lng: number}`
- `bio` (string): Profile description
- `certifications` (array): List of certification names
- `experience` (array): Work history entries
- `updatedAt` (timestamp): Auto-set via `serverTimestamp()`

### Jobs Collection
Path: `/artifacts/{appId}/public/data/jobs/{autoId}`

Fields:
- `title` (string): Job posting title
- `trade` (string): Required trade category
- `subTrade` (string|null): Specialized subcategory requirement
- `jobType` (string): Job classification (e.g., "Hired", "Contract")
- `location` (string): Human-readable job site address
- `coords` (object|null): `{lat: number, lng: number}`
- `description` (string): Job details
- `payRate` (string): Compensation information
- `requiredCerts` (array): List of required certifications
- `employerId` (string): Firebase Auth UID of poster
- `employerName` (string): Name of posting employer
- `createdAt` (timestamp): Auto-set via `serverTimestamp()`

## Development Context

### Environment Setup

This is a **zero-configuration** application with no build tooling. It assumes:
1. React and React-DOM are available globally
2. Firebase SDK v9+ is loaded (modular imports)
3. Tailwind CSS is available for styling
4. JSX transformation happens at runtime or via hosting platform

To run locally, you would need to create an HTML file that:
1. Loads React, Firebase, and Tailwind from CDN
2. Sets global configuration variables (`__app_id`, `__firebase_config`)
3. Imports and renders the KrewUp component

### Firebase Configuration

Required Firestore security rules:
```javascript
match /artifacts/{appId}/public/data/{collection}/{document=**} {
  allow read: if true;  // Public read access
  allow write: if request.auth != null;  // Authenticated write
}
```

### Styling System

Uses Tailwind CSS utility classes with custom brand colors:
- `krewup-blue`: Primary brand color (used for header, buttons)
- `krewup-orange`: Accent color for CTAs and active states
- Mobile-first responsive design with `max-w-xl` containers
- Fixed header with `z-10`, content must account for header height

### UI State Machine

The application uses view-based routing controlled by `currentView` state:

- **Feed**: Job listings filtered by trade/distance with real-time updates
- **Profile**: Edit user profile, trade selection, location, certifications, subscription management
- **Messages**: Direct messaging UI (placeholder implementation, no backend)
- **PostJob**: Job posting form (only accessible to Employer role)

View switching is handled by tabs in the `Header` component. The PostJob tab only appears for users with `role === 'Employer'`.

### Pro Subscription Features

The application references a Pro subscription tier but the implementation appears incomplete. According to `KrewUp Pro Subscription Details.md`, Pro features include:

**Worker Pro ($15/month or $150/year)**:
- Real-time proximity alerts for nearby jobs
- Profile boost in employer searches
- "Who Viewed Me" analytics
- Advanced job compatibility scoring
- Direct contact sharing

**Employer Pro**:
- Advanced certification filtering (verified uploads only)
- Unlimited candidate search
- Bulk job posting templates
- Candidate analytics dashboard
- Custom screening questions

### Known Limitations

1. **Incomplete Implementation**: The `krewup.jsx` file is truncated at line 515. The `JobPostingForm` component is incomplete and missing its closing tags/logic.

2. **No Build System**: This is a single JSX file with no package.json, bundler, or development server configuration.

3. **No Testing**: No test files, test commands, or testing infrastructure exists.

4. **Messaging Placeholder**: The Messages view is UI-only with no backend implementation. It displays a placeholder when a `messageRecipient` is selected.

5. **Pro Features Not Implemented**: While subscription status is stored in profiles, none of the Pro features (proximity alerts, analytics, filtering) appear to be implemented in the code.

6. **No Version Control**: This directory is not a git repository. Consider initializing git before making changes.

## Working with This Codebase

Since this is a single-file application with no build tooling:

1. **All changes happen in `krewup.jsx`**
2. **Test changes by refreshing in browser** (assuming proper HTML wrapper)
3. **Firebase changes require Firestore rules update**
4. **New constants should be added near lines 16-65**
5. **New hooks follow the pattern at lines 150-282**
6. **New components added after line 286**

The file structure is strictly linear (top-to-bottom):
- Imports → Configuration → Constants → Utils → Hooks → Components → Export

When adding features, maintain this organization to keep the single-file structure navigable.
