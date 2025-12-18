# 05 - API Architecture

## Overview

All API routes use Next.js Route Handlers following RESTful conventions. Each endpoint validates authentication, input data, and business rules before executing database operations.

## Standard Request/Response Pattern

### Request Flow

```
1. Client makes request → /api/resource
2. Extract user from Supabase session
3. Validate authentication (401 if not authenticated)
4. Validate request body with Zod schema (400 if invalid)
5. Check authorization/business rules (403 if forbidden)
6. Execute database operation
7. Return response (200/201 success, 500 on error)
```

### Response Format

```typescript
// Success
{ data: { ...resource } }

// Error
{ error: string | { field: string, message: string }[] }
```

## Standard Route Handler Template

```typescript
// app/api/resource/route.ts
import { createServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const schema = z.object({
  field: z.string().min(1),
  // ... other fields
})

export async function POST(request: Request) {
  try {
    // 1. Authenticate
    const supabase = createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Validate input
    const body = await request.json()
    const validatedData = schema.parse(body)

    // 3. Business logic / authorization
    // ... check permissions, business rules

    // 4. Database operation
    const { data, error } = await supabase
      .from('table')
      .insert({ ...validatedData, user_id: user.id })
      .select()
      .single()

    if (error) throw error

    // 5. Return success
    return NextResponse.json({ data }, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }

    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

## API Endpoints

### Jobs API

#### `POST /api/jobs`
Create a new job posting (employers only).

```typescript
// Request
{
  title: string
  trade: string
  sub_trade?: string
  job_type: string
  description: string
  location: string
  coords?: { lat: number, lng: number }
  pay_rate: string
  pay_min?: number
  pay_max?: number
  required_certs?: string[]
  custom_questions?: Array<{ question: string, required: boolean }>
}

// Response
{
  data: Job
}
```

#### `GET /api/jobs?trade=&location=&radius=`
Search and filter jobs.

```typescript
// Query params
- trade?: string (filter by trade)
- sub_trade?: string
- lat?: number (for proximity search)
- lng?: number
- radius?: number (km)
- pay_min?: number
- pay_max?: number

// Response
{
  data: Job[]
}
```

#### `GET /api/jobs/[id]`
Get single job details.

#### `PATCH /api/jobs/[id]`
Update job (employer only, must own job).

#### `DELETE /api/jobs/[id]`
Delete job (employer only, must own job).

#### `POST /api/jobs/[id]/apply`
Apply to a job (workers only).

```typescript
// Request
{
  cover_message?: string
  custom_answers?: Record<string, string>
  contact_shared?: boolean  // Pro feature
}

// Response
{
  data: JobApplication
}
```

#### `GET /api/jobs/nearby`
Get jobs near user's location (proximity search).

```typescript
// Query params
- lat: number
- lng: number
- radius: number (km, default 25)
- trade?: string

// Uses PostGIS ST_DWithin for efficient proximity queries
```

### Profiles API

#### `GET /api/profiles/[id]`
Get user profile (public data).

#### `PATCH /api/profiles/[id]`
Update own profile (authenticated users only).

```typescript
// Request (partial update)
{
  name?: string
  trade?: string
  sub_trade?: string
  location?: string
  coords?: { lat: number, lng: number }
  bio?: string
  phone?: string
}
```

#### `POST /api/profiles/views`
Track profile view (Pro feature for analytics).

```typescript
// Request
{
  viewed_profile_id: string
}

// Creates entry in profile_views table
```

### Applications API

#### `GET /api/applications`
Get user's applications (workers) or received applications (employers).

```typescript
// Query params
- status?: 'pending' | 'viewed' | 'contacted' | 'rejected' | 'hired'

// Returns different data based on user role
// Workers: their applications
// Employers: applications to their jobs
```

#### `PATCH /api/applications/[id]`
Update application status (employers only).

```typescript
// Request
{
  status: 'viewed' | 'contacted' | 'rejected' | 'hired'
}
```

### Messaging API

#### `GET /api/messages/conversations`
List user's conversations.

```typescript
// Response
{
  data: Array<{
    id: string
    participant: Profile
    last_message: Message
    last_message_at: string
    unread_count: number
  }>
}
```

#### `POST /api/messages`
Send a message.

```typescript
// Request
{
  conversation_id?: string  // If continuing existing conversation
  recipient_id?: string     // If starting new conversation
  content: string
}

// Response
{
  data: Message
}

// Creates conversation if it doesn't exist
```

### Certifications API

#### `POST /api/certifications/upload`
Upload certification image.

```typescript
// Request (multipart/form-data)
- file: File
- certification_type: string

// Uploads to Supabase Storage
// Returns download URL

// Response
{
  data: {
    image_url: string
  }
}
```

#### `POST /api/certifications`
Create certification record.

```typescript
// Request
{
  certification_type: string
  image_url: string
  expires_at?: string
}

// Response
{
  data: Certification
}
```

#### `POST /api/certifications/verify`
Verify certification (admin/automated).

```typescript
// Request
{
  certification_id: string
  is_verified: boolean
}

// Pro feature: Only verified certifications shown in employer filters
```

### Subscriptions API

#### `GET /api/subscriptions`
Get current user's subscription.

```typescript
// Response
{
  data: Subscription | null
}
```

#### `POST /api/subscriptions/checkout`
Create Stripe Checkout session.

```typescript
// Request
{
  price_id: string  // Stripe price ID (monthly or annual)
}

// Response
{
  url: string  // Stripe Checkout URL to redirect to
}
```

#### `POST /api/subscriptions/cancel`
Cancel subscription at period end.

```typescript
// Calls Stripe API to set cancel_at_period_end: true
// User retains Pro until current period ends
```

#### `GET /api/subscriptions/portal`
Get Stripe customer portal URL.

```typescript
// Response
{
  url: string  // Stripe portal for self-service subscription management
}
```

### Webhooks API

#### `POST /api/webhooks/stripe`
Handle Stripe webhook events.

```typescript
// Handles events:
- checkout.session.completed → create subscription
- customer.subscription.updated → update subscription
- customer.subscription.deleted → downgrade to free
- invoice.payment_failed → mark past_due

// Verifies webhook signature
// Updates database accordingly
```

### Notifications API

#### `GET /api/notifications`
Get user's notifications.

```typescript
// Query params
- read?: boolean (filter by read status)
- limit?: number (default 20)

// Response
{
  data: Notification[]
}
```

#### `PATCH /api/notifications/read`
Mark notifications as read.

```typescript
// Request
{
  notification_ids: string[]
}
```

### Analytics API (Pro Feature)

#### `GET /api/analytics/job-views`
Get job view analytics for employer.

```typescript
// Query params
- job_id: string
- start_date?: string
- end_date?: string

// Response
{
  data: {
    total_views: number
    unique_views: number
    views_by_date: Array<{ date: string, count: number }>
  }
}
```

#### `GET /api/analytics/profile-views`
Get profile view analytics for Pro workers.

```typescript
// Response
{
  data: {
    total_views: number
    recent_viewers: Profile[]
  }
}
```

## Error Handling

### Standard Error Codes

- `200` - Success (GET, PATCH, DELETE)
- `201` - Created (POST)
- `400` - Bad Request (validation error)
- `401` - Unauthorized (not authenticated)
- `403` - Forbidden (authenticated but not authorized)
- `404` - Not Found
- `500` - Internal Server Error

### Validation with Zod

```typescript
// lib/utils/validation.ts
import { z } from 'zod'

export const jobCreateSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters'),
  trade: z.string(),
  sub_trade: z.string().optional(),
  job_type: z.string(),
  description: z.string().min(20, 'Description must be at least 20 characters'),
  location: z.string(),
  coords: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
  }).optional(),
  pay_rate: z.string(),
  pay_min: z.number().positive().optional(),
  pay_max: z.number().positive().optional(),
  required_certs: z.array(z.string()).optional(),
  custom_questions: z.array(z.object({
    question: z.string(),
    required: z.boolean(),
  })).optional(),
})

export const profileUpdateSchema = z.object({
  name: z.string().min(2).optional(),
  trade: z.string().optional(),
  sub_trade: z.string().optional(),
  location: z.string().optional(),
  bio: z.string().max(500).optional(),
  phone: z.string().optional(),
})
```

## Client Integration with TanStack Query

### Query Hooks

```typescript
// features/jobs/hooks/use-jobs.ts
import { useQuery } from '@tanstack/react-query'

export interface JobFilters {
  trade?: string
  lat?: number
  lng?: number
  radius?: number
}

export function useJobs(filters: JobFilters = {}) {
  return useQuery({
    queryKey: ['jobs', filters],
    queryFn: async () => {
      const params = new URLSearchParams()
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) params.append(key, String(value))
      })

      const res = await fetch(`/api/jobs?${params}`)
      if (!res.ok) throw new Error('Failed to fetch jobs')
      const data = await res.json()
      return data.data
    },
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: true,
  })
}
```

### Mutation Hooks

```typescript
// features/jobs/hooks/use-create-job.ts
import { useMutation, useQueryClient } from '@tanstack/react-query'

export function useCreateJob() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (jobData: JobCreateInput) => {
      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(jobData),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error)
      }

      return res.json()
    },
    onSuccess: () => {
      // Invalidate jobs query to refetch
      queryClient.invalidateQueries({ queryKey: ['jobs'] })
    },
  })
}

// Usage in component
function PostJobForm() {
  const createJob = useCreateJob()

  async function handleSubmit(data: JobCreateInput) {
    try {
      await createJob.mutateAsync(data)
      router.push('/dashboard/feed')
    } catch (error) {
      toast.error(error.message)
    }
  }
}
```

## Rate Limiting

For production, implement rate limiting on critical endpoints:

```typescript
// lib/rate-limit.ts
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL!,
  token: process.env.UPSTASH_REDIS_TOKEN!,
})

export const rateLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '10 s'), // 10 requests per 10 seconds
})

// Usage in API route
const identifier = user.id // or IP address
const { success } = await rateLimiter.limit(identifier)

if (!success) {
  return NextResponse.json(
    { error: 'Too many requests' },
    { status: 429 }
  )
}
```

## Testing API Routes

```typescript
// tests/api/jobs.test.ts
import { POST } from '@/app/api/jobs/route'
import { createServerClient } from '@/lib/supabase/server'

jest.mock('@/lib/supabase/server')

describe('POST /api/jobs', () => {
  it('should create job for authenticated employer', async () => {
    const mockUser = { id: 'user-123' }
    createServerClient.mockReturnValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: mockUser } }) },
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: { role: 'employer' } })
          })
        }),
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: { id: 'job-123' } })
          })
        })
      })
    })

    const request = new Request('http://localhost:3000/api/jobs', {
      method: 'POST',
      body: JSON.stringify({ title: 'Test Job', ... })
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.data.id).toBe('job-123')
  })
})
```
