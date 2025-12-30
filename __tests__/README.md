# Test Suite Architecture

## Test Types and Purpose

### Component Unit Tests (`__tests__/components/`)
**Technology**: Vitest + React Testing Library
**Purpose**: Test React components in isolation
**Coverage**: 83 tests across 6 components

- ✅ Input component
- ✅ Card component
- ✅ Badge component
- ✅ LoadingSpinner component
- ✅ EmptyState component
- ✅ VerificationBadge component

These tests verify component rendering, props, styling, and user interactions without making network calls.

### E2E Tests (`e2e/`)
**Technology**: Playwright
**Purpose**: Test complete user flows in real browser environment
**Coverage**: 100+ tests across 10 spec files

- ✅ Authentication flows
- ✅ Profile management (including server actions)
- ✅ Job posting and feed (including server actions)
- ✅ Applications (including server actions)
- ✅ Real-time messaging
- ✅ Stripe subscriptions
- ✅ Pro features
- ✅ Mobile responsiveness
- ✅ Visual regression
- ✅ Performance metrics

**Important**: E2E tests are the **primary way** to test Next.js server actions, API routes, and database operations. They run in a real Next.js environment with proper request context, authentication, and database access.

### Integration Tests - DEPRECATED ⚠️

The `__tests__/integration/` and `__tests__/api/` directories contain integration tests that **cannot run successfully** because:

1. **Server Actions Require Next.js Context**: Server actions use `cookies()`, `headers()`, and other Next.js APIs that only work in the Next.js server runtime, not in Vitest/Node.js.

2. **Error**: `cookies() was called outside a request scope`

3. **Already Covered by E2E Tests**: All server actions, API routes, and database operations are already comprehensively tested in E2E tests where they run in their proper environment.

### Testing Strategy

| What to Test | How to Test | Where |
|--------------|-------------|-------|
| **Component rendering/behavior** | Vitest | `__tests__/components/` |
| **Server actions** | Playwright E2E | `e2e/*.spec.ts` |
| **API routes** | Playwright E2E | `e2e/*.spec.ts` |
| **Database operations** | Playwright E2E | `e2e/*.spec.ts` |
| **Authentication flows** | Playwright E2E | `e2e/auth.spec.ts` |
| **User flows** | Playwright E2E | `e2e/*.spec.ts` |
| **Visual regression** | Playwright E2E | `e2e/visual-*.spec.ts` |
| **Performance** | Playwright + Lighthouse | `e2e/performance.spec.ts` |

## Running Tests

### Component Unit Tests Only
```bash
npm test -- __tests__/components/
```

### E2E Tests (Recommended for Full Coverage)
```bash
npm run test:e2e
npm run test:e2e:ui  # Interactive mode
```

### All Passing Tests
```bash
# Run component tests (fast, 83 tests)
npm test -- __tests__/components/

# Run E2E tests (comprehensive, 100+ tests)
npm run test:e2e
```

## Test Coverage Summary

✅ **Passing Tests**: 183+ tests
- Component unit tests: 83 tests
- E2E tests: 100+ tests

❌ **Deprecated Tests**: 30 tests
- Integration tests for server actions (require Next.js runtime)
- API endpoint tests (require Next.js runtime)

**Note**: The "deprecated" tests are not needed because their functionality is already covered by E2E tests in the proper Next.js environment.
