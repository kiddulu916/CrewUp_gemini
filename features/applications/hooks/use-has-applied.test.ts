import { describe, it, expect, vi, beforeEach } from 'vitest';
import { waitFor } from '@testing-library/react';
import { renderHookWithQuery, mockActionSuccess, mockActionError } from '@/tests/hooks-setup';
import { useHasApplied } from './use-has-applied';

// Mock the server action
vi.mock('../actions/application-actions', () => ({
  hasApplied: vi.fn(),
}));

import { hasApplied } from '../actions/application-actions';

const mockHasApplied = hasApplied as ReturnType<typeof vi.fn>;

describe('useHasApplied', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return loading state initially', () => {
    mockHasApplied.mockReturnValue(new Promise(() => {})); // Never resolves

    const { result } = renderHookWithQuery(() => useHasApplied('job-123'));

    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeUndefined();
  });

  it('should return true when user has applied', async () => {
    mockHasApplied.mockResolvedValue(mockActionSuccess({ hasApplied: true }));

    const { result } = renderHookWithQuery(() => useHasApplied('job-123'));

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual({ success: true, data: { hasApplied: true } });
    expect(mockHasApplied).toHaveBeenCalledWith('job-123');
  });

  it('should return false when user has not applied', async () => {
    mockHasApplied.mockResolvedValue(mockActionSuccess({ hasApplied: false }));

    const { result } = renderHookWithQuery(() => useHasApplied('job-456'));

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual({ success: true, data: { hasApplied: false } });
  });

  it('should handle errors gracefully', async () => {
    mockHasApplied.mockResolvedValue(mockActionError('Not authenticated'));

    const { result } = renderHookWithQuery(() => useHasApplied('job-789'));

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual({ success: false, error: 'Not authenticated' });
  });

  it('should handle network errors', async () => {
    mockHasApplied.mockRejectedValue(new Error('Network error'));

    const { result } = renderHookWithQuery(() => useHasApplied('job-123'));

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });

  it('should use correct query key', async () => {
    mockHasApplied.mockResolvedValue(mockActionSuccess({ hasApplied: false }));

    const { result } = renderHookWithQuery(() => useHasApplied('job-specific-id'));

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockHasApplied).toHaveBeenCalledWith('job-specific-id');
  });

  it('should call hasApplied with different job IDs', async () => {
    mockHasApplied.mockResolvedValue(mockActionSuccess({ hasApplied: true }));

    // First render with job-1
    const { result: result1, unmount } = renderHookWithQuery(() => useHasApplied('job-1'));

    await waitFor(() => {
      expect(result1.current.isSuccess).toBe(true);
    });

    expect(mockHasApplied).toHaveBeenCalledWith('job-1');

    unmount();
    vi.clearAllMocks();

    // Second render with job-2
    const { result: result2 } = renderHookWithQuery(() => useHasApplied('job-2'));

    await waitFor(() => {
      expect(result2.current.isSuccess).toBe(true);
    });

    expect(mockHasApplied).toHaveBeenCalledWith('job-2');
  });
});
