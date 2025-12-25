# 09 - Testing Strategy

## Overview

This document outlines the pragmatic testing approach for KrewUp, focusing on critical paths while avoiding over-testing to maintain development velocity.

## Testing Philosophy

**Core Principle**: Test what matters, skip what doesn't.

**What Matters**:
- Money flows (payments, subscriptions)
- Security (authentication, authorization)
- Business logic (job matching, proximity, scoring)
- Data integrity (database operations)

**What Doesn't Matter**:
- Simple presentation components
- Third-party library functionality
- Styling and layout
- Static content

---

## Testing Stack

### Installation

```bash
# Core testing libraries
npm install -D vitest @vitest/ui
npm install -D @testing-library/react @testing-library/jest-dom @testing-library/user-event
npm install -D @vitejs/plugin-react jsdom

# Mocking
npm install -D msw  # Mock Service Worker for API mocking

# Optional: E2E testing
npm install -D @playwright/test
```

### Configuration

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
})
```

```typescript
// tests/setup.ts
import '@testing-library/jest-dom'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

// Cleanup after each test
afterEach(() => {
  cleanup()
})

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}))

// Mock Supabase client
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getUser: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
    },
    from: vi.fn(),
  }),
}))
```

```json
// package.json scripts
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage",
    "test:e2e": "playwright test"
  }
}
```

---

## What to Test

### 1. Authentication & Authorization (High Priority)

**Why**: Security-critical, prevents unauthorized access

```typescript
// tests/features/auth/use-auth.test.ts
import { renderHook, waitFor } from '@testing-library/react'
import { useAuth } from '@/features/auth/hooks/use-auth'
import { createClient } from '@/lib/supabase/client'
import { vi } from 'vitest'

vi.mock('@/lib/supabase/client')

describe('useAuth', () => {
  it('returns user and profile when authenticated', async () => {
    const mockUser = { id: 'user-123', email: 'test@example.com' }
    const mockProfile = { id: 'user-123', name: 'Test User', role: 'worker' }

    vi.mocked(createClient).mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } })
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockProfile })
          })
        })
      })
    } as any)

    const { result } = renderHook(() => useAuth())

    await waitFor(() => {
      expect(result.current.data).toEqual({
        user: mockUser,
        profile: mockProfile
      })
    })
  })

  it('returns null when not authenticated', async () => {
    vi.mocked(createClient).mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null } })
      }
    } as any)

    const { result } = renderHook(() => useAuth())

    await waitFor(() => {
      expect(result.current.data).toBeNull()
    })
  })
})
```

```typescript
// tests/middleware/auth-middleware.test.ts
import { middleware } from '@/app/middleware'
import { NextRequest } from 'next/server'

describe('Auth Middleware', () => {
  it('redirects unauthenticated users from protected routes', async () => {
    const request = new NextRequest('http://localhost:3000/dashboard/feed')
    // Mock no user session

    const response = await middleware(request)

    expect(response.status).toBe(307) // Redirect
    expect(response.headers.get('location')).toContain('/login')
  })

  it('allows authenticated users to access protected routes', async () => {
    const request = new NextRequest('http://localhost:3000/dashboard/feed')
    // Mock authenticated session

    const response = await middleware(request)

    expect(response.status).toBe(200)
  })
})
```

### 2. Payment Flows (High Priority)

**Why**: Money-critical, must work correctly

```typescript
// tests/api/subscriptions/checkout.test.ts
import { POST } from '@/app/api/subscriptions/checkout/route'
import { createServerClient } from '@/lib/supabase/server'
import Stripe from 'stripe'
import { vi } from 'vitest'

vi.mock('@/lib/supabase/server')
vi.mock('stripe')

describe('POST /api/subscriptions/checkout', () => {
  it('creates checkout session for authenticated user', async () => {
    const mockUser = { id: 'user-123' }
    const mockProfile = { email: 'test@example.com', name: 'Test User' }

    vi.mocked(createServerClient).mockReturnValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }) },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockProfile })
          })
        })
      })
    } as any)

    const mockSession = { url: 'https://checkout.stripe.com/session_123' }
    vi.mocked(Stripe.prototype.checkout.sessions.create).mockResolvedValue(mockSession as any)

    const request = new Request('http://localhost:3000/api/subscriptions/checkout', {
      method: 'POST',
      body: JSON.stringify({ price_id: 'price_monthly_123' })
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.url).toBe(mockSession.url)
  })

  it('returns 401 for unauthenticated users', async () => {
    vi.mocked(createServerClient).mockReturnValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) }
    } as any)

    const request = new Request('http://localhost:3000/api/subscriptions/checkout', {
      method: 'POST',
      body: JSON.stringify({ price_id: 'price_monthly_123' })
    })

    const response = await POST(request)

    expect(response.status).toBe(401)
  })
})
```

```typescript
// tests/api/webhooks/stripe.test.ts
import { POST } from '@/app/api/webhooks/stripe/route'
import Stripe from 'stripe'
import { vi } from 'vitest'

describe('POST /api/webhooks/stripe', () => {
  it('handles checkout.session.completed event', async () => {
    const mockEvent = {
      type: 'checkout.session.completed',
      data: {
        object: {
          subscription: 'sub_123',
          customer: 'cus_123',
          metadata: { user_id: 'user-123' }
        }
      }
    }

    vi.mocked(Stripe.prototype.webhooks.constructEvent).mockReturnValue(mockEvent as any)

    const request = new Request('http://localhost:3000/api/webhooks/stripe', {
      method: 'POST',
      headers: { 'stripe-signature': 'sig_123' },
      body: JSON.stringify(mockEvent)
    })

    const response = await POST(request)

    expect(response.status).toBe(200)
    // Verify subscription created in database
    // Verify profile updated to Pro
  })

  it('handles subscription cancellation', async () => {
    const mockEvent = {
      type: 'customer.subscription.deleted',
      data: {
        object: { id: 'sub_123', status: 'canceled' }
      }
    }

    // Test that user is downgraded to free
  })
})
```

### 3. Business Logic (Medium-High Priority)

**Why**: Core functionality, must calculate correctly

```typescript
// tests/unit/geolocation.test.ts
import { haversineDistance } from '@/lib/utils/geolocation'

describe('haversineDistance', () => {
  it('calculates distance between two points correctly', () => {
    const chicago = { lat: 41.8781, lng: -87.6298 }
    const milwaukee = { lat: 43.0389, lng: -87.9065 }

    const distance = haversineDistance(chicago, milwaukee)

    expect(distance).toBeCloseTo(118.3, 1) // ~118 km
  })

  it('returns 0 for same location', () => {
    const loc = { lat: 41.8781, lng: -87.6298 }

    expect(haversineDistance(loc, loc)).toBe(0)
  })

  it('returns Infinity for invalid coordinates', () => {
    expect(haversineDistance(null, { lat: 0, lng: 0 })).toBe(Infinity)
  })
})
```

```typescript
// tests/unit/compatibility-scoring.test.ts
import { calculateCompatibilityScore } from '@/features/jobs/utils/compatibility-scoring'

describe('calculateCompatibilityScore', () => {
  it('gives high score for perfect match', () => {
    const job = {
      trade: 'Electrician',
      sub_trade: 'Residential Wiring',
      required_certs: ['OSHA 10'],
      coords: { lat: 41.8781, lng: -87.6298 }
    }

    const profile = {
      trade: 'Electrician',
      sub_trade: 'Residential Wiring',
      certifications: [{ certification_type: 'OSHA 10' }],
      coords: { lat: 41.8781, lng: -87.6298 },
      work_experience: [
        { job_title: 'Electrician', company_name: 'ABC', start_date: '2018-01-01', end_date: null }
      ]
    }

    const score = calculateCompatibilityScore(job, profile)

    expect(score.overall).toBeGreaterThanOrEqual(90)
    expect(score.breakdown.tradeMatch).toBe(30)
    expect(score.breakdown.certifications).toBe(30)
    expect(score.gaps).toHaveLength(0)
  })

  it('identifies missing certifications', () => {
    const job = {
      trade: 'Electrician',
      required_certs: ['OSHA 10', 'OSHA 30'],
      coords: { lat: 41.8781, lng: -87.6298 }
    }

    const profile = {
      trade: 'Electrician',
      certifications: [{ certification_type: 'OSHA 10' }],
      coords: { lat: 41.8781, lng: -87.6298 },
      work_experience: []
    }

    const score = calculateCompatibilityScore(job, profile)

    expect(score.gaps).toContain('Missing OSHA 30')
    expect(score.breakdown.certifications).toBeLessThan(30)
  })
})
```

### 4. API Routes (Medium Priority)

**Why**: Data integrity, correct request handling

```typescript
// tests/api/jobs/create-job.test.ts
import { POST } from '@/app/api/jobs/route'
import { createServerClient } from '@/lib/supabase/server'
import { vi } from 'vitest'

describe('POST /api/jobs', () => {
  it('creates job for authenticated employer', async () => {
    const mockUser = { id: 'user-123' }
    const mockProfile = { role: 'employer' }

    vi.mocked(createServerClient).mockReturnValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }) },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockProfile })
          })
        }),
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: 'job-123', title: 'Test Job' }
            })
          })
        })
      })
    } as any)

    const request = new Request('http://localhost:3000/api/jobs', {
      method: 'POST',
      body: JSON.stringify({
        title: 'Test Job',
        trade: 'Electrician',
        description: 'A test job posting',
        location: 'Chicago, IL',
        pay_rate: '$30/hr'
      })
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.data.id).toBe('job-123')
  })

  it('returns 403 for workers trying to post jobs', async () => {
    const mockUser = { id: 'user-123' }
    const mockProfile = { role: 'worker' }

    vi.mocked(createServerClient).mockReturnValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }) },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockProfile })
          })
        })
      })
    } as any)

    const request = new Request('http://localhost:3000/api/jobs', {
      method: 'POST',
      body: JSON.stringify({ title: 'Test Job' })
    })

    const response = await POST(request)

    expect(response.status).toBe(403)
  })
})
```

---

## What NOT to Test

### Skip These

1. **Simple Presentation Components**
   ```typescript
   // Don't test this
   function JobCard({ job }) {
     return (
       <Card>
         <h3>{job.title}</h3>
         <p>{job.location}</p>
       </Card>
     )
   }
   ```

2. **Third-Party Libraries**
   - Don't test Supabase client methods
   - Don't test Stripe API calls
   - Don't test React Query behavior
   - Trust the libraries

3. **Styling and Layout**
   - Don't test CSS classes
   - Don't test responsive behavior
   - Visual testing is manual

4. **Static Content**
   - Don't test marketing pages
   - Don't test about/pricing display

---

## Testing Patterns

### Mocking Supabase

```typescript
// tests/mocks/supabase.ts
export function mockSupabaseClient(overrides = {}) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
      ...overrides.auth
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null }),
      ...overrides.from
    }),
    ...overrides
  }
}

// Usage
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => mockSupabaseClient({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'user-123' } }
      })
    }
  })
}))
```

### Testing React Hooks

```typescript
// tests/hooks/use-jobs.test.ts
import { renderHook, waitFor } from '@testing-library/react'
import { useJobs } from '@/features/jobs/hooks/use-jobs'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { vi } from 'vitest'

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  })

  return ({ children }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}

describe('useJobs', () => {
  it('fetches jobs with filters', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [{ id: 'job-1', title: 'Test Job' }] })
    })

    const { result } = renderHook(
      () => useJobs({ trade: 'Electrician' }),
      { wrapper: createWrapper() }
    )

    await waitFor(() => {
      expect(result.current.data).toHaveLength(1)
      expect(result.current.data[0].title).toBe('Test Job')
    })

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('trade=Electrician')
    )
  })
})
```

### Testing Components with User Interaction

```typescript
// tests/components/login-form.test.ts
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { LoginForm } from '@/features/auth/components/login-form'
import { vi } from 'vitest'

describe('LoginForm', () => {
  it('submits credentials on form submission', async () => {
    const mockSignIn = vi.fn().mockResolvedValue({ error: null })

    vi.mock('@/lib/supabase/client', () => ({
      createClient: () => ({
        auth: { signInWithPassword: mockSignIn }
      })
    }))

    render(<LoginForm />)

    const emailInput = screen.getByLabelText(/email/i)
    const passwordInput = screen.getByLabelText(/password/i)
    const submitButton = screen.getByRole('button', { name: /sign in/i })

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.change(passwordInput, { target: { value: 'password123' } })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123'
      })
    })
  })

  it('displays error message on failed login', async () => {
    const mockSignIn = vi.fn().mockResolvedValue({
      error: { message: 'Invalid credentials' }
    })

    // Test error display
  })
})
```

---

## Bug-Driven Testing

**Philosophy**: Write tests for bugs you find

**Process**:
1. Bug reported or discovered
2. Write a failing test that reproduces the bug
3. Fix the bug
4. Verify test passes
5. Commit both test and fix

**Example**:
```typescript
// Bug: Job proximity search fails for negative longitude values

// 1. Write failing test
describe('Job Proximity Search Bug', () => {
  it('handles negative longitude correctly', async () => {
    const userLocation = { lat: 41.8781, lng: -87.6298 } // Chicago (negative lng)
    const jobLocation = { lat: 42.0, lng: -88.0 }

    const distance = haversineDistance(userLocation, jobLocation)

    expect(distance).toBeLessThan(100) // Should be ~50km, not Infinity
  })
})

// 2. Fix the bug in haversineDistance function
// 3. Test passes
// 4. Commit
```

---

## CI/CD Integration

```yaml
# .github/workflows/test.yml
name: Test

on:
  push:
    branches: [main]
  pull_request:

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - uses: actions/setup-node@v3
        with:
          node-version: 18
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm run test

      - name: Run build
        run: npm run build

      - name: Upload coverage
        if: always()
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json
```

---

## Testing Checklist

**Before Pushing Code**:
- [ ] All existing tests pass
- [ ] New features have tests for critical paths
- [ ] Bug fixes include regression tests
- [ ] No console errors in test output
- [ ] Build succeeds

**Before Deploying**:
- [ ] All tests pass in CI
- [ ] Manual smoke test in staging
- [ ] Payment flow tested with Stripe test cards
- [ ] Authentication flow tested
- [ ] Critical user flows verified

---

## When to Write Tests

**Always**:
- Authentication and authorization logic
- Payment and subscription flows
- Business logic (scoring, matching, calculations)
- Bug fixes (write test first, then fix)

**Sometimes**:
- Complex UI interactions
- API routes with complex logic
- Database operations with transactions

**Never**:
- Simple presentational components
- Static pages
- Third-party library wrappers
- Obvious CRUD operations

---

## Summary

**Pragmatic approach**: Test what breaks, skip what doesn't.

Focus on:
1. Security (auth/authz)
2. Money (payments)
3. Logic (algorithms)
4. Bugs (regression prevention)

Skip:
1. Presentation
2. Third-party code
3. Obvious operations
4. Static content

**Goal**: Confidence without slowing down development.
