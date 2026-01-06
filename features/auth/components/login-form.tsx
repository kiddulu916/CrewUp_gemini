'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Input } from '@/components/ui';
import { signIn, signInWithGoogle } from '../actions/auth-actions';

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const result = await signIn(email, password);

    if (!result.success) {
      setError(result.error || 'Failed to sign in');
      setIsLoading(false);
    }
    // If successful, user will be redirected by the action
  }

  async function handleGoogleSignIn() {
    setError('');
    setIsLoading(true);

    try {
      await signInWithGoogle();
      // Redirect to Google OAuth happens automatically
      // The redirect() call in the server action will throw, which is expected
    } catch (error) {
      // Next.js redirect() throws a NEXT_REDIRECT error, which is expected - ignore it
      // Only show errors for actual failures
      if (error instanceof Error && !error.message.includes('NEXT_REDIRECT')) {
        setError(error.message || 'Failed to sign in with Google');
        setIsLoading(false);
      }
      // If it's a NEXT_REDIRECT, let it propagate (don't set loading to false)
    }
  }

  return (
    <div className="w-full max-w-md space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900">Welcome back</h1>
        <p className="mt-2 text-sm text-gray-600">Sign in to your KrewUp account</p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <Button
        variant="outline"
        size="lg"
        className="w-full"
        onClick={handleGoogleSignIn}
        disabled={isLoading}
      >
        <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
          <path
            fill="currentColor"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="currentColor"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="currentColor"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          />
          <path
            fill="currentColor"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
        Continue with Google
      </Button>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="bg-white px-2 text-gray-500">Or continue with email</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={isLoading}
        />

        <Input
          label="Password"
          type="password"
          placeholder="Enter your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          disabled={isLoading}
        />

        <div className="flex items-center justify-between">
          <label htmlFor="remember-me" className="flex items-center">
            <input
              id="remember-me"
              type="checkbox"
              aria-label="Remember me"
              className="h-4 w-4 rounded border-gray-300 text-krewup-blue focus:ring-krewup-blue"
            />
            <span className="ml-2 text-sm text-gray-600">Remember me</span>
          </label>
          <a
            href="/auth/forgot-password"
            className="text-sm text-krewup-blue hover:underline"
          >
            Forgot password?
          </a>
        </div>

        <Button type="submit" size="lg" className="w-full" isLoading={isLoading}>
          Sign in
        </Button>
      </form>

      <p className="text-center text-sm text-gray-600">
        Don't have an account?{' '}
        <a href="/signup" className="font-medium text-krewup-blue hover:underline">
          Sign up
        </a>
      </p>
    </div>
  );
}
