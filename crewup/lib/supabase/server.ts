import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Server-side Supabase client for use in Server Components, Server Actions, and API Routes
 *
 * This client automatically handles authentication cookies and is safe to use in server contexts.
 * It uses the cookies() helper from Next.js to read and write auth cookies.
 *
 * @example Server Component
 * ```tsx
 * import { createClient } from '@/lib/supabase/server';
 *
 * export default async function ProfilePage() {
 *   const supabase = await createClient();
 *   const { data: profile } = await supabase.from('profiles').select('*').single();
 *   return <div>{profile.name}</div>;
 * }
 * ```
 *
 * @example Server Action
 * ```tsx
 * 'use server';
 * import { createClient } from '@/lib/supabase/server';
 *
 * export async function updateProfile(formData: FormData) {
 *   const supabase = await createClient();
 *   await supabase.from('profiles').update({ name: formData.get('name') });
 * }
 * ```
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

export async function createClient(cookieStore: ReturnType<typeof cookies>) {

  return createServerClient(
    supabaseUrl!,
    supabaseKey!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch (error) {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing user sessions.
          }
        },
      },
    }
  );
}
