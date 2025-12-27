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
        <div className="mb-8 flex justify-center">
          <div className="flex items-center justify-center">
            <Image
              src="/logo.png"
              alt="KrewUp Logo"
              width={256}
              height={256}
              priority
            />
          </div>
        </div>

        <p className="text-2xl font-semibold text-gray-700 mb-4">
          Connecting Skilled Trade Workers with Employers
        </p>

        <p className="text-lg text-gray-600 mb-10 max-w-2xl mx-auto">
          Join the premier platform where skilled professionals meet their next opportunity
        </p>

        {user ? (
          <div className="flex flex-col items-center space-y-4 mb-16">
            <p className="text-xl font-semibold text-gray-700">Welcome back! 🎉</p>
            <Link href="/dashboard/feed">
              <Button size="lg" className="w-48 shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-110">Go to Dashboard</Button>
            </Link>
          </div>
        ) : (
          <div className="flex gap-4 justify-center items-center mb-16">
            <Link href="/signup">
              <Button size="lg" className="w-48 shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-110">Get Started</Button>
            </Link>
            <Link href="/login">
              <Button variant="outline" size="lg" className="w-48 shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-110">
                Sign In
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
