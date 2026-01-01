import { describe, it, expect } from 'vitest';
import { buildDateRangeFilter, getComparisonDates } from '@/lib/analytics/filters';
import type { DateRangeValue } from '@/components/admin/date-range-picker';
import type { SegmentValue } from '@/components/admin/segment-filter';

describe('Analytics Filters', () => {
  describe('buildDateRangeFilter', () => {
    it('returns correct SQL filter for last 7 days', () => {
      const dateRange: DateRangeValue = {
        preset: 'last7days',
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-01-08'),
      };

      const filter = buildDateRangeFilter(dateRange, 'created_at');
      expect(filter).toHaveProperty('gte');
      expect(filter).toHaveProperty('lte');
      expect(typeof filter.gte).toBe('string');
      expect(typeof filter.lte).toBe('string');
    });
  });

  describe('getComparisonDates', () => {
    it('returns previous period for comparison', () => {
      const dateRange: DateRangeValue = {
        preset: 'last7days',
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-01-08'),
      };

      const { startDate, endDate } = getComparisonDates(dateRange);
      expect(startDate.getTime()).toBeLessThan(dateRange.startDate!.getTime());
    });
  });
});
