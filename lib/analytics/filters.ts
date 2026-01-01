import type { DateRangeValue } from '@/components/admin/date-range-picker';
import type { SegmentValue } from '@/components/admin/segment-filter';
import type { PostgrestFilterBuilder } from '@supabase/postgrest-js';

/**
 * Build date range filter for SQL queries
 */
export function buildDateRangeFilter(
  dateRange: DateRangeValue,
  column: string = 'created_at'
): { gte: string; lte: string } {
  const startDate = dateRange.startDate || new Date();
  const endDate = dateRange.endDate || new Date();

  return {
    gte: startDate.toISOString(),
    lte: endDate.toISOString(),
  };
}

/**
 * Get comparison period dates (previous period of same length)
 */
export function getComparisonDates(dateRange: DateRangeValue): {
  startDate: Date;
  endDate: Date;
} {
  const start = dateRange.startDate || new Date();
  const end = dateRange.endDate || new Date();
  const duration = end.getTime() - start.getTime();

  const comparisonEnd = new Date(start.getTime() - 1);
  const comparisonStart = new Date(comparisonEnd.getTime() - duration);

  return {
    startDate: comparisonStart,
    endDate: comparisonEnd,
  };
}

/**
 * Apply segment filters to Supabase query
 */
export function applySegmentFilters<T>(
  query: PostgrestFilterBuilder<any, any, T>,
  segment: SegmentValue
): PostgrestFilterBuilder<any, any, T> {
  let filteredQuery = query;

  if (segment.role) {
    filteredQuery = filteredQuery.eq('role', segment.role);
  }

  if (segment.subscription) {
    filteredQuery = filteredQuery.eq('subscription_status', segment.subscription);
  }

  if (segment.location) {
    filteredQuery = filteredQuery.ilike('location', `%${segment.location}%`);
  }

  if (segment.employerType) {
    filteredQuery = filteredQuery.eq('employer_type', segment.employerType);
  }

  return filteredQuery;
}

/**
 * Calculate percentage change between two values
 */
export function calculatePercentageChange(
  current: number,
  previous: number
): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

/**
 * Format date range for display
 */
export function formatDateRange(dateRange: DateRangeValue): string {
  const { startDate, endDate, preset } = dateRange;

  if (preset !== 'custom') {
    const labels = {
      last7days: 'Last 7 days',
      last30days: 'Last 30 days',
      last90days: 'Last 90 days',
    };
    return labels[preset] || 'Custom range';
  }

  if (startDate && endDate) {
    return `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`;
  }

  return 'Custom range';
}
