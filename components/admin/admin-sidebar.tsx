'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navigation = [
  { name: 'Overview', href: '/admin/dashboard', icon: '📊' },
  { name: 'Certifications', href: '/admin/certifications', icon: '✓' },
  { name: 'Users', href: '/admin/users', icon: '👥' },
  { name: 'Analytics', href: '/admin/analytics/overview', icon: '📈' },
  { name: 'Monitoring', href: '/admin/monitoring', icon: '🔍' },
  { name: 'Moderation', href: '/admin/moderation', icon: '🛡️' },
  { name: 'Settings', href: '/admin/settings', icon: '⚙️' },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-44 bg-gray-900 text-white min-h-screen flex flex-col">
      <div className="p-3">
        <h1 className="text-lg font-bold">KrewUp Admin</h1>
        <p className="text-xs text-gray-400 mt-1">Platform Mgmt</p>
      </div>

      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        {navigation.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + '/');

          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-2 px-2 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-gray-800 text-white'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <span className="text-base">{item.icon}</span>
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-gray-800">
        <Link
          href="/dashboard/feed"
          className="flex items-center gap-2 text-xs text-gray-400 hover:text-white transition-colors"
        >
          <span>←</span>
          <span>Back to App</span>
        </Link>
      </div>
    </aside>
  );
}
