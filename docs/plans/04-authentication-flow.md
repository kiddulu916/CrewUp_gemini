# 04 - Authentication Flow

## Overview

Supabase Auth handles all authentication, supporting Google OAuth (primary) and email/password (fallback). All auth state is managed server-side with secure session cookies.

## Authentication Methods

1. **Google OAuth** (Primary) - One-click sign in with Google account
2. **Email/Password** (Fallback) - Traditional email registration

## Sign-up Flow

### Google OAuth Sign-up

```
1. User clicks "Sign in with Google" → GoogleAuthButton component
2. Supabase redirects to Google OAuth consent screen
3. User approves → Google redirects to /api/auth/callback
4. Supabase creates user in auth.users table
5. Database trigger creates profile in profiles table
   - Pulls name from Google (raw_user_meta_data->>'full_name')
   - Sets default role: 'worker'
   - Sets default subscription_status: 'free'
6. Redirect to /dashboard/feed or /onboarding based on profile completeness
7. If name not set or starts with "User-" → redirect to /onboarding
8. Onboarding collects: name, role, employer_type, trade, location
9. After onboarding → redirect to /dashboard/feed
```

### Email/Password Sign-up

```
1. User fills signup form → SignupForm component
2. POST to Supabase Auth with email, password, metadata (name)
3. Supabase sends verification email
4. Database trigger creates profile (same as OAuth)
5. User clicks email verification link
6. Redirect to /onboarding or /dashboard/feed
```

## Sign-in Flow

### Google OAuth Sign-in

```
1. User clicks "Sign in with Google"
2. If already has account → Supabase authenticates
3. Redirect to /dashboard/feed
4. Session stored in secure HTTP-only cookie
```

### Email/Password Sign-in

```
1. User submits login form
2. Supabase validates credentials
3. Returns session token
4. Redirect to /dashboard/feed
```

## Database Trigger (Profile Creation)

```sql
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    email,
    name,
    role,
    subscription_status,
    trade,
    location,
    bio
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      'User-' || substring(NEW.id::text, 1, 8)
    ),
    'worker',
    'free',
    'General Laborer',
    'Update your location',
    'Ready to work hard and learn new skills on site!'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

## Session Management

### Server Components

```typescript
// lib/supabase/server.ts
import { createServerClient as createClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export function createServerClient() {
  const cookieStore = cookies()

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
      },
    }
  )
}

// Usage in Server Component
export default async function ProfilePage() {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return <ProfileView profile={profile} />
}
```

### Client Components

```typescript
// lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// features/auth/hooks/use-auth.ts
import { createClient } from '@/lib/supabase/client'
import { useQuery } from '@tanstack/react-query'

export function useAuth() {
  const supabase = createClient()

  return useQuery({
    queryKey: ['auth'],
    queryFn: async () => {
      const { data: { user }, error } = await supabase.auth.getUser()
      if (error) throw error

      if (!user) return null

      // Fetch full profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      return { user, profile }
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}
```

### Middleware (Route Protection)

```typescript
// app/middleware.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: any) {
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Protect dashboard routes
  if (!user && request.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Redirect authenticated users away from auth pages
  if (user && (request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/signup')) {
    return NextResponse.redirect(new URL('/dashboard/feed', request.url))
  }

  return response
}

export const config = {
  matcher: ['/dashboard/:path*', '/login', '/signup']
}
```

## Authorization Logic

### Role-Based Access

```typescript
// features/auth/hooks/use-is-employer.ts
export function useIsEmployer() {
  const { data } = useAuth()
  return data?.profile?.role === 'employer'
}

// Usage in component
function PostJobButton() {
  const isEmployer = useIsEmployer()

  if (!isEmployer) return null

  return <Button onClick={() => router.push('/dashboard/post-job')}>Post Job</Button>
}
```

### API Route Protection

```typescript
// app/api/jobs/route.ts
export async function POST(request: Request) {
  const supabase = createServerClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check if user is employer
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'employer') {
    return NextResponse.json(
      { error: 'Only employers can post jobs' },
      { status: 403 }
    )
  }

  // Continue with job creation...
}
```

## Row Level Security (RLS)

All tables have RLS policies:

```sql
-- Profiles: Everyone can read, users can only update their own
CREATE POLICY "profiles_select" ON profiles FOR SELECT USING (true);
CREATE POLICY "profiles_update" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Jobs: Everyone can read active jobs, only employers can create
CREATE POLICY "jobs_select" ON jobs FOR SELECT USING (status = 'active' OR employer_id = auth.uid());
CREATE POLICY "jobs_insert" ON jobs FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'employer')
);
CREATE POLICY "jobs_update" ON jobs FOR UPDATE USING (employer_id = auth.uid());

-- Messages: Only conversation participants can read/write
CREATE POLICY "messages_select" ON messages FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM conversations
    WHERE id = conversation_id
    AND (participant_1_id = auth.uid() OR participant_2_id = auth.uid())
  )
);
CREATE POLICY "messages_insert" ON messages FOR INSERT WITH CHECK (
  sender_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM conversations
    WHERE id = conversation_id
    AND (participant_1_id = auth.uid() OR participant_2_id = auth.uid())
  )
);

-- Job Applications: Workers can insert, both parties can view
CREATE POLICY "applications_insert" ON job_applications FOR INSERT WITH CHECK (
  worker_id = auth.uid() AND
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'worker')
);
CREATE POLICY "applications_select" ON job_applications FOR SELECT USING (
  worker_id = auth.uid() OR
  EXISTS (SELECT 1 FROM jobs WHERE id = job_id AND employer_id = auth.uid())
);
```

## Sign-out Flow

```typescript
// features/auth/components/sign-out-button.tsx
export function SignOutButton() {
  const router = useRouter()
  const supabase = createClient()

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh() // Clear server cache
  }

  return <Button onClick={handleSignOut}>Sign Out</Button>
}
```

## OAuth Callback Handler

```typescript
// app/api/auth/callback/route.ts
import { createServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  if (code) {
    const supabase = createServerClient()
    await supabase.auth.exchangeCodeForSession(code)
  }

  // Redirect to dashboard
  return NextResponse.redirect(new URL('/dashboard/feed', request.url))
}
```

## Security Considerations

1. **Session Storage**: HTTP-only cookies (not localStorage)
2. **CSRF Protection**: Built into Supabase Auth
3. **Password Requirements**: Enforce in Supabase dashboard (min 8 chars, etc.)
4. **Rate Limiting**: Supabase provides built-in rate limiting on auth endpoints
5. **Email Verification**: Optional but recommended for email/password auth
6. **RLS Enabled**: All tables must have RLS enabled and policies defined

## Testing Authentication

```typescript
// tests/auth/login.test.ts
import { render, screen, fireEvent } from '@testing-library/react'
import { LoginForm } from '@/features/auth/components/login-form'

describe('LoginForm', () => {
  it('should call signIn on form submission', async () => {
    const mockSignIn = jest.fn()
    render(<LoginForm />)

    const emailInput = screen.getByLabelText('Email')
    const passwordInput = screen.getByLabelText('Password')
    const submitButton = screen.getByText('Sign In')

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.change(passwordInput, { target: { value: 'password123' } })
    fireEvent.click(submitButton)

    // Assert mockSignIn was called with correct credentials
  })
})
```
