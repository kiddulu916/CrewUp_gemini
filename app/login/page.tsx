import { LoginForm } from '@/features/auth/components/login-form';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';

      

export const metadata = {
  title: 'Login - KrewUp',
  description: 'Sign in to your KrewUp account',
};

export default async function LoginPage() {
  // Check if user is already logged in
  const supabase = await createClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect('/dashboard/feed');
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <LoginForm />
    </div>
  );
}
