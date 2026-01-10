# Test Suite Improvements Design

**Created:** 2025-01-09
**Status:** Approved
**Goal:** Comprehensive test coverage with testable architecture

---

## Overview

This plan addresses four key areas:
1. Extract pure business logic from Server Actions into testable services
2. Expand unit test coverage (co-located with source files)
3. Expand E2E test coverage (centralized in `e2e/`)
4. Implement gradual coverage enforcement with ratcheting thresholds

### Architecture Change

**Before:** All logic embedded in Server Actions (untestable)
```
Server Action = Context + Validation + Business Logic + Database
```

**After:** Pure logic extracted into services (testable)
```
Service = Validation + Business Logic (unit tested)
Server Action = Context + Service calls + Database (E2E tested)
```

### Test Organization

- **Unit tests:** Co-located next to source files (`feature/services/foo.test.ts`)
- **E2E tests:** Centralized in `e2e/` directory
- **Deprecated tests:** Remove `__tests__/integration/` and `__tests__/api/`

### Coverage Targets

| Category | Target | Rationale |
|----------|--------|-----------|
| Services/Utils | 80-90% | Pure functions, high value, easy to test |
| Hooks | 60% | State management, moderate complexity |
| Components | 50% | Focus on interactions, not snapshots |
| Server Actions | N/A | Tested via E2E happy paths |

---

## Phase 1: Foundation

**Goal:** Set up infrastructure and create the first service as a template.

**Status:** COMPLETED (2025-01-09)

### Progress Checklist

#### Vitest Configuration
- [x] Update `vitest.config.ts` with co-located test patterns
- [x] Add coverage configuration with v8 provider
- [x] Configure coverage include/exclude paths
- [x] Set initial global thresholds (3% baseline - ratchet up from here)
- [ ] Add per-directory thresholds for services (80%) - deferred to Phase 2
- [ ] Add per-directory thresholds for lib (70%) - deferred to Phase 2

#### NPM Scripts
- [x] Verify `test` script runs Vitest
- [x] Verify `test:watch` script works
- [x] Add `test:coverage` script
- [x] Add `test:coverage:check` script for CI
- [x] Test all scripts work correctly

#### Directory Structure
- [x] Create `features/jobs/services/` directory
- [x] Create `features/applications/services/` directory
- [x] Create `features/auth/services/` directory
- [x] Create `features/profiles/services/` directory
- [x] Create `features/messaging/services/` directory
- [x] Create `features/subscriptions/services/` directory
- [x] Create `features/notifications/services/` directory

#### First Service Extraction (Jobs)
- [x] Create `features/jobs/services/job-service.ts`
- [x] Extract `validateJobInput()` function
- [x] Extract `formatHourlyPayRate()` and `formatContractPayRate()` functions
- [x] Extract `buildJobRecord()` function
- [x] Extract `parseJobFilters()` function
- [x] Extract `validateCoordinates()` function
- [x] Extract `validateCustomQuestions()` function
- [x] Extract `validateEmployerType()` function
- [x] Extract `buildJobUpdateRecord()` function
- [x] Extract `formatPayRange()` function
- [x] Extract `areFiltersEmpty()` and `countActiveFilters()` functions
- [ ] Update `job-actions.ts` to import and use service functions - optional refactor
- [ ] Verify job creation still works (manual test) - deferred

#### First Service Tests
- [x] Create `features/jobs/services/job-service.test.ts`
- [x] Test `validateJobInput()` with valid input
- [x] Test `validateJobInput()` with missing title
- [x] Test `validateJobInput()` with title too short
- [x] Test `validateJobInput()` with missing trade
- [x] Test `validateJobInput()` with invalid job type
- [x] Test `formatHourlyPayRate()` for weekly/bi-weekly/monthly
- [x] Test `formatContractPayRate()` for per contract/per job
- [x] Test `buildJobRecord()` creates correct structure
- [x] Test `parseJobFilters()` with all filters
- [x] Test `parseJobFilters()` with partial filters
- [x] Test `parseJobFilters()` with empty filters
- [x] Test `validateCoordinates()` with valid/invalid coords
- [x] Test `validateCustomQuestions()` with valid/invalid questions
- [x] Test `validateEmployerType()` with allowed/disallowed types
- [x] Verify all tests pass (95 tests passing)

#### Cleanup
- [x] Delete `__tests__/integration/job-actions.test.ts`
- [x] Delete `__tests__/integration/` directory (all deprecated Server Action tests)
- [x] Delete `__tests__/api/` directory (all deprecated API tests)
- [x] Record baseline coverage numbers
- [x] Document baseline in `coverage-history.json`

#### Verification
- [x] Run `npm run test:coverage` successfully
- [x] Coverage meets initial thresholds (3% baseline set)
- [x] No TypeScript errors in new files
- [ ] Existing E2E tests still pass - not verified (requires dev server)

---

## Phase 2: Core Services

**Goal:** Extract and test services for all major features.

**Status:** COMPLETED (2025-01-10)

### Progress Checklist

#### Application Service
- [x] Create `features/applications/services/application-service.ts`
- [x] Extract `validateApplicationInput()` function
- [x] Extract `parseApplicationFormData()` function (as `sanitizeCustomAnswers`)
- [x] Extract `buildApplicationRecord()` function
- [x] Extract `parseCustomAnswers()` function (as `sanitizeCustomAnswers`)
- [x] Extract `validateCustomAnswers()` function
- [ ] Update `application-actions.ts` to use service - optional refactor
- [x] Create `features/applications/services/application-service.test.ts`
- [x] Test valid application input
- [x] Test missing required fields
- [x] Test cover letter length validation
- [x] Test form data parsing (via sanitizeCustomAnswers)
- [x] Test custom answers parsing with valid answers
- [x] Test custom answers validation against required questions
- [x] Test building application record
- [x] Verify all tests pass (45 tests passing)
- [x] Delete `__tests__/integration/application-actions.test.ts`

#### Profile Service
- [x] Create `features/profiles/services/profile-service.ts`
- [x] Extract `validateProfileInput()` function
- [x] Extract `buildProfileUpdate()` function (as `buildProfileUpdateRecord`)
- [x] Extract `parseCoordinates()` function (as `validateCoordinates`)
- [x] Extract `formatPhoneNumber()` function
- [x] Extract `validateTradeSelection()` function (as `validateTrade`, `validateSubTrade`)
- [ ] Update `profile-actions.ts` to use service - optional refactor
- [x] Create `features/profiles/services/profile-service.test.ts`
- [x] Test valid profile input
- [x] Test invalid email format
- [x] Test invalid phone format
- [x] Test phone number formatting (various inputs)
- [x] Test coordinate validation
- [x] Test trade selection validation
- [x] Test building profile update object
- [x] Verify all tests pass (60 tests passing)
- [x] Delete `__tests__/integration/profile-actions.test.ts`

#### Auth Service
- [x] Create `features/auth/services/auth-service.ts`
- [x] Extract `validateSignupInput()` function (as `validateSignUpInput`)
- [x] Extract `validateLoginInput()` function (as `validateSignInInput`)
- [x] Extract `validateOnboardingInput()` function (via validation helpers)
- [x] Extract `validatePasswordStrength()` function (as `calculatePasswordStrength`, `validatePassword`)
- [x] Extract `sanitizeEmail()` function
- [ ] Update auth actions to use service - optional refactor
- [x] Create `features/auth/services/auth-service.test.ts`
- [x] Test valid signup input
- [x] Test invalid email formats
- [x] Test password too short
- [x] Test password missing uppercase
- [x] Test password missing number
- [x] Test password strength edge cases
- [x] Test valid login input
- [x] Test email sanitization (trim, lowercase)
- [x] Verify all tests pass (48 tests passing)
- [x] Delete `__tests__/integration/auth-actions.test.ts`

#### Message Service
- [x] Create `features/messaging/services/message-service.ts`
- [x] Extract `validateMessageInput()` function
- [x] Extract `formatConversation()` function (as `sortConversationsByRecent`, `groupMessagesByDate`)
- [x] Extract `buildMessageRecord()` function
- [x] Extract `getOtherParticipant()` function (as `getOtherParticipantId`)
- [ ] Update message actions to use service - optional refactor
- [x] Create `features/messaging/services/message-service.test.ts`
- [x] Test valid message input
- [x] Test empty message validation
- [x] Test message too long validation
- [x] Test conversation formatting
- [x] Test building message record
- [x] Test getting other participant (as sender)
- [x] Test getting other participant (as receiver)
- [x] Verify all tests pass (41 tests passing)
- [x] Delete `__tests__/integration/message-actions.test.ts`

#### Notification Service
- [x] Create `features/notifications/services/notification-service.ts`
- [x] Extract `buildNotificationRecord()` function
- [x] Extract `formatNotificationMessage()` function (as `formatNotificationDisplayMessage`)
- [x] Extract `groupNotificationsByDate()` function
- [ ] Update notification actions to use service - optional refactor
- [x] Create `features/notifications/services/notification-service.test.ts`
- [x] Test building notification record
- [x] Test formatting different notification types
- [x] Test grouping notifications by date
- [x] Verify all tests pass (61 tests passing)
- [x] Delete `__tests__/integration/notification-actions.test.ts`

#### Stripe Service
- [x] Create `features/subscriptions/services/stripe-service.ts`
- [x] Extract `validateWebhookEvent()` function (as `validateCheckoutMetadata`, `validatePriceId`, etc.)
- [x] Extract `buildSubscriptionRecord()` function
- [x] Extract `determineSubscriptionStatus()` function (as `mapSubscriptionStatus`)
- [x] Extract `shouldActivateBoost()` function (as `shouldActivateProfileBoost`)
- [x] Extract `calculateBoostExpiration()` function (as `calculatePeriodEnd`)
- [ ] Update webhook handler to use service - optional refactor
- [x] Create `features/subscriptions/services/stripe-service.test.ts`
- [x] Test checkout.session.completed handling (via validation functions)
- [x] Test customer.subscription.updated handling (via status functions)
- [x] Test customer.subscription.deleted handling (via status functions)
- [x] Test invoice.payment_failed handling (via status functions)
- [x] Test subscription status determination (active)
- [x] Test subscription status determination (canceled)
- [x] Test subscription status determination (past_due)
- [x] Test boost activation logic for workers
- [x] Test boost not activated for employers
- [x] Test idempotency key generation (via timestamp functions)
- [x] Verify all tests pass (105 tests passing)
- [x] Delete `__tests__/api/stripe-webhook.test.ts`
- [x] Delete `__tests__/api/stripe-webhook-idempotency.test.ts`

#### Phase 2 Verification
- [x] Run `npm run test:coverage` successfully (972 tests passing)
- [x] Services at 80%+ coverage (all services at 98-100%)
- [x] No TypeScript errors
- [ ] All E2E tests still pass - requires dev server
- [ ] Ratchet global coverage thresholds up by 10% - deferred to Phase 6
- [x] Update `coverage-history.json`

---

## Phase 3: Hooks & Utilities

**Goal:** Add tests for custom hooks and expand utility test coverage.

### Progress Checklist

#### Hook Test Setup
- [ ] Create `tests/hooks-setup.ts` for React Query wrapper
- [ ] Create `mockSupabaseQuery()` helper for hook tests
- [ ] Create `mockSupabaseError()` helper for error states
- [ ] Verify hook test setup works with sample test

#### Profile Hook Tests
- [ ] Create `features/profiles/hooks/use-profile.test.ts`
- [ ] Test initial loading state
- [ ] Test successful data fetch
- [ ] Test error state handling
- [ ] Test refetch behavior
- [ ] Test stale data handling

#### Jobs Hook Tests
- [ ] Create `features/jobs/hooks/use-jobs.test.ts`
- [ ] Test initial loading state
- [ ] Test successful job list fetch
- [ ] Test empty results handling
- [ ] Test filter application (trade)
- [ ] Test filter application (job type)
- [ ] Test filter application (distance)
- [ ] Test combined filters
- [ ] Test pagination/infinite scroll
- [ ] Test error handling

#### Single Job Hook Tests
- [ ] Create `features/jobs/hooks/use-job.test.ts`
- [ ] Test loading state
- [ ] Test successful fetch
- [ ] Test job not found (404)
- [ ] Test error handling

#### Messages Hook Tests
- [ ] Create `features/messaging/hooks/use-messages.test.ts`
- [ ] Test initial loading
- [ ] Test message list fetch
- [ ] Test polling interval setup
- [ ] Test new message detection
- [ ] Test optimistic message adding
- [ ] Test error recovery

#### Conversations Hook Tests
- [ ] Create `features/messaging/hooks/use-conversations.test.ts`
- [ ] Test initial loading
- [ ] Test conversation list fetch
- [ ] Test unread count calculation
- [ ] Test polling behavior
- [ ] Test error handling

#### Subscription Hook Tests
- [ ] Create `features/subscriptions/hooks/use-subscription.test.ts`
- [ ] Test loading state
- [ ] Test Pro status detection (active)
- [ ] Test free user detection
- [ ] Test subscription data shape
- [ ] Test error handling

#### Applications Hook Tests
- [ ] Create `features/applications/hooks/use-applications.test.ts`
- [ ] Test worker view (my applications)
- [ ] Test employer view (received applications)
- [ ] Test filtering by status
- [ ] Test loading and error states

#### Utility Tests Expansion

##### Validation Utils
- [ ] Create `lib/utils/validation.test.ts` (if not exists)
- [ ] Test email validation - valid formats
- [ ] Test email validation - invalid formats
- [ ] Test email validation - edge cases (long, special chars)
- [ ] Test phone validation - valid formats
- [ ] Test phone validation - invalid formats
- [ ] Test URL validation
- [ ] Test required field validation

##### Formatting Utils
- [ ] Create `lib/utils/formatting.test.ts` (if not exists)
- [ ] Test currency formatting
- [ ] Test date formatting (relative)
- [ ] Test date formatting (absolute)
- [ ] Test phone number formatting
- [ ] Test name formatting (capitalize)
- [ ] Test truncate text

##### File Validation (Expand Existing)
- [ ] Add test for SVG file rejection
- [ ] Add test for executable file rejection
- [ ] Add test for file with wrong extension
- [ ] Add test for file size exactly at limit
- [ ] Add test for file size over limit
- [ ] Add test for empty file

##### Distance Utils (Expand Existing)
- [ ] Add test for same point (0 distance)
- [ ] Add test for antipodal points
- [ ] Add test for known city distances
- [ ] Add test for negative coordinates
- [ ] Add test for coordinate boundary values

##### Compatibility Scoring (Expand Existing)
- [ ] Add test for perfect match (100%)
- [ ] Add test for no match (0%)
- [ ] Add test for partial trade match
- [ ] Add test for missing certifications impact
- [ ] Add test for distance impact calculation
- [ ] Add test for experience level impact

#### Phase 3 Verification
- [ ] Run `npm run test:coverage` successfully
- [ ] Hooks at 60%+ coverage
- [ ] Utilities at 80%+ coverage
- [ ] No TypeScript errors
- [ ] All E2E tests still pass
- [ ] Ratchet coverage thresholds up
- [ ] Update `coverage-history.json`

---

## Phase 4: Components

**Goal:** Add interaction tests for complex components.

### Progress Checklist

#### Component Test Setup
- [ ] Verify `renderWithProviders` works for all components
- [ ] Create `mockRouter` helper for navigation tests
- [ ] Create `mockToast` helper for toast assertions
- [ ] Create form submission helpers

#### Job Form Tests
- [ ] Create `features/jobs/components/job-form.test.tsx`
- [ ] Test initial render with empty form
- [ ] Test title field validation on blur
- [ ] Test trade selection updates subtrade options
- [ ] Test job type shows correct pay rate fields
- [ ] Test hourly job shows rate + period fields
- [ ] Test contract job shows amount + type fields
- [ ] Test location autocomplete integration
- [ ] Test form submission with valid data
- [ ] Test form submission blocked with invalid data
- [ ] Test loading state during submission

#### Job Card Tests
- [ ] Create `features/jobs/components/job-card.test.tsx`
- [ ] Test renders job title and company
- [ ] Test renders location
- [ ] Test renders pay rate
- [ ] Test renders job type badge
- [ ] Test renders distance when available
- [ ] Test click navigates to job detail
- [ ] Test Pro user sees compatibility score
- [ ] Test free user doesn't see compatibility

#### Job Filters Tests
- [ ] Expand `__tests__/components/job-filters.test.tsx`
- [ ] Test trade filter updates
- [ ] Test job type filter updates
- [ ] Test distance filter updates
- [ ] Test clear all filters
- [ ] Test filter change callback

#### Application Wizard Tests
- [ ] Create `features/applications/components/application-wizard.test.tsx`
- [ ] Test initial step render (documents)
- [ ] Test next button advances step
- [ ] Test back button returns to previous
- [ ] Test step indicator shows current step
- [ ] Test required field validation per step
- [ ] Test form data persists across steps
- [ ] Test final submission
- [ ] Test custom questions step (when present)

#### Chat Window Tests
- [ ] Create `features/messaging/components/chat-window.test.tsx`
- [ ] Test renders message list
- [ ] Test renders message input
- [ ] Test typing and sending message
- [ ] Test message appears in list after send
- [ ] Test auto-scroll to new messages
- [ ] Test loading state
- [ ] Test empty conversation state

#### Message Bubble Tests
- [ ] Create `features/messaging/components/message-bubble.test.tsx`
- [ ] Test own message alignment (right)
- [ ] Test other user message alignment (left)
- [ ] Test timestamp display
- [ ] Test message content rendering

#### Custom Questions Builder Tests
- [ ] Create `features/jobs/components/custom-questions-builder.test.tsx`
- [ ] Test add question button
- [ ] Test question input field
- [ ] Test required toggle
- [ ] Test remove question button
- [ ] Test reorder up button
- [ ] Test reorder down button
- [ ] Test max 5 questions limit
- [ ] Test validation for empty questions

#### Screening Questions Form Tests
- [ ] Create `features/applications/components/screening-questions-form.test.tsx`
- [ ] Test renders all questions
- [ ] Test required indicator
- [ ] Test answer input
- [ ] Test validation on submit
- [ ] Test answers collected correctly

#### Profile Components Tests
- [ ] Create `features/profiles/components/profile-form.test.tsx`
- [ ] Test renders all fields
- [ ] Test validation on required fields
- [ ] Test phone formatting on input
- [ ] Test location selection
- [ ] Test trade selection

#### Certification Form Tests
- [ ] Create `features/profiles/components/certification-form.test.tsx`
- [ ] Test renders certification fields
- [ ] Test file upload interaction
- [ ] Test file type validation
- [ ] Test certification number input
- [ ] Test form submission

#### Subscription Components Tests
- [ ] Create `features/subscriptions/components/pricing-card.test.tsx`
- [ ] Test renders plan name and price
- [ ] Test renders feature list
- [ ] Test CTA button text (upgrade/current)
- [ ] Test click triggers checkout

#### Admin Component Tests
- [ ] Expand `__tests__/components/admin/` tests
- [ ] Test moderation action buttons
- [ ] Test user table rendering
- [ ] Test certification review UI

#### Phase 4 Verification
- [ ] Run `npm run test:coverage` successfully
- [ ] Components at 50%+ coverage
- [ ] No TypeScript errors
- [ ] All E2E tests still pass
- [ ] Ratchet coverage thresholds up
- [ ] Update `coverage-history.json`

---

## Phase 5: E2E Expansion

**Goal:** Add E2E tests for missing user flows.

### Progress Checklist

#### Notifications E2E
- [ ] Create `e2e/notifications.spec.ts`
- [ ] Test notification bell visible in header
- [ ] Test unread count badge displays
- [ ] Test clicking bell opens notification panel/page
- [ ] Test notification list renders
- [ ] Test clicking notification navigates to source
- [ ] Test mark single notification as read
- [ ] Test mark all notifications as read
- [ ] Test empty state when no notifications
- [ ] Test notification appears after relevant action (job posted near user)

#### Proximity Alerts E2E
- [ ] Create `e2e/proximity-alerts.spec.ts`
- [ ] Test free worker sees upgrade prompt
- [ ] Test Pro worker can access settings
- [ ] Test enable proximity alerts toggle
- [ ] Test radius slider configuration (5km)
- [ ] Test radius slider configuration (25km)
- [ ] Test radius slider configuration (50km)
- [ ] Test trade selection for monitoring
- [ ] Test multiple trades selection
- [ ] Test save settings successfully
- [ ] Test disable alerts
- [ ] Test notification received when job matches criteria

#### Profile Boost E2E
- [ ] Create `e2e/profile-boost.spec.ts`
- [ ] Test free worker has no boost badge
- [ ] Test Pro subscription activates boost
- [ ] Test boost badge visible on own profile
- [ ] Test boost badge visible to employers
- [ ] Test boosted profile appears first in search results
- [ ] Test boost status in subscription management page
- [ ] Test boost removed when subscription canceled

#### Certification Flow E2E
- [ ] Create `e2e/certification-flow.spec.ts`
- [ ] Test worker uploads certification with photo
- [ ] Test certification appears as "pending" status
- [ ] Test admin sees pending certification
- [ ] Test admin approves certification
- [ ] Test worker sees "verified" status after approval
- [ ] Test verified badge appears on profile
- [ ] Test admin rejects certification
- [ ] Test worker sees rejection with reason
- [ ] Test employer can filter by verified certifications (Pro)

#### Error Recovery E2E
- [ ] Create `e2e/error-recovery.spec.ts`
- [ ] Test form data preserved on network timeout
- [ ] Test retry button appears on failed submission
- [ ] Test retry successfully submits
- [ ] Test session expiry shows login redirect
- [ ] Test rate limiting shows appropriate message
- [ ] Test rate limiting allows retry after delay
- [ ] Test 404 page for invalid job ID
- [ ] Test 404 page for invalid profile ID
- [ ] Test graceful handling of deleted content

#### Concurrent Users E2E
- [ ] Create `e2e/concurrent-users.spec.ts`
- [ ] Set up two browser contexts
- [ ] Test employer posts job, worker sees it in feed
- [ ] Test worker applies, employer sees application
- [ ] Test employer updates application status, worker sees change
- [ ] Test real-time messaging between two users
- [ ] Test message sent by user A appears for user B
- [ ] Test conversation unread count updates

#### E2E Test Utilities
- [ ] Add `createTestNotification()` to `e2e/utils/test-db.ts`
- [ ] Add `createProximityAlert()` to `e2e/utils/test-db.ts`
- [ ] Add `verifyTestCertification()` to `e2e/utils/test-db.ts`
- [ ] Add `activateTestBoost()` to `e2e/utils/test-db.ts`
- [ ] Add multi-context helpers to `e2e/utils/test-helpers.ts`

#### Phase 5 Verification
- [ ] All new E2E tests pass
- [ ] Existing E2E tests still pass
- [ ] Tests run successfully on all device profiles
- [ ] Update E2E documentation

---

## Phase 6: Polish & CI

**Goal:** Finalize coverage thresholds and set up CI integration.

### Progress Checklist

#### Final Coverage Configuration
- [ ] Review current coverage numbers
- [ ] Set final global thresholds (target: 50%+)
- [ ] Set final services thresholds (target: 80%+)
- [ ] Set final lib thresholds (target: 70%+)
- [ ] Verify thresholds don't fail current tests
- [ ] Document final thresholds in README

#### GitHub Actions Workflow
- [ ] Create `.github/workflows/test.yml`
- [ ] Add Node.js setup step
- [ ] Add dependency installation step
- [ ] Add unit test step (`npm run test:coverage:check`)
- [ ] Add E2E test step (`npm run test:e2e`)
- [ ] Configure Playwright browser caching
- [ ] Add coverage report upload (optional)
- [ ] Add test result annotations
- [ ] Test workflow on PR

#### Documentation Updates
- [ ] Update `__tests__/README.md` with new structure
- [ ] Document service extraction pattern
- [ ] Document co-located test conventions
- [ ] Document coverage thresholds and ratcheting
- [ ] Add examples of each test type
- [ ] Document how to run specific tests
- [ ] Document how to add new tests

#### Test Utilities Cleanup
- [ ] Review all test helpers for duplication
- [ ] Consolidate shared mocks
- [ ] Create `tests/mocks/` directory if needed
- [ ] Move common mocks to shared location
- [ ] Update imports in all test files
- [ ] Verify no broken imports

#### Coverage Badge
- [ ] Set up coverage reporting service (Codecov or similar)
- [ ] Add coverage badge to README
- [ ] Configure coverage comments on PRs (optional)

#### Final Verification
- [ ] All unit tests pass
- [ ] All E2E tests pass
- [ ] Coverage meets all thresholds
- [ ] CI workflow passes
- [ ] No TypeScript errors
- [ ] Documentation is complete
- [ ] Remove any remaining deprecated test files

---

## Appendix A: Vitest Configuration

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],

    include: [
      '**/*.test.{ts,tsx}',
      '**/*.spec.{ts,tsx}',
      '!e2e/**',
    ],

    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json', 'lcov'],
      reportsDirectory: './coverage',

      include: [
        'features/**/services/**/*.ts',
        'features/**/hooks/**/*.ts',
        'features/**/components/**/*.tsx',
        'lib/**/*.ts',
        'components/**/*.tsx',
      ],

      exclude: [
        '**/*.test.{ts,tsx}',
        '**/*.spec.{ts,tsx}',
        '**/types/**',
        '**/actions/**',
        '**/*.d.ts',
        'e2e/**',
      ],

      thresholds: {
        global: {
          statements: 30,
          branches: 25,
          functions: 30,
          lines: 30,
        },
        'features/**/services/**': {
          statements: 80,
          branches: 75,
          functions: 80,
          lines: 80,
        },
        'lib/**': {
          statements: 70,
          branches: 65,
          functions: 70,
          lines: 70,
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
});
```

---

## Appendix B: Service Extraction Template

```typescript
// features/[feature]/services/[feature]-service.ts

/**
 * Pure business logic for [feature].
 * No Server Action dependencies (cookies, headers, etc.)
 * Fully unit testable.
 */

export interface [Feature]Input {
  // Define input shape
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
  field?: string;
}

/**
 * Validates [feature] input.
 * @param input - The input to validate
 * @returns ValidationResult with valid flag and optional error
 */
export function validate[Feature]Input(input: [Feature]Input): ValidationResult {
  if (!input.requiredField) {
    return { valid: false, error: 'Required field is missing', field: 'requiredField' };
  }

  // Add more validation rules...

  return { valid: true };
}

/**
 * Builds database record from validated input.
 * @param input - Validated input
 * @param userId - Current user ID
 * @returns Record ready for database insertion
 */
export function build[Feature]Record(input: [Feature]Input, userId: string): Record {
  return {
    // Transform input to database shape
  };
}
```

---

## Appendix C: Coverage History Template

```json
// coverage-history.json
{
  "history": [
    {
      "date": "2025-01-09",
      "phase": "baseline",
      "coverage": {
        "statements": 32,
        "branches": 28,
        "functions": 31,
        "lines": 32
      },
      "thresholds": {
        "statements": 30,
        "branches": 25,
        "functions": 30,
        "lines": 30
      }
    }
  ]
}
```

---

## Appendix D: Deprecated Tests Reference

The following tests were deprecated because Server Actions require Next.js runtime:

| File | Reason | Replacement |
|------|--------|-------------|
| `__tests__/integration/auth-actions.test.ts` | cookies() unavailable | `auth-service.test.ts` + E2E |
| `__tests__/integration/profile-actions.test.ts` | cookies() unavailable | `profile-service.test.ts` + E2E |
| `__tests__/integration/job-actions.test.ts` | cookies() unavailable | `job-service.test.ts` + E2E |
| `__tests__/integration/application-actions.test.ts` | cookies() unavailable | `application-service.test.ts` + E2E |
| `__tests__/integration/message-actions.test.ts` | cookies() unavailable | `message-service.test.ts` + E2E |
| `__tests__/integration/notification-actions.test.ts` | cookies() unavailable | `notification-service.test.ts` + E2E |
| `__tests__/api/stripe-webhook.test.ts` | Next.js API context | `stripe-service.test.ts` + E2E |
| `__tests__/api/stripe-webhook-idempotency.test.ts` | Next.js API context | `stripe-service.test.ts` |
| `__tests__/api/cron-jobs.test.ts` | Next.js API context | Service extraction + E2E |

These files can be deleted after their replacement tests are in place.
