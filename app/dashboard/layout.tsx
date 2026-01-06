import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { SignOutButton } from '@/features/auth/components/sign-out-button';
import { Badge } from '@/components/ui';
import { InitialsAvatar } from '@/lib/utils/initials-avatar';
import { cookies } from 'next/headers';
import { BottomNav } from './bottom-nav';
import { NotificationBell } from '@/features/notifications/components/notification-bell';
import { ModerationGuard } from '@/features/auth/components/moderation-guard';

      

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
    .from('users')
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
      <ModerationGuard />
      {/* Mobile Header - Visible on mobile, hidden on tablet+ */}
      <header className="fixed top-0 left-0 right-0 z-40 h-16 bg-gradient-to-r from-krewup-blue to-krewup-light-blue shadow-md md:hidden">
        <div className="flex h-full items-center justify-between px-4">
          <Link href="/dashboard/feed" className="flex items-center">
            <Image
              src="/navbar_logo.png"
              alt="KrewUp Logo"
              width={100}
              height={60}
              className="object-contain"
            />
          </Link>
          <div className="flex items-center gap-2">
            <div className="[&>a]:text-white">
              <NotificationBell />
            </div>
            {profile.profile_image_url ? (
              <img
                src={profile.profile_image_url}
                alt={profile.name}
                className="h-10 w-10 rounded-full object-cover border-2 border-white shadow-lg"
              />
            ) : (
              <InitialsAvatar name={profile.name} userId={profile.id} size="md" />
            )}
          </div>
        </div>
      </header>

      {/* Sidebar - Hidden on mobile, visible on tablet+ */}
      <aside className="hidden md:flex w-40 bg-white border-r border-gray-200 shadow-lg">
        <div className="flex h-full flex-col w-full">
          {/* Logo with gradient */}
          <div className="flex h-20 items-center justify-center bg-gradient-to-r from-krewup-blue to-krewup-light-blue w-full">
            <Link href="/dashboard/feed" className="flex items-center w-full justify-center">
              <Image
                src="/navbar_logo.png"
                alt="KrewUp Logo"
                width={160}
                height={80}
                className="object-cover w-full"
              />
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 px-1 py-4">
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
                <NavLink href="/dashboard/workers" icon="🔍" color="blue">
                  Find Workers
                </NavLink>
              </>
            )}

            <NavLink href="/dashboard/messages" icon="💬" color="teal">
              Messages
            </NavLink>

            <NavLink href="/dashboard/notifications" icon="🔔" color="blue">
              Notifications
            </NavLink>

            {isWorker && (
              <NavLink href="/dashboard/settings" icon="⚙️" color="purple">
                Settings
              </NavLink>
            )}

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
          <div className="border-t-2 border-krewup-light-blue p-1 bg-gradient-to-r from-blue-50 to-orange-50 w-full">
            <div className="flex flex-col items-center gap-1">
              {profile.profile_image_url ? (
                <img
                  src={profile.profile_image_url}
                  alt={profile.name}
                  className="h-10 w-10 rounded-full object-cover border-2 border-gray-200 shadow-lg"
                />
              ) : (
                <InitialsAvatar name={profile.name} userId={profile.id} size="md" />
              )}
              <div className="w-full text-center">
                <p className="text-xs font-semibold text-gray-900 truncate">
                  {profile.name.split(' ')[0]}
                </p>
              </div>
            </div>
            <div className="mt-1 flex justify-center w-full">
              <SignOutButton />
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-7xl px-4 py-8 md:pl-4 md:pr-6 pt-20 md:pt-8 pb-24 md:pb-8">
          {children}
        </div>
      </main>

      {/* Bottom Navigation - Visible on mobile, hidden on tablet+ */}
      <BottomNav isWorker={isWorker} isPro={isPro} />
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
      className={`flex items-center gap-1 rounded-lg px-1 py-2.5 text-xs font-medium transition-all duration-300 text-gray-700 hover:shadow-lg hover:scale-105 hover:border-l-4 ${colorStyles[color]} ${highlightStyles}`}
    >
      <span className="text-lg">{icon}</span>
      <span className="truncate font-semibold">{children}</span>
    </Link>
  );
}
