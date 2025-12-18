import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { SignOutButton } from '@/features/auth/components/sign-out-button';
import { Badge } from '@/components/ui';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

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
      <aside className="w-64 bg-white border-r border-gray-200 shadow-lg">
        <div className="flex h-full flex-col">
          {/* Logo with gradient */}
          <div className="flex h-16 items-center bg-gradient-to-r from-crewup-blue to-crewup-light-blue px-6">
            <Link href="/dashboard/feed" className="text-2xl font-bold text-white flex items-center gap-2">
              <span className="text-3xl">👷</span>
              CrewUp
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 px-3 py-4">
            <NavLink href="/dashboard/feed" icon="📰">
              Feed
            </NavLink>

            <NavLink href="/dashboard/profile" icon="👤">
              Profile
            </NavLink>

            {isWorker ? (
              <>
                <NavLink href="/dashboard/jobs" icon="💼">
                  Browse Jobs
                </NavLink>
                <NavLink href="/dashboard/applications" icon="📋">
                  My Applications
                </NavLink>
              </>
            ) : (
              <>
                <NavLink href="/dashboard/jobs" icon="📝">
                  My Job Posts
                </NavLink>
                <NavLink href="/dashboard/applications" icon="📥">
                  Applications Received
                </NavLink>
              </>
            )}

            <NavLink href="/dashboard/messages" icon="💬">
              Messages
            </NavLink>

            {!isPro && (
              <NavLink href="/dashboard/upgrade" icon="⭐" highlight>
                Upgrade to Pro
              </NavLink>
            )}
          </nav>

          {/* User Info */}
          <div className="border-t-2 border-crewup-light-blue p-4 bg-gradient-to-r from-blue-50 to-orange-50">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-crewup-blue to-crewup-orange text-white font-bold text-lg shadow-lg">
                {profile.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">
                  {profile.name}
                </p>
                <p className="text-xs font-medium text-crewup-blue truncate">{profile.trade}</p>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between">
              {isPro && <Badge variant="pro">Pro</Badge>}
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
  highlight = false,
}: {
  href: string;
  icon: string;
  children: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
        highlight
          ? 'bg-gradient-to-r from-crewup-orange to-crewup-light-orange text-white hover:shadow-lg hover:scale-105 animate-pulse'
          : 'text-gray-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-orange-50 hover:text-crewup-blue hover:shadow-md hover:scale-105 hover:border-l-4 hover:border-crewup-blue'
      }`}
    >
      <span className="text-xl">{icon}</span>
      {children}
    </Link>
  );
}
