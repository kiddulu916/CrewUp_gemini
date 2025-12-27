# Phase 4: Analytics & Monitoring - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Integrate Sentry for error monitoring, build analytics dashboard with charts, create moderation queue, and settings management.

**Duration:** Days 7-8 (~12-16 hours)

**Architecture:** Sentry SDK integration, Recharts for data visualization, server actions for analytics aggregation, moderation queue for content reports.

**Tech Stack:** Sentry, Recharts, Next.js 15, Supabase

**Prerequisites:** Phase 1-3 complete (admin dashboard functional)

---

## Task 4.1: Set Up Sentry Integration

**Step 1: Install Sentry**

Run: `npm install @sentry/nextjs`

**Step 2: Initialize Sentry**

Run: `npx @sentry/wizard@latest -i nextjs`

Follow wizard prompts:
- Create Sentry account at sentry.io
- Select Next.js project
- Copy DSN to `.env.local`

**Step 3: Configure Sentry files**

The wizard creates:
- `sentry.client.config.ts`
- `sentry.server.config.ts`
- `sentry.edge.config.ts`

Add user context in `sentry.client.config.ts`:

```typescript
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 1.0,
  beforeSend(event, hint) {
    // Add user context
    if (typeof window !== 'undefined') {
      const user = getUserFromLocalStorage(); // Your auth logic
      if (user) {
        event.user = {
          id: user.id,
          email: user.email,
        };
      }
    }
    return event;
  },
});
```

**Step 4: Test Sentry**

Create test error button in dashboard:
```typescript
<button onClick={() => { throw new Error('Test Sentry'); }}>
  Test Error
</button>
```

Check Sentry dashboard for error.

**Commit:**
```bash
git add . && git commit -m "feat(monitoring): integrate Sentry error tracking

- Install @sentry/nextjs
- Configure client, server, edge runtimes
- Add user context to error reports
- Set up DSN in environment variables"
```

---

## Task 4.2: Create Analytics Dashboard

**Step 1: Install Recharts**

Run: `npm install recharts`

**Step 2: Create analytics actions**

Create `features/admin/actions/analytics-actions.ts`:

```typescript
'use server';

import { createServerClient } from '@/lib/supabase/server';

export async function getUserGrowthData() {
  const supabase = createServerClient();

  const { data } = await supabase
    .from('profiles')
    .select('created_at')
    .order('created_at', { ascending: true });

  // Group by date
  const grouped = data?.reduce((acc, profile) => {
    const date = new Date(profile.created_at).toISOString().split('T')[0];
    acc[date] = (acc[date] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return Object.entries(grouped || {}).map(([date, count]) => ({
    date,
    users: count,
  }));
}

export async function getEngagementMetrics() {
  const supabase = createServerClient();

  const [{ count: jobs }, { count: apps }, { count: messages }] =
    await Promise.all([
      supabase.from('jobs').select('*', { count: 'exact', head: true }),
      supabase.from('job_applications').select('*', { count: 'exact', head: true }),
      supabase.from('messages').select('*', { count: 'exact', head: true }),
    ]);

  return { jobs, apps, messages };
}
```

**Step 3: Create analytics page**

Create `app/admin/analytics/page.tsx`:

```typescript
import { getUserGrowthData, getEngagementMetrics } from '@/features/admin/actions/analytics-actions';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui';
import { UserGrowthChart } from '@/components/admin/user-growth-chart';
import { MetricCard } from '@/components/admin/metric-card';

export default async function AnalyticsPage() {
  const [growthData, metrics] = await Promise.all([
    getUserGrowthData(),
    getEngagementMetrics(),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Analytics</h1>
        <p className="text-gray-600 mt-2">Platform insights and trends</p>
      </div>

      {/* Engagement Metrics */}
      <div className="grid grid-cols-3 gap-6">
        <MetricCard title="Total Jobs" value={metrics.jobs || 0} icon="💼" />
        <MetricCard title="Applications" value={metrics.apps || 0} icon="📝" />
        <MetricCard title="Messages" value={metrics.messages || 0} icon="💬" />
      </div>

      {/* User Growth Chart */}
      <Card>
        <CardHeader>
          <CardTitle>User Growth</CardTitle>
        </CardHeader>
        <CardContent>
          <UserGrowthChart data={growthData} />
        </CardContent>
      </Card>
    </div>
  );
}
```

**Step 4: Create chart component**

Create `components/admin/user-growth-chart.tsx`:

```typescript
'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

type Props = {
  data: Array<{ date: string; users: number }>;
};

export function UserGrowthChart({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis />
        <Tooltip />
        <Line type="monotone" dataKey="users" stroke="#3b82f6" strokeWidth={2} />
      </LineChart>
    </ResponsiveContainer>
  );
}
```

**Commit:**
```bash
git add app/admin/analytics/page.tsx features/admin/actions/analytics-actions.ts components/admin/user-growth-chart.tsx
git commit -m "feat(admin): create analytics dashboard with charts

- Install Recharts for data visualization
- User growth line chart
- Engagement metrics (jobs, apps, messages)
- Server actions for data aggregation"
```

---

## Task 4.3: Create Monitoring Dashboard

**Files:**
- Create: `app/admin/monitoring/page.tsx`
- Create: `features/admin/actions/sentry-actions.ts`

**Implementation:**

Fetch recent errors from Sentry API, display error rate chart, show top issues with links to Sentry, system health checks.

**Commit:**
```bash
git add app/admin/monitoring/page.tsx features/admin/actions/sentry-actions.ts
git commit -m "feat(admin): create monitoring dashboard

- Fetch errors from Sentry API
- Display error rate chart
- Show top issues with details
- System health status indicators"
```

---

## Task 4.4: Create Moderation Queue

**Files:**
- Create: `app/admin/moderation/page.tsx`
- Create: `features/admin/actions/moderation-actions.ts`

**Implementation:**

Display content_reports queue, review panel with reported content, actions to remove content/warn/suspend/ban users.

**Commit:**
```bash
git add app/admin/moderation/page.tsx features/admin/actions/moderation-actions.ts
git commit -m "feat(admin): create moderation dashboard

- Content reports queue
- Review reported jobs/profiles/messages
- Remove content, warn, suspend, ban actions
- Admin notes and action logging"
```

---

## Task 4.5: Create Settings Dashboard

**Files:**
- Create: `app/admin/settings/page.tsx`
- Create: `features/admin/actions/settings-actions.ts`

**Implementation:**

Edit platform_settings table, manage admin users (add/remove admins), configure feature flags.

**Commit:**
```bash
git add app/admin/settings/page.tsx features/admin/actions/settings-actions.ts
git commit -m "feat(admin): create settings dashboard

- Edit platform settings (maintenance mode, etc.)
- Manage admin users (grant/revoke access)
- Configure feature flags"
```

---

## Phase 4 Verification Checklist

- [ ] Sentry installed and configured
- [ ] Errors appear in Sentry dashboard
- [ ] User context included in error reports
- [ ] Recharts installed
- [ ] Analytics dashboard displays charts
- [ ] User growth chart shows data
- [ ] Engagement metrics accurate
- [ ] Monitoring dashboard fetches Sentry data
- [ ] Moderation queue displays reports
- [ ] Settings page edits platform_settings
- [ ] Admin management works
- [ ] All commits pushed

---

## Success Criteria

Sentry capturing errors, analytics charts displaying real data, monitoring dashboard functional, moderation queue operational, settings editable.

**Ready for Phase 5:** Polish, testing, and deployment.
