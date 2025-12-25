import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { SignOutButton } from '@/features/auth/components/sign-out-button';
import { Badge } from '@/components/ui';
import { cookies } from 'next/headers';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient(await cookies());

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (!profile) {
    redirect('/onboarding');
  }

  const isWorker = profile.role === 'worker';
  const isPro = profile.subscription_status === 'pro';

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50">
      {/* Sidebar */}
      <aside className="w-40 bg-white border-r border-gray-200 shadow-lg">
        <div className="flex h-full flex-col">
          {/* Logo with gradient */}
          <div className="flex h-16 items-center justify-center bg-gradient-to-r from-krewup-blue to-krewup-light-blue px-2">
            <Link href="/dashboard/feed" className="text-xl font-bold text-white flex items-center gap-1">
              <span className="text-2xl">👷</span>
              <span className="hidden sm:inline">KrewUp</span>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 px-2 py-4">
            <NavLink href="/dashboard/feed" icon="📰" color="blue">
              Feed
            </NavLink>

            <NavLink href="/dashboard/profile" icon="👤" color="purple">
              Profile
            </NavLink>

            {isWorker ? (
              <>
                <NavLink href="/dashboard/jobs" icon="💼" color="orange">
                  Browse Jobs
                </NavLink>
                <NavLink href="/dashboard/applications" icon="📋" color="green">
                  Applications
                </NavLink>
              </>
            ) : (
              <>
                <NavLink href="/dashboard/jobs" icon="📝" color="orange">
                  Job Posts
                </NavLink>
                <NavLink href="/dashboard/applications" icon="📥" color="green">
                  Applications
                </NavLink>
              </>
            )}

            <NavLink href="/dashboard/messages" icon="💬" color="teal">
              Messages
            </NavLink>

            <NavLink href="/dashboard/subscription" icon="💳" color="purple">
              Subscription
            </NavLink>

            {!isPro && (
              <NavLink href="/dashboard/upgrade" icon="⭐" color="gold" highlight>
                Upgrade to Pro
              </NavLink>
            )}
          </nav>

          {/* User Info */}
          <div className="border-t-2 border-krewup-light-blue p-2 bg-gradient-to-r from-blue-50 to-orange-50">
            <div className="flex flex-col items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-krewup-blue to-krewup-orange text-white font-bold text-sm shadow-lg">
                {profile.name.charAt(0).toUpperCase()}
              </div>
              <div className="w-full text-center">
                <p className="text-xs font-semibold text-gray-900 truncate px-1">
                  {profile.name.split(' ')[0]}
                </p>
              </div>
            </div>
            <div className="mt-2 flex justify-center">
              <SignOutButton />
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  );
}

function NavLink({
  href,
  icon,
  children,
  color = 'blue',
  highlight = false,
}: {
  href: string;
  icon: string;
  children: React.ReactNode;
  color?: 'blue' | 'purple' | 'orange' | 'green' | 'teal' | 'gold';
  highlight?: boolean;
}) {
  const colorStyles = {
    blue: 'hover:text-blue-600 hover:bg-blue-50 hover:border-blue-500',
    purple: 'hover:text-purple-600 hover:bg-purple-50 hover:border-purple-500',
    orange: 'hover:text-orange-600 hover:bg-orange-50 hover:border-orange-500',
    green: 'hover:text-green-600 hover:bg-green-50 hover:border-green-500',
    teal: 'hover:text-teal-600 hover:bg-teal-50 hover:border-teal-500',
    gold: 'hover:text-yellow-600 hover:bg-yellow-50 hover:border-yellow-500',
  };

  const highlightStyles = highlight
    ? 'bg-gradient-to-r from-yellow-100 to-orange-100 text-orange-700 font-semibold shadow-md border-l-4 border-yellow-500'
    : '';

  return (
    <Link
      href={href}
      className={`flex items-center gap-2 rounded-lg px-2 py-2.5 text-xs font-medium transition-all duration-300 text-gray-700 hover:shadow-lg hover:scale-105 hover:border-l-4 ${colorStyles[color]} ${highlightStyles}`}
    >
      <span className="text-lg">{icon}</span>
      <span className="truncate font-semibold">{children}</span>
    </Link>
  );
}
