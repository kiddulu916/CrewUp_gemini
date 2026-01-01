import { describe, it, expect, vi } from 'vitest';
import {
  buildDateRangeFilter,
  getComparisonDates,
  applySegmentFilters,
  calculatePercentageChange,
  formatDateRange,
} from '@/lib/analytics/filters';
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

    it('validates that startDate is not after endDate', () => {
      const dateRange: DateRangeValue = {
        preset: 'custom',
        startDate: new Date('2025-01-08'),
        endDate: new Date('2025-01-01'),
      };

      expect(() => buildDateRangeFilter(dateRange)).toThrow(
        'Start date cannot be after end date'
      );
    });

    it('accepts equal start and end dates', () => {
      const dateRange: DateRangeValue = {
        preset: 'custom',
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-01-01'),
      };

      const filter = buildDateRangeFilter(dateRange);
      expect(filter.gte).toBe(filter.lte);
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

  describe('applySegmentFilters', () => {
    // Mock PostgrestFilterBuilder
    const createMockQuery = () => {
      const mockQuery = {
        eq: vi.fn().mockReturnThis(),
        ilike: vi.fn().mockReturnThis(),
      };
      return mockQuery as any;
    };

    it('applies role filter when role is provided', () => {
      const mockQuery = createMockQuery();
      const segment: SegmentValue = { role: 'worker' };

      applySegmentFilters(mockQuery, segment);

      expect(mockQuery.eq).toHaveBeenCalledWith('role', 'worker');
    });

    it('applies subscription filter when subscription is provided', () => {
      const mockQuery = createMockQuery();
      const segment: SegmentValue = { subscription: 'pro' };

      applySegmentFilters(mockQuery, segment);

      expect(mockQuery.eq).toHaveBeenCalledWith('subscription_status', 'pro');
    });

    it('applies location filter when location is provided', () => {
      const mockQuery = createMockQuery();
      const segment: SegmentValue = { location: 'New York' };

      applySegmentFilters(mockQuery, segment);

      expect(mockQuery.ilike).toHaveBeenCalledWith('location', '%New York%');
    });

    it('applies employer type filter when employerType is provided', () => {
      const mockQuery = createMockQuery();
      const segment: SegmentValue = { employerType: 'general_contractor' };

      applySegmentFilters(mockQuery, segment);

      expect(mockQuery.eq).toHaveBeenCalledWith('employer_type', 'general_contractor');
    });

    it('applies multiple filters when provided', () => {
      const mockQuery = createMockQuery();
      const segment: SegmentValue = {
        role: 'employer',
        subscription: 'free',
        location: 'California',
      };

      applySegmentFilters(mockQuery, segment);

      expect(mockQuery.eq).toHaveBeenCalledWith('role', 'employer');
      expect(mockQuery.eq).toHaveBeenCalledWith('subscription_status', 'free');
      expect(mockQuery.ilike).toHaveBeenCalledWith('location', '%California%');
    });

    it('returns query unchanged when no filters are provided', () => {
      const mockQuery = createMockQuery();
      const segment: SegmentValue = {};

      const result = applySegmentFilters(mockQuery, segment);

      expect(mockQuery.eq).not.toHaveBeenCalled();
      expect(mockQuery.ilike).not.toHaveBeenCalled();
      expect(result).toBe(mockQuery);
    });

    it('chains all filters correctly', () => {
      const mockQuery = createMockQuery();
      const segment: SegmentValue = {
        role: 'worker',
        subscription: 'pro',
        location: 'Texas',
        employerType: 'subcontractor',
      };

      applySegmentFilters(mockQuery, segment);

      expect(mockQuery.eq).toHaveBeenCalledTimes(3);
      expect(mockQuery.ilike).toHaveBeenCalledTimes(1);
    });
  });

  describe('calculatePercentageChange', () => {
    it('calculates positive percentage change correctly', () => {
      const result = calculatePercentageChange(150, 100);
      expect(result).toBe(50);
    });

    it('calculates negative percentage change correctly', () => {
      const result = calculatePercentageChange(75, 100);
      expect(result).toBe(-25);
    });

    it('returns 0 when both values are equal', () => {
      const result = calculatePercentageChange(100, 100);
      expect(result).toBe(0);
    });

    it('returns 100 when previous is 0 and current is positive', () => {
      const result = calculatePercentageChange(50, 0);
      expect(result).toBe(100);
    });

    it('returns 0 when both previous and current are 0', () => {
      const result = calculatePercentageChange(0, 0);
      expect(result).toBe(0);
    });

    it('returns 0 when previous is 0 and current is negative', () => {
      const result = calculatePercentageChange(-10, 0);
      expect(result).toBe(0);
    });

    it('handles decimal values correctly', () => {
      const result = calculatePercentageChange(15.5, 10);
      expect(result).toBeCloseTo(55, 2);
    });

    it('handles large percentage increases', () => {
      const result = calculatePercentageChange(1000, 10);
      expect(result).toBe(9900);
    });

    it('handles near-zero percentage changes', () => {
      const result = calculatePercentageChange(100.01, 100);
      expect(result).toBeCloseTo(0.01, 2);
    });
  });

  describe('formatDateRange', () => {
    it('formats last7days preset correctly', () => {
      const dateRange: DateRangeValue = {
        preset: 'last7days',
      };

      const result = formatDateRange(dateRange);
      expect(result).toBe('Last 7 days');
    });

    it('formats last30days preset correctly', () => {
      const dateRange: DateRangeValue = {
        preset: 'last30days',
      };

      const result = formatDateRange(dateRange);
      expect(result).toBe('Last 30 days');
    });

    it('formats last90days preset correctly', () => {
      const dateRange: DateRangeValue = {
        preset: 'last90days',
      };

      const result = formatDateRange(dateRange);
      expect(result).toBe('Last 90 days');
    });

    it('formats custom range with dates correctly', () => {
      const dateRange: DateRangeValue = {
        preset: 'custom',
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-01-31'),
      };

      const result = formatDateRange(dateRange);
      expect(result).toContain('2025');
      expect(result).toContain('-');
    });

    it('returns "Custom range" when custom preset has no dates', () => {
      const dateRange: DateRangeValue = {
        preset: 'custom',
      };

      const result = formatDateRange(dateRange);
      expect(result).toBe('Custom range');
    });

    it('returns "Custom range" when custom preset has only startDate', () => {
      const dateRange: DateRangeValue = {
        preset: 'custom',
        startDate: new Date('2025-01-01'),
      };

      const result = formatDateRange(dateRange);
      expect(result).toBe('Custom range');
    });

    it('returns "Custom range" when custom preset has only endDate', () => {
      const dateRange: DateRangeValue = {
        preset: 'custom',
        endDate: new Date('2025-01-31'),
      };

      const result = formatDateRange(dateRange);
      expect(result).toBe('Custom range');
    });
  });
});
