# Phase 3: Admin Dashboard Core - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build admin dashboard with certification verification queue, user management, and activity logging.

**Duration:** Days 4-6 (~18-24 hours)

**Architecture:** Admin layout with sidebar navigation, overview dashboard with metrics, certification queue with review panel, user management with search/moderation, server actions for all admin operations.

**Tech Stack:** Next.js 15, React, TypeScript, Supabase, TailwindCSS

**Prerequisites:** Phase 1 & 2 complete (database ready, user-facing badges working)

---

## Task 3.1: Create Admin Layout and Sidebar

**Files:**
- Create: `app/admin/layout.tsx`
- Create: `components/admin/admin-sidebar.tsx`

**Implementation:**

`components/admin/admin-sidebar.tsx`:
```typescript
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
```

`app/admin/layout.tsx`:
```typescript
import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';
import { AdminSidebar } from '@/components/admin/admin-sidebar';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Check if user is admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('user_id', user.id)
    .single();

  if (!profile?.is_admin) {
    redirect('/404');
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <AdminSidebar />
      <main className="flex-1">
        <div className="max-w-7xl mx-auto p-8">{children}</div>
      </main>
    </div>
  );
}
```

**Commit:**
```bash
git add app/admin/layout.tsx components/admin/admin-sidebar.tsx
git commit -m "feat(admin): create admin layout with sidebar navigation"
```

---

## Task 3.2: Create Overview Dashboard

**Files:**
- Create: `app/admin/dashboard/page.tsx`
- Create: `components/admin/metric-card.tsx`

**Implementation:**

`components/admin/metric-card.tsx`:
```typescript
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui';

type Props = {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  href?: string;
};

export function MetricCard({ title, value, subtitle, icon, trend, href }: Props) {
  const content = (
    <Card className={href ? 'cursor-pointer hover:border-blue-500 hover:shadow-lg transition-all' : ''}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-gray-600">{title}</CardTitle>
        {icon && <div className="text-3xl">{icon}</div>}
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">{value}</div>
        {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
        {trend && (
          <p
            className={`text-sm mt-2 font-medium ${
              trend.isPositive ? 'text-green-600' : 'text-red-600'
            }`}
          >
            {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}% vs last month
          </p>
        )}
      </CardContent>
    </Card>
  );

  if (href) {
    return <a href={href}>{content}</a>;
  }

  return content;
}
```

`app/admin/dashboard/page.tsx`:
```typescript
import { createServerClient } from '@/lib/supabase/server';
import { MetricCard } from '@/components/admin/metric-card';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui';

export default async function AdminDashboardPage() {
  const supabase = createServerClient();

  // Fetch metrics
  const [
    { count: totalUsers },
    { count: activeJobs },
    { count: pendingCerts },
    { count: proSubs },
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase
      .from('jobs')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'open'),
    supabase
      .from('certifications')
      .select('*', { count: 'exact', head: true })
      .eq('verification_status', 'pending'),
    supabase
      .from('subscriptions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active'),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-600 mt-2">Platform overview and key metrics</p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard title="Total Users" value={totalUsers || 0} icon="👥" />
        <MetricCard title="Active Jobs" value={activeJobs || 0} icon="💼" />
        <MetricCard
          title="Pending Certifications"
          value={pendingCerts || 0}
          subtitle="Awaiting review"
          icon="⏳"
          href="/admin/certifications"
        />
        <MetricCard title="Pro Subscribers" value={proSubs || 0} icon="⭐" />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <a
          href="/admin/certifications"
          className="p-6 bg-white rounded-lg border border-gray-200 hover:border-blue-500 hover:shadow-lg transition-all"
        >
          <h3 className="font-semibold text-lg mb-2">Review Certifications</h3>
          <p className="text-gray-600 text-sm">
            {pendingCerts || 0} certifications pending verification
          </p>
        </a>

        <a
          href="/admin/users"
          className="p-6 bg-white rounded-lg border border-gray-200 hover:border-blue-500 hover:shadow-lg transition-all"
        >
          <h3 className="font-semibold text-lg mb-2">Manage Users</h3>
          <p className="text-gray-600 text-sm">Search, view, and moderate user accounts</p>
        </a>

        <a
          href="/admin/monitoring"
          className="p-6 bg-white rounded-lg border border-gray-200 hover:border-blue-500 hover:shadow-lg transition-all"
        >
          <h3 className="font-semibold text-lg mb-2">View Errors</h3>
          <p className="text-gray-600 text-sm">Monitor platform health and errors</p>
        </a>
      </div>
    </div>
  );
}
```

**Commit:**
```bash
git add app/admin/dashboard/page.tsx components/admin/metric-card.tsx
git commit -m "feat(admin): create overview dashboard with metrics"
```

---

## Task 3.3: Create Certification Verification Queue

**Files:**
- Create: `app/admin/certifications/page.tsx`
- Create: `features/admin/actions/certification-actions.ts`

**Implementation Summary:**

Create tabs for Pending/Verified/Rejected/Flagged certifications. Display queue with image thumbnails, user info, submission date. Build review panel with full image viewer, certification details, admin notes field, and approve/reject/flag actions. Log all actions to admin_activity_log.

**Key Server Actions:**
```typescript
// features/admin/actions/certification-actions.ts
'use server';

import { createServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function approveCertification(certificationId: string) {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Update certification
  await supabase
    .from('certifications')
    .update({
      verification_status: 'verified',
      verified_at: new Date().toISOString(),
      verified_by: user?.id,
    })
    .eq('id', certificationId);

  // If it's a contractor license, enable job posting
  const { data: cert } = await supabase
    .from('certifications')
    .select('user_id, credential_category')
    .eq('id', certificationId)
    .single();

  if (cert?.credential_category === 'license') {
    await supabase
      .from('profiles')
      .update({ can_post_jobs: true })
      .eq('user_id', cert.user_id);
  }

  // Log activity
  await supabase.from('admin_activity_log').insert({
    admin_id: user?.id,
    action: 'verified_cert',
    target_type: 'certification',
    target_id: certificationId,
  });

  revalidatePath('/admin/certifications');
  return { success: true };
}

export async function rejectCertification(
  certificationId: string,
  reason: string
) {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  await supabase
    .from('certifications')
    .update({
      verification_status: 'rejected',
      verified_at: new Date().toISOString(),
      verified_by: user?.id,
      rejection_reason: reason,
    })
    .eq('id', certificationId);

  // Log activity
  await supabase.from('admin_activity_log').insert({
    admin_id: user?.id,
    action: 'rejected_cert',
    target_type: 'certification',
    target_id: certificationId,
    details: { reason },
  });

  revalidatePath('/admin/certifications');
  return { success: true };
}
```

**Commit:**
```bash
git add app/admin/certifications/page.tsx features/admin/actions/certification-actions.ts
git commit -m "feat(admin): create certification verification queue

- Display pending/verified/rejected/flagged tabs
- Image viewer with zoom for certification photos
- Approve/reject/flag actions with logging
- Enable job posting for approved contractor licenses
- Admin activity audit trail"
```

---

## Task 3.4: Create User Management Dashboard

**Files:**
- Create: `app/admin/users/page.tsx`
- Create: `features/admin/actions/user-actions.ts`

**Implementation Summary:**

User search and filter by role/subscription. Display user list with profile details. User detail panel showing full profile, activity, subscription info. Actions: suspend, ban, grant Pro, view details.

**Commit:**
```bash
git add app/admin/users/page.tsx features/admin/actions/user-actions.ts
git commit -m "feat(admin): create user management dashboard

- Search and filter users
- View complete user profiles
- Suspend/ban moderation actions
- Grant Pro subscriptions manually
- Activity logging for all actions"
```

---

## Phase 3 Verification Checklist

- [ ] Admin layout with sidebar created
- [ ] All 7 nav links functional
- [ ] Overview dashboard displays metrics
- [ ] Metric cards clickable to relevant sections
- [ ] Certification queue shows pending certs
- [ ] Review panel displays images correctly
- [ ] Approve action sets verified status
- [ ] Approve enables job posting for contractor licenses
- [ ] Reject action requires reason
- [ ] Rejection reason saved to database
- [ ] All actions logged to admin_activity_log
- [ ] User management search works
- [ ] User detail panel shows complete info
- [ ] Moderation actions functional
- [ ] TypeScript builds without errors
- [ ] All commits pushed

---

## Success Criteria

Admin can log in, view dashboard metrics, review and verify certifications with image viewer, approve/reject with logging, manage users, and all actions are audited.

**Ready for Phase 4:** Analytics and monitoring integration.
