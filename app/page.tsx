import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui';
import { cookies } from 'next/headers';

export default async function Home() {
  const supabase = await createClient(await cookies());
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-100 via-white to-orange-100 relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-krewup-blue opacity-10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-krewup-orange opacity-10 rounded-full blur-3xl"></div>

      <div className="text-center px-4 relative z-10">
        <div className="mb-6 flex justify-center">
          <div className="flex h-32 w-32 items-center justify-center">
            <Image
              src="/logo.png"
              alt="KrewUp Logo"
              width={128}
              height={128}
              priority
            />
          </div>
        </div>

        <h1 className="text-7xl font-extrabold bg-gradient-to-r from-krewup-blue via-purple-600 to-krewup-orange bg-clip-text text-transparent mb-6 animate-pulse">
          KrewUp
        </h1>

        <p className="text-2xl font-semibold text-gray-700 mb-4">
          Connecting Skilled Trade Workers with Employers
        </p>

        <p className="text-lg text-gray-600 mb-10 max-w-2xl mx-auto">
          Join the premier platform where skilled professionals meet their next opportunity
        </p>

        {user ? (
          <div className="space-y-4">
            <p className="text-xl font-semibold text-gray-700">Welcome back! 🎉</p>
            <Link href="/dashboard/feed">
              <Button size="lg" className="shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-110">Go to Dashboard</Button>
            </Link>
          </div>
        ) : (
          <div className="flex gap-4 justify-center">
            <Link href="/signup">
              <Button size="lg" className="shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-110">Get Started</Button>
            </Link>
            <Link href="/login">
              <Button variant="outline" size="lg" className="shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-110">
                Sign In
              </Button>
            </Link>
          </div>
        )}

        <div className="mt-12 grid grid-cols-3 gap-8 max-w-3xl mx-auto">
          <div className="bg-white/80 backdrop-blur-sm p-4 rounded-xl shadow-lg border-2 border-krewup-blue/20 hover:scale-105 transition-transform">
            <div className="text-3xl mb-2">💼</div>
            <div className="text-sm font-semibold text-gray-700">Find Jobs</div>
          </div>
          <div className="bg-white/80 backdrop-blur-sm p-4 rounded-xl shadow-lg border-2 border-krewup-orange/20 hover:scale-105 transition-transform">
            <div className="text-3xl mb-2">🤝</div>
            <div className="text-sm font-semibold text-gray-700">Connect</div>
          </div>
          <div className="bg-white/80 backdrop-blur-sm p-4 rounded-xl shadow-lg border-2 border-purple-500/20 hover:scale-105 transition-transform">
            <div className="text-3xl mb-2">🚀</div>
            <div className="text-sm font-semibold text-gray-700">Grow</div>
          </div>
        </div>
      </div>
    </div>
  );
}
