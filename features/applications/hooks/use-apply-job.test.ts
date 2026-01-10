import { describe, it, expect, vi, beforeEach } from 'vitest';
import { waitFor } from '@testing-library/react';
import { renderHookWithQuery, mockActionSuccess, mockActionError } from '@/tests/hooks-setup';
import { useApplyJob } from './use-apply-job';

// Mock the server action
vi.mock('../actions/application-actions', () => ({
  createApplication: vi.fn(),
}));

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: vi.fn(),
  }),
}));

import { createApplication } from '../actions/application-actions';

const mockCreateApplication = createApplication as ReturnType<typeof vi.fn>;

describe('useApplyJob', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return mutation functions', () => {
    const { result } = renderHookWithQuery(() => useApplyJob());

    expect(result.current.mutate).toBeDefined();
    expect(result.current.mutateAsync).toBeDefined();
    expect(result.current.isPending).toBe(false);
  });

  it('should successfully apply to a job', async () => {
    mockCreateApplication.mockResolvedValue(mockActionSuccess({ applicationId: 'app-123' }));

    const { result } = renderHookWithQuery(() => useApplyJob());

    result.current.mutate({ jobId: 'job-123', coverLetter: 'Test cover letter' });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockCreateApplication).toHaveBeenCalledWith({
      jobId: 'job-123',
      coverLetter: 'Test cover letter',
    });
  });

  it('should apply without cover letter', async () => {
    mockCreateApplication.mockResolvedValue(mockActionSuccess({ applicationId: 'app-456' }));

    const { result } = renderHookWithQuery(() => useApplyJob());

    result.current.mutate({ jobId: 'job-456' });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockCreateApplication).toHaveBeenCalledWith({ jobId: 'job-456' });
  });

  it('should handle application errors', async () => {
    mockCreateApplication.mockResolvedValue(mockActionError('Already applied to this job'));

    const { result } = renderHookWithQuery(() => useApplyJob());

    result.current.mutate({ jobId: 'job-123' });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // The mutation itself succeeds, but the result indicates failure
    expect(result.current.data).toEqual({
      success: false,
      error: 'Already applied to this job',
    });
  });

  it('should handle network errors', async () => {
    mockCreateApplication.mockRejectedValue(new Error('Network error'));

    const { result } = renderHookWithQuery(() => useApplyJob());

    result.current.mutate({ jobId: 'job-123' });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBeInstanceOf(Error);
  });

  it('should set pending state while applying', async () => {
    let resolvePromise: (value: any) => void;
    const promise = new Promise((resolve) => {
      resolvePromise = resolve;
    });
    mockCreateApplication.mockReturnValue(promise);

    const { result } = renderHookWithQuery(() => useApplyJob());

    result.current.mutate({ jobId: 'job-123' });

    await waitFor(() => {
      expect(result.current.isPending).toBe(true);
    });

    resolvePromise!(mockActionSuccess());

    await waitFor(() => {
      expect(result.current.isPending).toBe(false);
    });
  });

  it('should use mutateAsync for promise-based handling', async () => {
    mockCreateApplication.mockResolvedValue(mockActionSuccess({ applicationId: 'app-789' }));

    const { result } = renderHookWithQuery(() => useApplyJob());

    const response = await result.current.mutateAsync({ jobId: 'job-789' });

    expect(response.success).toBe(true);
    expect(response.data).toEqual({ applicationId: 'app-789' });
  });
});
