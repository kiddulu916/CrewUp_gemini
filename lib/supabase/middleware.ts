import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import * as Sentry from '@sentry/nextjs';

/**
 * Middleware Supabase client for refreshing auth sessions
 *
 * This client is used in Next.js middleware to:
 * 1. Refresh expired auth sessions automatically
 * 2. Ensure users stay logged in across page navigations
 * 3. Protect routes that require authentication
 *
 * IMPORTANT: This must be used in middleware.ts at the root of your project.
 *
 * @example middleware.ts
 * ```tsx
 * import { updateSession } from '@/lib/supabase/middleware';
 * import { type NextRequest } from 'next/server';
 *
 * export async function middleware(request: NextRequest) {
 *   return await updateSession(request);
 * }
 *
 * export const config = {
 *   matcher: [
 *     '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
 *   ],
 * };
 * ```
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Check if user has admin access for /admin/* routes
 */
async function checkAdminAccess(
  supabase: ReturnType<typeof createServerClient>,
  pathname: string
): Promise<boolean> {
  // Only check admin routes
  if (!pathname.startsWith('/admin')) {
    return true; // Not an admin route, allow
  }

  // Get current authenticated user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return false; // Not logged in
  }

  // Check if user has admin flag
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('user_id', user.id)
    .single();

  return profile?.is_admin === true;
}

export async function updateSession(request: NextRequest) {
  // Create an unmodified response
  let supabaseResponse = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });
  
  const supabase = createServerClient(
    supabaseUrl!,
    supabaseKey!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
          });
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options);
          });
        },
      },
    }
  );
  
  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.
  
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Add Sentry user context for better error tracking
  if (user) {
    // Fetch full profile for additional context
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, subscription_status, location, employer_type')
      .eq('id', user.id)
      .single();

    if (profile) {
      Sentry.setUser({
        id: user.id,
        email: user.email,
        role: profile.role,
        subscription_status: profile.subscription_status,
        location: profile.location,
        employer_type: profile.employer_type,
      });

      Sentry.setTags({
        user_role: profile.role,
        subscription_tier: profile.subscription_status,
      });
    }
  } else {
    // Clear Sentry user context on logout
    Sentry.setUser(null);
  }

  // Check admin access for /admin/* routes
  if (request.nextUrl.pathname.startsWith('/admin')) {
    const hasAdminAccess = await checkAdminAccess(
      supabase,
      request.nextUrl.pathname
    );

    if (!hasAdminAccess) {
      // Return 404 to hide admin routes from non-admins
      // (Don't redirect to login to avoid revealing admin routes exist)
      return NextResponse.rewrite(new URL('/404', request.url));
    }
  }

  // Protected routes logic
  const isProtectedRoute = request.nextUrl.pathname.startsWith('/dashboard');
  const isAuthRoute =
  request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/signup';

  // Redirect unauthenticated users trying to access protected routes
  if (!user && isProtectedRoute) {
    const redirectUrl = new URL('/login', request.url);
    redirectUrl.searchParams.set('redirect', request.nextUrl.pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // Redirect authenticated users away from auth pages
  if (user && isAuthRoute) {
    return NextResponse.redirect(new URL('/dashboard/feed', request.url));
  }

  return supabaseResponse;
}
