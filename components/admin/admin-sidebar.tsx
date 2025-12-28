'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navigation = [
  { name: 'Overview', href: '/admin/dashboard', icon: '📊' },
  { name: 'Certifications', href: '/admin/certifications', icon: '✓' },
  { name: 'Users', href: '/admin/users', icon: '👥' },
  { name: 'Analytics', href: '/admin/analytics', icon: '📈' },
  { name: 'Monitoring', href: '/admin/monitoring', icon: '🔍' },
  { name: 'Moderation', href: '/admin/moderation', icon: '🛡️' },
  { name: 'Settings', href: '/admin/settings', icon: '⚙️' },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-gray-900 text-white min-h-screen">
      <div className="p-6">
        <h1 className="text-2xl font-bold">KrewUp Admin</h1>
        <p className="text-xs text-gray-400 mt-1">Platform Management</p>
      </div>

      <nav className="px-3 space-y-1">
        {navigation.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + '/');

          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-gray-800 text-white'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <span className="text-xl">{item.icon}</span>
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className="absolute bottom-0 w-64 p-4 border-t border-gray-800">
        <Link
          href="/dashboard/feed"
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
        >
          <span>←</span>
          <span>Back to Main App</span>
        </Link>
      </div>
    </aside>
  );
}
