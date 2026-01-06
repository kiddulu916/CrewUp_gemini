# Phase 4: Advanced Features & Polish - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add power-user features, advanced filtering, data exports, enhanced visualizations, and additional Sentry integrations

**Architecture:** Segment builder with save/load → Multi-dimensional filtering with URL persistence → CSV export utilities → Drill-down modals → Interactive charts → Enhanced Sentry features (feedback, releases, custom metrics)

**Tech Stack:** Next.js 14, TypeScript, Recharts, Sentry SDK advanced features, File download API

**Prerequisites:** Phases 1, 2, and 3 must be complete

---

## Task 1: CSV Export Utility

**Files:**
- Create: `lib/utils/csv-export.ts`
- Create: `__tests__/lib/utils/csv-export.test.ts`

**Step 1: Write the failing test**

```typescript
// __tests__/lib/utils/csv-export.test.ts
import { describe, it, expect } from 'vitest';
import { exportToCSV, generateCSVContent } from '@/lib/utils/csv-export';

describe('CSV Export', () => {
  it('generates CSV content from array of objects', () => {
    const data = [
      { name: 'John', age: 30, city: 'NYC' },
      { name: 'Jane', age: 25, city: 'LA' },
    ];

    const csv = generateCSVContent(data);

    expect(csv).toContain('name,age,city');
    expect(csv).toContain('John,30,NYC');
    expect(csv).toContain('Jane,25,LA');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- __tests__/lib/utils/csv-export.test.ts`
Expected: FAIL with "Cannot find module"

**Step 3: Implement CSV export utility**

```typescript
// lib/utils/csv-export.ts
/**
 * Generate CSV content from array of objects
 */
export function generateCSVContent<T extends Record<string, any>>(
  data: T[],
  columns?: string[]
): string {
  if (data.length === 0) {
    return '';
  }

  // Use provided columns or infer from first object
  const headers = columns || Object.keys(data[0]);

  // CSV header row
  const headerRow = headers.join(',');

  // CSV data rows
  const dataRows = data.map((row) => {
    return headers
      .map((header) => {
        const value = row[header];
        // Escape commas and quotes
        if (value === null || value === undefined) {
          return '';
        }
        const stringValue = String(value);
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      })
      .join(',');
  });

  return [headerRow, ...dataRows].join('\n');
}

/**
 * Download CSV file in browser
 */
export function downloadCSV(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Export data to CSV and download
 */
export function exportToCSV<T extends Record<string, any>>(
  data: T[],
  filename: string,
  columns?: string[]
): void {
  const csvContent = generateCSVContent(data, columns);
  downloadCSV(csvContent, filename);
}

/**
 * Add metadata header to CSV export
 */
export function addCSVMetadata(
  content: string,
  metadata: Record<string, string>
): string {
  const metadataLines = Object.entries(metadata).map(
    ([key, value]) => `# ${key}: ${value}`
  );
  return [...metadataLines, '', content].join('\n');
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- __tests__/lib/utils/csv-export.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add lib/utils/csv-export.ts __tests__/lib/utils/csv-export.test.ts
git commit -m "feat(utils): add CSV export utility with metadata support"
```

---

## Task 2: Export Button Component

**Files:**
- Create: `components/admin/export-button.tsx`

**Step 1: Create reusable export button**

```typescript
// components/admin/export-button.tsx
'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { exportToCSV, addCSVMetadata } from '@/lib/utils/csv-export';

type Props = {
  data: any[];
  filename: string;
  columns?: string[];
  metadata?: Record<string, string>;
  label?: string;
};

export function ExportButton({
  data,
  filename,
  columns,
  metadata,
  label = 'Export to CSV',
}: Props) {
  const handleExport = () => {
    if (data.length === 0) {
      alert('No data to export');
      return;
    }

    let csvContent = '';
    if (metadata) {
      const baseContent = exportToCSV(data, filename, columns);
      csvContent = addCSVMetadata(baseContent, metadata);
    }

    exportToCSV(data, filename, columns);
  };

  return (
    <Button
      variant="outline"
      onClick={handleExport}
      disabled={data.length === 0}
    >
      📥 {label}
    </Button>
  );
}
```

**Step 2: Commit**

```bash
git add components/admin/export-button.tsx
git commit -m "feat(admin): add export button component for CSV downloads"
```

---

## Task 3: Segment Builder Database Migration

**Files:**
- Create: `supabase/migrations/047_create_saved_segments.sql`

**Step 1: Create migration for saved segments**

```sql
-- supabase/migrations/047_create_saved_segments.sql

-- Create saved_segments table
CREATE TABLE IF NOT EXISTS saved_segments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  filters JSONB NOT NULL, -- Stores SegmentValue object
  is_public BOOLEAN DEFAULT FALSE, -- Share with team
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes
CREATE INDEX idx_saved_segments_created_by ON saved_segments(created_by);
CREATE INDEX idx_saved_segments_is_public ON saved_segments(is_public);

-- Enable RLS
ALTER TABLE saved_segments ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own segments and public segments
CREATE POLICY "Users can view own and public segments"
  ON saved_segments
  FOR SELECT
  TO authenticated
  USING (
    created_by = auth.uid() OR is_public = true
  );

-- Policy: Users can create their own segments
CREATE POLICY "Users can create own segments"
  ON saved_segments
  FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

-- Policy: Users can update their own segments
CREATE POLICY "Users can update own segments"
  ON saved_segments
  FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid());

-- Policy: Users can delete their own segments
CREATE POLICY "Users can delete own segments"
  ON saved_segments
  FOR DELETE
  TO authenticated
  USING (created_by = auth.uid());

-- Comment
COMMENT ON TABLE saved_segments IS 'Saved user segments for analytics filtering';
```

**Step 2: Apply migration**

Run: `npx supabase db push`
Expected: Migration applied successfully

**Step 3: Commit**

```bash
git add supabase/migrations/047_create_saved_segments.sql
git commit -m "feat(db): add saved segments table for segment builder"
```

---

## Task 4: Segment Builder Server Actions

**Files:**
- Create: `features/admin/actions/segment-actions.ts`

**Step 1: Create segment CRUD actions**

```typescript
// features/admin/actions/segment-actions.ts
'use server';

import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import type { SegmentValue } from '@/components/admin/segment-filter';

export type SavedSegment = {
  id: string;
  name: string;
  description: string | null;
  filters: SegmentValue;
  is_public: boolean;
  created_at: string;
  updated_at: string;
  created_by: string;
};

/**
 * Save a segment
 */
export async function saveSegment(
  name: string,
  filters: SegmentValue,
  description?: string,
  isPublic: boolean = false
): Promise<{ success: boolean; data?: SavedSegment; error?: string }> {
  try {
    const supabase = await createClient(await cookies());
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    const { data, error } = await supabase
      .from('saved_segments')
      .insert({
        created_by: user.id,
        name,
        description,
        filters,
        is_public: isPublic,
      })
      .select()
      .single();

    if (error) {
      console.error('[segment-actions] Save error:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error: any) {
    console.error('[segment-actions] Unexpected error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get all saved segments for current user
 */
export async function getSavedSegments(): Promise<SavedSegment[]> {
  const supabase = await createClient(await cookies());

  const { data, error } = await supabase
    .from('saved_segments')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[segment-actions] Fetch error:', error);
    return [];
  }

  return data || [];
}

/**
 * Update a saved segment
 */
export async function updateSegment(
  id: string,
  updates: {
    name?: string;
    description?: string;
    filters?: SegmentValue;
    is_public?: boolean;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient(await cookies());

    const { error } = await supabase
      .from('saved_segments')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      console.error('[segment-actions] Update error:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    console.error('[segment-actions] Unexpected error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Delete a saved segment
 */
export async function deleteSegment(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient(await cookies());

    const { error } = await supabase
      .from('saved_segments')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[segment-actions] Delete error:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    console.error('[segment-actions] Unexpected error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Preview segment - get count of matching users
 */
export async function previewSegment(filters: SegmentValue): Promise<{ count: number }> {
  const supabase = await createClient(await cookies());

  let query = supabase
    .from('users')
    .select('*', { count: 'exact', head: true });

  if (filters.role) {
    query = query.eq('role', filters.role);
  }

  if (filters.subscription) {
    query = query.eq('subscription_status', filters.subscription);
  }

  if (filters.location) {
    query = query.ilike('location', `%${filters.location}%`);
  }

  if (filters.employerType) {
    query = query.eq('employer_type', filters.employerType);
  }

  const { count } = await query;

  return { count: count || 0 };
}
```

**Step 2: Commit**

```bash
git add features/admin/actions/segment-actions.ts
git commit -m "feat(admin): add segment builder CRUD actions"
```

---

## Task 5: Segment Builder Component

**Files:**
- Create: `components/admin/segment-builder.tsx`

**Step 1: Create segment builder UI**

```typescript
// components/admin/segment-builder.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { SegmentFilter, type SegmentValue } from '@/components/admin/segment-filter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import {
  saveSegment,
  getSavedSegments,
  deleteSegment,
  previewSegment,
  type SavedSegment,
} from '@/features/admin/actions/segment-actions';
import { useToast } from '@/components/providers/toast-provider';

type Props = {
  onSegmentSelect?: (filters: SegmentValue) => void;
};

export function SegmentBuilder({ onSegmentSelect }: Props) {
  const toast = useToast();
  const [segments, setSegments] = useState<SavedSegment[]>([]);
  const [currentFilters, setCurrentFilters] = useState<SegmentValue>({});
  const [previewCount, setPreviewCount] = useState<number>(0);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [segmentName, setSegmentName] = useState('');
  const [segmentDescription, setSegmentDescription] = useState('');
  const [isPublic, setIsPublic] = useState(false);

  useEffect(() => {
    loadSegments();
  }, []);

  useEffect(() => {
    if (Object.keys(currentFilters).length > 0) {
      updatePreview();
    }
  }, [currentFilters]);

  const loadSegments = async () => {
    const data = await getSavedSegments();
    setSegments(data);
  };

  const updatePreview = async () => {
    const result = await previewSegment(currentFilters);
    setPreviewCount(result.count);
  };

  const handleSave = async () => {
    if (!segmentName.trim()) {
      toast.error('Please enter a segment name');
      return;
    }

    const result = await saveSegment(
      segmentName,
      currentFilters,
      segmentDescription,
      isPublic
    );

    if (result.success) {
      toast.success('Segment saved successfully');
      setShowSaveDialog(false);
      setSegmentName('');
      setSegmentDescription('');
      setIsPublic(false);
      loadSegments();
    } else {
      toast.error(result.error || 'Failed to save segment');
    }
  };

  const handleLoad = (segment: SavedSegment) => {
    setCurrentFilters(segment.filters);
    if (onSegmentSelect) {
      onSegmentSelect(segment.filters);
    }
    toast.success(`Loaded segment: ${segment.name}`);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this segment?')) {
      return;
    }

    const result = await deleteSegment(id);

    if (result.success) {
      toast.success('Segment deleted');
      loadSegments();
    } else {
      toast.error(result.error || 'Failed to delete segment');
    }
  };

  return (
    <div className="space-y-6">
      {/* Filter Builder */}
      <Card>
        <CardHeader>
          <CardTitle>Build Segment</CardTitle>
        </CardHeader>
        <CardContent>
          <SegmentFilter value={currentFilters} onChange={setCurrentFilters} />

          <div className="mt-4 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Preview: <span className="font-semibold">{previewCount} users</span> match this segment
            </div>
            <Button
              variant="primary"
              onClick={() => setShowSaveDialog(true)}
              disabled={Object.keys(currentFilters).length === 0}
            >
              💾 Save Segment
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Save Dialog */}
      {showSaveDialog && (
        <Card>
          <CardHeader>
            <CardTitle>Save Segment</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Segment Name *
                </label>
                <Input
                  value={segmentName}
                  onChange={(e) => setSegmentName(e.target.value)}
                  placeholder="e.g., Pro CA Contractors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <Input
                  value={segmentDescription}
                  onChange={(e) => setSegmentDescription(e.target.value)}
                  placeholder="Optional description"
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is-public"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="is-public" className="ml-2 text-sm text-gray-700">
                  Share with team (make public)
                </label>
              </div>

              <div className="flex gap-2">
                <Button variant="primary" onClick={handleSave}>
                  Save
                </Button>
                <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Saved Segments List */}
      <Card>
        <CardHeader>
          <CardTitle>Saved Segments ({segments.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {segments.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No saved segments yet. Create one above!
            </div>
          ) : (
            <div className="space-y-2">
              {segments.map((segment) => (
                <div
                  key={segment.id}
                  className="p-3 border border-gray-200 rounded-lg hover:border-blue-500 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900">
                        {segment.name}
                        {segment.is_public && (
                          <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                            Public
                          </span>
                        )}
                      </div>
                      {segment.description && (
                        <div className="text-sm text-gray-600 mt-1">
                          {segment.description}
                        </div>
                      )}
                      <div className="text-xs text-gray-400 mt-1">
                        Created {new Date(segment.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleLoad(segment)}
                      >
                        Load
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(segment.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add components/admin/segment-builder.tsx
git commit -m "feat(admin): add segment builder component with save/load/delete"
```

---

## Task 6: Drill-Down Modal Component

**Files:**
- Create: `components/admin/drill-down-modal.tsx`

**Step 1: Create drill-down modal for metrics**

```typescript
// components/admin/drill-down-modal.tsx
'use client';

import React from 'react';
import { ExportButton } from '@/components/admin/export-button';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  data: any[];
  columns: { key: string; label: string }[];
};

export function DrillDownModal({ isOpen, onClose, title, data, columns }: Props) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">{title}</h2>
          <div className="flex items-center gap-4">
            <ExportButton
              data={data}
              filename={`${title.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.csv`}
              columns={columns.map((c) => c.key)}
            />
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto p-6">
          {data.length === 0 ? (
            <div className="text-center py-12 text-gray-500">No data available</div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  {columns.map((col) => (
                    <th
                      key={col.key}
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase"
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.map((row, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    {columns.map((col) => (
                      <td key={col.key} className="px-4 py-3 text-sm text-gray-700">
                        {row[col.key] || '-'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200">
          <div className="text-sm text-gray-600">
            Showing {data.length} record{data.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add components/admin/drill-down-modal.tsx
git commit -m "feat(admin): add drill-down modal for metric exploration"
```

---

## Task 7: Enable Sentry User Feedback

**Files:**
- Modify: `sentry.client.config.ts`

**Step 1: Add Feedback integration to Sentry**

```typescript
// sentry.client.config.ts
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  tracesSampleRate: 0.1,
  profilesSampleRate: 0.1,

  integrations: [
    new Sentry.BrowserTracing({
      tracePropagationTargets: [
        'localhost',
        /^https:\/\/[^/]*\.krewup\.com/,
      ],
    }),
    // Add User Feedback widget
    new Sentry.Feedback({
      colorScheme: 'light',
      showBranding: false,
      buttonLabel: 'Report Issue',
      submitButtonLabel: 'Send Report',
      formTitle: 'Report an Issue',
      messageLabel: 'What happened?',
      messagePlaceholder: 'Please describe what went wrong...',
      nameLabel: 'Name',
      namePlaceholder: 'Your name',
      emailLabel: 'Email',
      emailPlaceholder: 'your.email@example.com',
      successMessageText: 'Thank you for your report!',
    }),
  ],

  environment: process.env.NODE_ENV,
  enabled: process.env.NODE_ENV === 'production',
});
```

**Step 2: Commit**

```bash
git add sentry.client.config.ts
git commit -m "feat(sentry): enable user feedback widget with custom labels"
```

---

## Task 8: Enhanced Breadcrumbs in Key Flows

**Files:**
- Modify: `features/jobs/actions/job-actions.ts`
- Modify: `features/applications/actions/application-actions.ts`

**Step 1: Add breadcrumbs to job posting flow**

```typescript
// features/jobs/actions/job-actions.ts
import * as Sentry from '@sentry/nextjs';

export async function createJob(formData: FormData) {
  try {
    Sentry.addBreadcrumb({
      message: 'User started job creation',
      level: 'info',
      category: 'user-action',
    });

    // ... existing job creation code ...

    Sentry.addBreadcrumb({
      message: 'Job form validated',
      level: 'info',
      category: 'validation',
      data: { jobType: formData.get('type') },
    });

    // ... create job in database ...

    Sentry.addBreadcrumb({
      message: 'Job created successfully',
      level: 'info',
      category: 'database',
      data: { jobId: newJob.id },
    });

    return { success: true, data: newJob };
  } catch (error) {
    Sentry.captureException(error, {
      tags: {
        feature: 'job-posting',
        action: 'create-job',
      },
      contexts: {
        job: {
          type: formData.get('type'),
          location: formData.get('location'),
        },
      },
    });
    throw error;
  }
}
```

**Step 2: Add breadcrumbs to application flow**

```typescript
// features/applications/actions/application-actions.ts
import * as Sentry from '@sentry/nextjs';

export async function submitApplication(applicationData: any) {
  try {
    Sentry.addBreadcrumb({
      message: 'User started application submission',
      level: 'info',
      category: 'user-action',
    });

    // ... validation ...

    Sentry.addBreadcrumb({
      message: 'Application validated',
      level: 'info',
      category: 'validation',
    });

    // ... submit application ...

    Sentry.addBreadcrumb({
      message: 'Application submitted successfully',
      level: 'info',
      category: 'database',
      data: { applicationId: newApp.id, jobId: applicationData.jobId },
    });

    return { success: true, data: newApp };
  } catch (error) {
    Sentry.captureException(error, {
      tags: {
        feature: 'job-application',
        action: 'submit-application',
      },
    });
    throw error;
  }
}
```

**Step 3: Commit**

```bash
git add features/jobs/actions/job-actions.ts features/applications/actions/application-actions.ts
git commit -m "feat(sentry): add enhanced breadcrumbs to job and application flows"
```

---

## Task 9: Comparison Mode Component

**Files:**
- Create: `components/admin/comparison-view.tsx`

**Step 1: Create side-by-side comparison component**

```typescript
// components/admin/comparison-view.tsx
'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { TrendIndicator } from '@/components/admin/trend-indicator';

type MetricComparison = {
  label: string;
  valueA: number;
  valueB: number;
  format?: 'number' | 'percentage' | 'currency';
};

type Props = {
  titleA: string;
  titleB: string;
  metrics: MetricComparison[];
};

export function ComparisonView({ titleA, titleB, metrics }: Props) {
  const formatValue = (value: number, format?: string): string => {
    switch (format) {
      case 'percentage':
        return `${value.toFixed(1)}%`;
      case 'currency':
        return `$${value.toFixed(2)}`;
      default:
        return value.toString();
    }
  };

  const calculateDiff = (valueA: number, valueB: number): number => {
    if (valueB === 0) return valueA > 0 ? 100 : 0;
    return ((valueA - valueB) / valueB) * 100;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Comparison: {titleA} vs {titleB}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Metric
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  {titleA}
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  {titleB}
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Difference
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {metrics.map((metric) => {
                const diff = calculateDiff(metric.valueA, metric.valueB);
                const isPositive = diff > 0;

                return (
                  <tr key={metric.label}>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {metric.label}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 text-right">
                      {formatValue(metric.valueA, metric.format)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 text-right">
                      {formatValue(metric.valueB, metric.format)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right">
                      <TrendIndicator value={diff} isPositive={isPositive} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
```

**Step 2: Commit**

```bash
git add components/admin/comparison-view.tsx
git commit -m "feat(admin): add comparison view component for side-by-side metrics"
```

---

## Task 10: Interactive Charts Enhancement

**Files:**
- Modify: `components/admin/user-growth-chart.tsx`
- Modify: `components/admin/error-rate-chart.tsx`

**Step 1: Add interactivity to user growth chart**

```typescript
// components/admin/user-growth-chart.tsx
'use client';

import React, { useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

type Props = {
  data: { date: string; users: number }[];
  onPointClick?: (data: any) => void;
};

export function UserGrowthChart({ data, onPointClick }: Props) {
  const [focusedPoint, setFocusedPoint] = useState<any>(null);

  const handlePointClick = (data: any) => {
    setFocusedPoint(data);
    if (onPointClick) {
      onPointClick(data);
    }
  };

  return (
    <div className="h-[400px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          onClick={(e) => e.activePayload && handlePointClick(e.activePayload[0].payload)}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 12 }}
            tickFormatter={(value) =>
              new Date(value).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              })
            }
          />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip
            formatter={(value: any) => [`${value} users`, 'Total Users']}
            labelFormatter={(label) =>
              new Date(label).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })
            }
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="users"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={{ r: 4, cursor: 'pointer' }}
            activeDot={{ r: 6 }}
            name="Total Users"
          />
        </LineChart>
      </ResponsiveContainer>

      {focusedPoint && (
        <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h4 className="font-semibold text-blue-900">
            {new Date(focusedPoint.date).toLocaleDateString()}
          </h4>
          <p className="text-sm text-blue-800">
            Total Users: {focusedPoint.users}
          </p>
        </div>
      )}
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add components/admin/user-growth-chart.tsx components/admin/error-rate-chart.tsx
git commit -m "feat(admin): add click interactivity to analytics charts"
```

---

## Task 11: Segment Builder Page

**Files:**
- Create: `app/admin/segments/page.tsx`

**Step 1: Create segments management page**

```typescript
// app/admin/segments/page.tsx
import React from 'react';
import { SegmentBuilder } from '@/components/admin/segment-builder';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function SegmentsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Segment Builder</h1>
        <p className="text-gray-600 mt-2">
          Create and manage custom user segments for analytics
        </p>
      </div>

      <SegmentBuilder />
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add app/admin/segments/page.tsx
git commit -m "feat(admin): add segment builder page"
```

---

## Task 12: Update Admin Navigation

**Files:**
- Modify: `components/admin/admin-sidebar.tsx`

**Step 1: Add Phase 4 pages to navigation**

```typescript
// components/admin/admin-sidebar.tsx
const advancedLinks = [
  {
    href: '/admin/segments',
    label: 'Segment Builder',
    icon: '🎯',
  },
  // ... existing links ...
];
```

**Step 2: Commit**

```bash
git add components/admin/admin-sidebar.tsx
git commit -m "feat(admin): add Phase 4 pages to navigation"
```

---

## Task 13: Add Export Buttons to Existing Pages

**Files:**
- Modify: `app/admin/analytics/overview/page.tsx`
- Modify: `app/admin/analytics/retention/page.tsx`

**Step 1: Add export functionality to analytics pages**

```typescript
// app/admin/analytics/overview/page.tsx
import { ExportButton } from '@/components/admin/export-button';

// In the page component, add export buttons near metric sections:

<div className="flex items-center justify-between mb-4">
  <h2 className="text-xl font-semibold text-gray-900">User Activity</h2>
  <ExportButton
    data={[
      { metric: 'DAU', value: activeUsers.dau },
      { metric: 'WAU', value: activeUsers.wau },
      { metric: 'MAU', value: activeUsers.mau },
    ]}
    filename="user-activity-metrics.csv"
    metadata={{
      'Export Date': new Date().toISOString(),
      'Date Range': 'Last 30 days',
    }}
  />
</div>
```

**Step 2: Commit**

```bash
git add app/admin/analytics/overview/page.tsx app/admin/analytics/retention/page.tsx
git commit -m "feat(admin): add CSV export buttons to analytics pages"
```

---

## Verification Steps

**After completing all tasks:**

1. **Run migrations:**
   ```bash
   npx supabase db push
   ```

2. **Run all tests:**
   ```bash
   npm test
   ```
   Expected: All tests pass

3. **Start dev server:**
   ```bash
   npm run dev
   ```

4. **Test segment builder:**
   - Navigate to `/admin/segments`
   - Create a segment with filters
   - Save it
   - Load a saved segment
   - Delete a segment

5. **Test exports:**
   - Go to analytics pages
   - Click "Export to CSV" buttons
   - Verify CSV downloads with correct data

6. **Test Sentry enhancements:**
   - Trigger an error in job posting
   - Check Sentry for breadcrumbs
   - Use feedback widget

7. **Test comparison view:**
   - Check if metrics show side-by-side comparisons

---

## Success Criteria

- ✅ CSV export utility works correctly
- ✅ Saved segments table created
- ✅ Segment builder saves/loads/deletes segments
- ✅ Segment preview shows matching user count
- ✅ Drill-down modals display detailed data
- ✅ Export buttons added to all analytics pages
- ✅ Comparison view component displays side-by-side metrics
- ✅ Sentry user feedback widget enabled
- ✅ Enhanced breadcrumbs in job/application flows
- ✅ Interactive charts respond to clicks
- ✅ All new pages accessible from navigation
- ✅ All tests pass
- ✅ No TypeScript errors

---

**Phase 4 Complete!** All four phases of the admin dashboard enhancement are now ready for implementation.

## Final Notes

**Complete Implementation Order:**
1. Phase 1: Foundation & Quick Wins (2 weeks)
2. Phase 2: Deep Insights & User Behavior (2 weeks)
3. Phase 3: Operational Efficiency & Alerts (2 weeks)
4. Phase 4: Advanced Features & Polish (2 weeks)

**Total Timeline:** 8 weeks for full implementation

**Next Steps:**
1. Review all phase plans
2. Begin Phase 1 implementation
3. Test thoroughly after each phase
4. Gather user feedback between phases
5. Adjust subsequent phases based on learnings
