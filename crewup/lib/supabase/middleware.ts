import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

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
 * import { NextResponse, type NextRequest } from 'next/server';
 *
 * export async function middleware(request: NextRequest) {
 *   // Refresh auth session
 *   const response = await updateSession(request);
 *
 *   // Optional: Add custom logic here (e.g., redirect based on auth state)
 *   // const supabase = createClient(request);
 *   // const { data: { user } } = await supabase.auth.getUser();
 *   // if (!user && request.nextUrl.pathname.startsWith('/dashboard')) {
 *   //   return NextResponse.redirect(new URL('/login', request.url));
 *   // }
 *
 *   return response;
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
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;


export function createClient(request: NextRequest) {
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

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })
  return supabaseResponse;
}
