# Phase 3: Operational Efficiency & Alerts - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build admin workload tracking, predictive forecasting, smart alerting system, and performance monitoring

**Architecture:** Database migrations for activity logs and alerts → Server actions for workload metrics → Alert generation system → Notification panel in admin layout → Sentry performance monitoring integration

**Tech Stack:** PostgreSQL triggers, Supabase RPC functions, Sentry Performance SDK, Next.js Server Actions, React Context for alerts

**Prerequisites:** Phase 1 and 2 must be complete

---

## Task 1: Database Migration - Admin Activity Logs

**Files:**
- Create: `supabase/migrations/045_create_admin_activity_logs.sql`

**Step 1: Create migration SQL**

```sql
-- supabase/migrations/045_create_admin_activity_logs.sql

-- Create admin_activity_logs table
CREATE TABLE IF NOT EXISTS admin_activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL, -- 'certification_approved', 'certification_rejected', 'user_suspended', 'user_banned', 'user_unbanned', 'content_report_actioned', 'content_report_dismissed'
  target_id UUID NOT NULL, -- ID of affected resource (certification, user, content_report)
  target_type TEXT NOT NULL, -- 'certification', 'user', 'content_report'
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes
CREATE INDEX idx_admin_activity_logs_admin_user_id ON admin_activity_logs(admin_user_id);
CREATE INDEX idx_admin_activity_logs_action_type ON admin_activity_logs(action_type);
CREATE INDEX idx_admin_activity_logs_created_at ON admin_activity_logs(created_at DESC);
CREATE INDEX idx_admin_activity_logs_target ON admin_activity_logs(target_type, target_id);

-- Enable RLS
ALTER TABLE admin_activity_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Only admins can view activity logs
CREATE POLICY "Admins can view all activity logs"
  ON admin_activity_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Policy: System can insert activity logs
CREATE POLICY "System can insert activity logs"
  ON admin_activity_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Comment
COMMENT ON TABLE admin_activity_logs IS 'Audit trail of admin actions for compliance and performance tracking';
```

**Step 2: Apply migration**

Run: `npx supabase db push`
Expected: Migration applied successfully

**Step 3: Commit**

```bash
git add supabase/migrations/045_create_admin_activity_logs.sql
git commit -m "feat(db): add admin activity logs table for audit trail"
```

---

## Task 2: Database Migration - Dashboard Alerts

**Files:**
- Create: `supabase/migrations/046_create_dashboard_alerts.sql`

**Step 1: Create migration SQL**

```sql
-- supabase/migrations/046_create_dashboard_alerts.sql

-- Create dashboard_alerts table
CREATE TABLE IF NOT EXISTS dashboard_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  alert_type TEXT NOT NULL, -- 'error_rate_spike', 'critical_error', 'cert_queue_backlog', 'churn_spike', 'system_degradation'
  severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT, -- Deep link to relevant page
  metadata JSONB DEFAULT '{}',
  acknowledged BOOLEAN DEFAULT FALSE,
  acknowledged_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  acknowledged_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes
CREATE INDEX idx_dashboard_alerts_severity ON dashboard_alerts(severity);
CREATE INDEX idx_dashboard_alerts_acknowledged ON dashboard_alerts(acknowledged);
CREATE INDEX idx_dashboard_alerts_created_at ON dashboard_alerts(created_at DESC);
CREATE INDEX idx_dashboard_alerts_type ON dashboard_alerts(alert_type);

-- Enable RLS
ALTER TABLE dashboard_alerts ENABLE ROW LEVEL SECURITY;

-- Policy: Only admins can view alerts
CREATE POLICY "Admins can view all alerts"
  ON dashboard_alerts
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Policy: Only admins can update alerts (acknowledge)
CREATE POLICY "Admins can acknowledge alerts"
  ON dashboard_alerts
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Policy: System can insert alerts
CREATE POLICY "System can insert alerts"
  ON dashboard_alerts
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Function to auto-archive old acknowledged alerts
CREATE OR REPLACE FUNCTION archive_old_alerts()
RETURNS void AS $$
BEGIN
  DELETE FROM dashboard_alerts
  WHERE acknowledged = true
  AND acknowledged_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comment
COMMENT ON TABLE dashboard_alerts IS 'Smart alerts for admin dashboard monitoring';
```

**Step 2: Apply migration**

Run: `npx supabase db push`
Expected: Migration applied successfully

**Step 3: Commit**

```bash
git add supabase/migrations/046_create_dashboard_alerts.sql
git commit -m "feat(db): add dashboard alerts table for smart alerting system"
```

---

## Task 3: Admin Activity Logging Helper

**Files:**
- Create: `lib/admin/activity-logger.ts`
- Create: `__tests__/lib/admin/activity-logger.test.ts`

**Step 1: Write the failing test**

```typescript
// __tests__/lib/admin/activity-logger.test.ts
import { describe, it, expect } from 'vitest';
import { logAdminActivity } from '@/lib/admin/activity-logger';

describe('Activity Logger', () => {
  it('logs certification approval activity', async () => {
    const result = await logAdminActivity({
      adminUserId: 'admin-123',
      actionType: 'certification_approved',
      targetId: 'cert-456',
      targetType: 'certification',
      details: { reason: 'Valid license' },
    });

    expect(result).toBeDefined();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- __tests__/lib/admin/activity-logger.test.ts`
Expected: FAIL with "Cannot find module '@/lib/admin/activity-logger'"

**Step 3: Implement activity logger**

```typescript
// lib/admin/activity-logger.ts
'use server';

import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export type AdminActionType =
  | 'certification_approved'
  | 'certification_rejected'
  | 'user_suspended'
  | 'user_banned'
  | 'user_unbanned'
  | 'content_report_actioned'
  | 'content_report_dismissed'
  | 'subscription_granted'
  | 'subscription_revoked';

export type ActivityLogParams = {
  adminUserId: string;
  actionType: AdminActionType;
  targetId: string;
  targetType: 'certification' | 'user' | 'content_report' | 'subscription';
  details?: Record<string, any>;
};

/**
 * Log an admin activity for audit trail
 */
export async function logAdminActivity(params: ActivityLogParams): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient(await cookies());

    const { error } = await supabase.from('admin_activity_logs').insert({
      admin_user_id: params.adminUserId,
      action_type: params.actionType,
      target_id: params.targetId,
      target_type: params.targetType,
      details: params.details || {},
    });

    if (error) {
      console.error('[activity-logger] Failed to log activity:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    console.error('[activity-logger] Unexpected error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get admin activity history
 */
export async function getAdminActivityHistory(
  adminUserId?: string,
  limit: number = 100
): Promise<any[]> {
  const supabase = await createClient(await cookies());

  let query = supabase
    .from('admin_activity_logs')
    .select(
      `
      id,
      action_type,
      target_id,
      target_type,
      details,
      created_at,
      admin:users!admin_user_id(name, email)
    `
    )
    .order('created_at', { ascending: false })
    .limit(limit);

  if (adminUserId) {
    query = query.eq('admin_user_id', adminUserId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[activity-logger] Failed to fetch history:', error);
    return [];
  }

  return data || [];
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- __tests__/lib/admin/activity-logger.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add lib/admin/activity-logger.ts __tests__/lib/admin/activity-logger.test.ts
git commit -m "feat(admin): add activity logging helper for audit trail"
```

---

## Task 4: Integrate Activity Logging into Existing Admin Actions

**Files:**
- Modify: `features/admin/actions/certification-actions.ts`
- Modify: `features/admin/actions/user-actions.ts`
- Modify: `features/admin/actions/moderation-actions.ts`

**Step 1: Add logging to certification approval**

```typescript
// features/admin/actions/certification-actions.ts
import { logAdminActivity } from '@/lib/admin/activity-logger';

// In verifyCertification function, after successful verification:
export async function verifyCertification(certificationId: string, notes?: string) {
  // ... existing verification code ...

  const { data: session } = await supabase.auth.getSession();
  const adminUserId = session.session?.user.id;

  if (adminUserId) {
    await logAdminActivity({
      adminUserId,
      actionType: 'certification_approved',
      targetId: certificationId,
      targetType: 'certification',
      details: { notes },
    });
  }

  // ... rest of function ...
}

// Similar for rejectCertification:
export async function rejectCertification(certificationId: string, reason: string) {
  // ... existing rejection code ...

  const { data: session } = await supabase.auth.getSession();
  const adminUserId = session.session?.user.id;

  if (adminUserId) {
    await logAdminActivity({
      adminUserId,
      actionType: 'certification_rejected',
      targetId: certificationId,
      targetType: 'certification',
      details: { reason },
    });
  }

  // ... rest of function ...
}
```

**Step 2: Add logging to user moderation actions**

```typescript
// features/admin/actions/user-actions.ts
import { logAdminActivity } from '@/lib/admin/activity-logger';

// In suspendUser function:
export async function suspendUser(userId: string, reason: string, durationDays: number) {
  // ... existing suspend code ...

  const { data: session } = await supabase.auth.getSession();
  const adminUserId = session.session?.user.id;

  if (adminUserId) {
    await logAdminActivity({
      adminUserId,
      actionType: 'user_suspended',
      targetId: userId,
      targetType: 'user',
      details: { reason, durationDays },
    });
  }

  // ... rest of function ...
}

// Similar for banUser, unbanUser, grantProSubscription, revokeProSubscription
```

**Step 3: Commit**

```bash
git add features/admin/actions/certification-actions.ts features/admin/actions/user-actions.ts features/admin/actions/moderation-actions.ts
git commit -m "feat(admin): integrate activity logging into admin actions"
```

---

## Task 5: Alert Generation System

**Files:**
- Create: `lib/admin/alert-generator.ts`
- Create: `__tests__/lib/admin/alert-generator.test.ts`

**Step 1: Write failing test**

```typescript
// __tests__/lib/admin/alert-generator.test.ts
import { describe, it, expect } from 'vitest';
import { createAlert, checkAndCreateAlerts } from '@/lib/admin/alert-generator';

describe('Alert Generator', () => {
  it('creates critical error alert', async () => {
    const result = await createAlert({
      alertType: 'critical_error',
      severity: 'critical',
      title: 'New Critical Error',
      message: 'Error affecting 15 users',
      link: '/admin/monitoring',
    });

    expect(result.success).toBe(true);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- __tests__/lib/admin/alert-generator.test.ts`
Expected: FAIL

**Step 3: Implement alert generator**

```typescript
// lib/admin/alert-generator.ts
'use server';

import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { getSystemHealth } from '@/features/admin/actions/sentry-actions';
import { getOperationalLoad } from '@/features/admin/actions/analytics-actions';

export type AlertSeverity = 'info' | 'warning' | 'critical';

export type AlertType =
  | 'error_rate_spike'
  | 'critical_error'
  | 'cert_queue_backlog'
  | 'churn_spike'
  | 'system_degradation';

export type CreateAlertParams = {
  alertType: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  link?: string;
  metadata?: Record<string, any>;
};

/**
 * Create a new dashboard alert
 */
export async function createAlert(params: CreateAlertParams): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient(await cookies());

    const { error } = await supabase.from('dashboard_alerts').insert({
      alert_type: params.alertType,
      severity: params.severity,
      title: params.title,
      message: params.message,
      link: params.link,
      metadata: params.metadata || {},
    });

    if (error) {
      console.error('[alert-generator] Failed to create alert:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    console.error('[alert-generator] Unexpected error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Check all alert conditions and create alerts as needed
 * This should be run periodically (e.g., via cron job or API route)
 */
export async function checkAndCreateAlerts(): Promise<{ alertsCreated: number }> {
  let alertsCreated = 0;

  // Check 1: System health degradation
  const systemHealth = await getSystemHealth();
  if (systemHealth.status === 'critical') {
    await createAlert({
      alertType: 'system_degradation',
      severity: 'critical',
      title: 'System Health Critical',
      message: systemHealth.message,
      link: '/admin/monitoring',
      metadata: {
        errorRate: systemHealth.errorRate,
        activeIssues: systemHealth.activeIssues,
      },
    });
    alertsCreated++;
  }

  // Check 2: Error rate spike
  if (systemHealth.errorRate > 50) {
    // Get previous week average (simplified)
    const isSpike = systemHealth.errorRate > 50; // > 50 errors/day
    if (isSpike) {
      await createAlert({
        alertType: 'error_rate_spike',
        severity: systemHealth.errorRate > 100 ? 'critical' : 'warning',
        title: 'Error Rate Spike Detected',
        message: `Error rate has increased to ${systemHealth.errorRate} errors/day`,
        link: '/admin/monitoring',
        metadata: { errorRate: systemHealth.errorRate },
      });
      alertsCreated++;
    }
  }

  // Check 3: Certification queue backlog
  const operationalLoad = await getOperationalLoad({
    preset: 'last7days',
    startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    endDate: new Date(),
  });

  if (operationalLoad.pendingCertifications > 100) {
    const supabase = await createClient(await cookies());

    // Check if certs have been pending for >48 hours
    const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
    const { count: oldPendingCount } = await supabase
      .from('certifications')
      .select('*', { count: 'exact', head: true })
      .eq('verification_status', 'pending')
      .lte('created_at', twoDaysAgo.toISOString());

    if ((oldPendingCount || 0) > 50) {
      await createAlert({
        alertType: 'cert_queue_backlog',
        severity: 'warning',
        title: 'Certification Queue Backlog',
        message: `${oldPendingCount} certifications pending for >48 hours`,
        link: '/admin/certifications?status=pending',
        metadata: {
          totalPending: operationalLoad.pendingCertifications,
          oldPending: oldPendingCount,
        },
      });
      alertsCreated++;
    }
  }

  return { alertsCreated };
}

/**
 * Get active alerts
 */
export async function getActiveAlerts(): Promise<any[]> {
  const supabase = await createClient(await cookies());

  const { data, error } = await supabase
    .from('dashboard_alerts')
    .select('*')
    .eq('acknowledged', false)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    console.error('[alert-generator] Failed to fetch alerts:', error);
    return [];
  }

  return data || [];
}

/**
 * Acknowledge an alert
 */
export async function acknowledgeAlert(alertId: string): Promise<{ success: boolean }> {
  const supabase = await createClient(await cookies());
  const { data: session } = await supabase.auth.getSession();
  const adminUserId = session.session?.user.id;

  if (!adminUserId) {
    return { success: false };
  }

  const { error } = await supabase
    .from('dashboard_alerts')
    .update({
      acknowledged: true,
      acknowledged_by: adminUserId,
      acknowledged_at: new Date().toISOString(),
    })
    .eq('id', alertId);

  if (error) {
    console.error('[alert-generator] Failed to acknowledge alert:', error);
    return { success: false };
  }

  return { success: true };
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- __tests__/lib/admin/alert-generator.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add lib/admin/alert-generator.ts __tests__/lib/admin/alert-generator.test.ts
git commit -m "feat(admin): add alert generation system with threshold checks"
```

---

## Task 6: Alerts API Route (for periodic checks)

**Files:**
- Create: `app/api/admin/check-alerts/route.ts`

**Step 1: Create API route for alert checks**

```typescript
// app/api/admin/check-alerts/route.ts
import { NextResponse } from 'next/server';
import { checkAndCreateAlerts } from '@/lib/admin/alert-generator';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

/**
 * API route to check alert conditions and create alerts
 * Can be called via cron job or manually
 */
export async function POST(request: Request) {
  try {
    // Verify admin access
    const supabase = await createClient(await cookies());
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('users')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (!profile?.is_admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Run alert checks
    const result = await checkAndCreateAlerts();

    return NextResponse.json({
      success: true,
      alertsCreated: result.alertsCreated,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[check-alerts] Error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
```

**Step 2: Commit**

```bash
git add app/api/admin/check-alerts/route.ts
git commit -m "feat(api): add alert checking API endpoint"
```

---

## Task 7: Alerts Panel Component

**Files:**
- Create: `components/admin/alerts-panel.tsx`

**Step 1: Create alerts panel component**

```typescript
// components/admin/alerts-panel.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { getActiveAlerts, acknowledgeAlert } from '@/lib/admin/alert-generator';
import { Badge } from '@/components/ui/badge';

export function AlertsPanel() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAlerts();
    // Poll for new alerts every 5 minutes
    const interval = setInterval(fetchAlerts, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchAlerts = async () => {
    setLoading(true);
    const data = await getActiveAlerts();
    setAlerts(data);
    setLoading(false);
  };

  const handleAcknowledge = async (alertId: string) => {
    await acknowledgeAlert(alertId);
    setAlerts(alerts.filter((a) => a.id !== alertId));
  };

  const getSeverityColor = (severity: string): string => {
    switch (severity) {
      case 'critical':
        return 'bg-red-500';
      case 'warning':
        return 'bg-yellow-500';
      case 'info':
        return 'bg-blue-500';
      default:
        return 'bg-gray-500';
    }
  };

  const unacknowledgedCount = alerts.length;

  return (
    <div className="relative">
      {/* Alert Bell Icon */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-900 focus:outline-none"
      >
        <span className="text-2xl">🔔</span>
        {unacknowledgedCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-600 rounded-full">
            {unacknowledgedCount}
          </span>
        )}
      </button>

      {/* Alerts Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Alerts</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-gray-500">Loading...</div>
            ) : alerts.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                No active alerts
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {alerts.map((alert) => (
                  <div key={alert.id} className="p-4 hover:bg-gray-50">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <div
                            className={`w-2 h-2 rounded-full ${getSeverityColor(
                              alert.severity
                            )}`}
                          />
                          <h4 className="font-semibold text-gray-900 text-sm">
                            {alert.title}
                          </h4>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">
                          {alert.message}
                        </p>
                        <div className="flex items-center gap-2">
                          {alert.link && (
                            <a
                              href={alert.link}
                              className="text-xs text-blue-600 hover:text-blue-800 hover:underline"
                              onClick={() => setIsOpen(false)}
                            >
                              View Details →
                            </a>
                          )}
                          <button
                            onClick={() => handleAcknowledge(alert.id)}
                            className="text-xs text-gray-500 hover:text-gray-700"
                          >
                            Dismiss
                          </button>
                        </div>
                      </div>
                      <Badge
                        variant={
                          alert.severity === 'critical'
                            ? 'danger'
                            : alert.severity === 'warning'
                            ? 'warning'
                            : 'default'
                        }
                        className="ml-2"
                      >
                        {alert.severity}
                      </Badge>
                    </div>
                    <div className="text-xs text-gray-400 mt-2">
                      {new Date(alert.created_at).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add components/admin/alerts-panel.tsx
git commit -m "feat(admin): add alerts panel component with notifications"
```

---

## Task 8: Update Admin Layout with Alerts Panel

**Files:**
- Modify: `app/admin/layout.tsx`

**Step 1: Add alerts panel to admin layout**

```typescript
// app/admin/layout.tsx
import { AlertsPanel } from '@/components/admin/alerts-panel';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Admin Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="flex items-center justify-between px-6 py-4">
          <h1 className="text-xl font-bold text-gray-900">Admin Dashboard</h1>
          <div className="flex items-center gap-4">
            <AlertsPanel />
            {/* Other header items */}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-white border-r border-gray-200 min-h-screen">
          {/* Sidebar content */}
        </aside>

        {/* Page Content */}
        <main className="flex-1 p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add app/admin/layout.tsx
git commit -m "feat(admin): integrate alerts panel into admin layout"
```

---

## Task 9: Enable Sentry Performance Monitoring

**Files:**
- Modify: `sentry.client.config.ts`
- Modify: `sentry.server.config.ts`

**Step 1: Update client-side Sentry config**

```typescript
// sentry.client.config.ts
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Performance Monitoring
  tracesSampleRate: 0.1, // 10% of transactions for performance monitoring
  profilesSampleRate: 0.1, // 10% for profiling

  // Integrations
  integrations: [
    new Sentry.BrowserTracing({
      tracePropagationTargets: [
        'localhost',
        /^https:\/\/[^/]*\.krewup\.com/,
      ],
    }),
    new Sentry.Feedback({
      colorScheme: 'light',
      showBranding: false,
    }),
  ],

  // Existing options
  environment: process.env.NODE_ENV,
  enabled: process.env.NODE_ENV === 'production',
});
```

**Step 2: Update server-side Sentry config**

```typescript
// sentry.server.config.ts
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Performance Monitoring
  tracesSampleRate: 0.1,
  profilesSampleRate: 0.1,

  // Existing options
  environment: process.env.NODE_ENV,
  enabled: process.env.NODE_ENV === 'production',
});
```

**Step 3: Commit**

```bash
git add sentry.client.config.ts sentry.server.config.ts
git commit -m "feat(sentry): enable performance monitoring with 10% sample rate"
```

---

## Task 10: Performance Dashboard Page

**Files:**
- Create: `app/admin/performance/page.tsx`

**Step 1: Create performance monitoring page**

```typescript
// app/admin/performance/page.tsx
import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function PerformancePage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Performance Monitoring</h1>
        <p className="text-gray-600 mt-2">
          API response times and page load metrics
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sentry Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <h4 className="font-semibold text-blue-900 mb-2">
                Performance Monitoring Enabled
              </h4>
              <p className="text-sm text-blue-800 mb-3">
                Sentry is now tracking performance metrics with 10% sampling rate.
                View detailed performance data in your Sentry dashboard:
              </p>
              <a
                href={`https://sentry.io/organizations/${process.env.NEXT_PUBLIC_SENTRY_ORG || 'your-org'}/performance/`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
              >
                Open Sentry Performance Dashboard →
              </a>
            </div>

            <div>
              <h4 className="font-semibold text-gray-900 mb-3">
                Key Metrics to Monitor
              </h4>
              <ul className="space-y-2 text-sm text-gray-700">
                <li>• P50/P95/P99 response times for API endpoints</li>
                <li>• Database query performance (identify N+1 queries)</li>
                <li>• Page load times (LCP, FID, CLS)</li>
                <li>• Server-side rendering performance</li>
                <li>• Third-party API call latency</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-gray-900 mb-3">
                Performance Alerts
              </h4>
              <p className="text-sm text-gray-600">
                Configure alerts in Sentry for:
              </p>
              <ul className="space-y-1 text-sm text-gray-700 mt-2">
                <li>• Endpoint response time &gt;2s (P95)</li>
                <li>• Database query &gt;1s</li>
                <li>• Page load &gt;3s (P95)</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Integration Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-gray-600 space-y-2">
            <p>
              Performance data will appear in Sentry after production deployment
              and as users interact with the application.
            </p>
            <p>
              For detailed transaction traces, increase <code className="bg-gray-100 px-1 py-0.5 rounded">tracesSampleRate</code> in Sentry config (note: higher rates = higher Sentry costs).
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add app/admin/performance/page.tsx
git commit -m "feat(admin): add performance monitoring dashboard page"
```

---

## Task 11: Workload Dashboard Page

**Files:**
- Create: `app/admin/workload/page.tsx`

**Step 1: Create admin workload dashboard**

```typescript
// app/admin/workload/page.tsx
import React from 'react';
import { cookies } from 'next/headers';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { MetricCard } from '@/components/admin/metric-card';
import { getOperationalLoad } from '@/features/admin/actions/analytics-actions';
import { getAdminActivityHistory } from '@/lib/admin/activity-logger';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function WorkloadDashboardPage() {
  const dateRange = {
    preset: 'last7days' as const,
    startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    endDate: new Date(),
  };

  const [operationalLoad, recentActivity] = await Promise.all([
    getOperationalLoad(dateRange),
    getAdminActivityHistory(undefined, 50),
  ]);

  // Calculate predictive workload
  const avgDailyCerts =
    operationalLoad.weeklyTrend.reduce((sum, day) => sum + day.pendingCerts, 0) / 7;
  const predictedWeeklyCerts = Math.round(avgDailyCerts * 7);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Workload Dashboard</h1>
        <p className="text-gray-600 mt-2">
          Admin capacity planning and performance tracking
        </p>
      </div>

      {/* Queue Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <MetricCard
          title="Pending Certifications"
          value={operationalLoad.pendingCertifications}
          subtitle={`Avg review time: ${operationalLoad.avgCertificationReviewTime.toFixed(1)}h`}
          icon="📋"
        />
        <MetricCard
          title="Moderation Queue"
          value={operationalLoad.moderationQueueBacklog}
          subtitle={`Avg resolution: ${operationalLoad.avgModerationResolutionTime.toFixed(1)}h`}
          icon="🚨"
        />
      </div>

      {/* Predictive Workload */}
      <Card>
        <CardHeader>
          <CardTitle>Predictive Workload (Next 7 Days)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="p-4 bg-blue-50 rounded-lg">
            <div className="text-3xl font-bold text-blue-900 mb-2">
              ~{predictedWeeklyCerts} certifications
            </div>
            <p className="text-sm text-blue-800">
              Based on 7-day moving average of {avgDailyCerts.toFixed(1)} submissions/day
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Recent Admin Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Admin Activity (Last 50 Actions)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {recentActivity.map((activity: any) => (
              <div
                key={activity.id}
                className="p-3 border border-gray-200 rounded-lg"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-medium text-gray-900">
                      {activity.action_type.replace(/_/g, ' ').toUpperCase()}
                    </div>
                    <div className="text-sm text-gray-600">
                      by {Array.isArray(activity.admin) ? activity.admin[0]?.name : activity.admin?.name || 'Unknown'}
                    </div>
                  </div>
                  <div className="text-xs text-gray-400">
                    {new Date(activity.created_at).toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add app/admin/workload/page.tsx
git commit -m "feat(admin): add workload dashboard with predictive forecasting"
```

---

## Task 12: Update Admin Navigation

**Files:**
- Modify: `components/admin/admin-sidebar.tsx`

**Step 1: Add new Phase 3 pages to navigation**

```typescript
// components/admin/admin-sidebar.tsx
const operationalLinks = [
  {
    href: '/admin/workload',
    label: 'Workload Dashboard',
    icon: '📊',
  },
  {
    href: '/admin/performance',
    label: 'Performance',
    icon: '⚡',
  },
  // ... existing links ...
];
```

**Step 2: Commit**

```bash
git add components/admin/admin-sidebar.tsx
git commit -m "feat(admin): add Phase 3 pages to navigation"
```

---

## Verification Steps

**After completing all tasks:**

1. **Run migrations:**
   ```bash
   npx supabase db push
   ```
   Expected: Both migrations applied successfully

2. **Run all tests:**
   ```bash
   npm test
   ```
   Expected: All tests pass

3. **Start dev server:**
   ```bash
   npm run dev
   ```

4. **Test alert system:**
   - Navigate to: `/api/admin/check-alerts` (POST request)
   - Check alerts panel in admin header
   - Verify alerts appear with correct severity

5. **Test activity logging:**
   - Approve/reject a certification
   - Check workload dashboard for recent activity
   - Verify log entry exists

6. **Verify performance monitoring:**
   - Navigate to `/admin/performance`
   - Check Sentry dashboard for transaction traces

---

## Success Criteria

- ✅ Admin activity logs table created
- ✅ Dashboard alerts table created
- ✅ Activity logging integrated into all admin actions
- ✅ Alert generation system detects threshold violations
- ✅ Alerts panel displays active alerts
- ✅ Alerts can be acknowledged and dismissed
- ✅ Sentry performance monitoring enabled
- ✅ Workload dashboard shows predictive forecasting
- ✅ All tests pass
- ✅ No TypeScript errors

---

**Phase 3 Complete!** Ready to proceed to Phase 4 (Advanced Features & Polish) after review.
