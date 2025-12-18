import { LoginForm } from '@/features/auth/components/login-form';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export const metadata = {
  title: 'Login - CrewUp',
  description: 'Sign in to your CrewUp account',
};

export default async function LoginPage() {
  // Check if user is already logged in
  const supabase = await createClient();
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
