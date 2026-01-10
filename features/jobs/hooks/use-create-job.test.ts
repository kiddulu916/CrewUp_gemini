import { describe, it, expect, vi, beforeEach } from 'vitest';
import { waitFor } from '@testing-library/react';
import { renderHookWithQuery, mockActionSuccess, mockActionError } from '@/tests/hooks-setup';
import { useCreateJob } from './use-create-job';

// Mock the server action
vi.mock('../actions/job-actions', () => ({
  createJob: vi.fn(),
}));

import { createJob } from '../actions/job-actions';

const mockCreateJob = createJob as ReturnType<typeof vi.fn>;

describe('useCreateJob', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const validJobData = {
    title: 'Senior Electrician',
    description: 'Looking for an experienced electrician',
    location: 'Austin, TX',
    coords: { lat: 30.2672, lng: -97.7431 },
    trades: ['Electricians'],
    sub_trades: ['Inside Wireman (Commercial)'],
    job_type: 'full-time' as const,
    pay_rate: '$35-45/hr',
  };

  it('should return mutation functions', () => {
    const { result } = renderHookWithQuery(() => useCreateJob());

    expect(result.current.mutate).toBeDefined();
    expect(result.current.mutateAsync).toBeDefined();
    expect(result.current.isPending).toBe(false);
  });

  it('should successfully create a job', async () => {
    mockCreateJob.mockResolvedValue(mockActionSuccess({ jobId: 'new-job-123' }));

    const { result } = renderHookWithQuery(() => useCreateJob());

    result.current.mutate(validJobData);

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockCreateJob).toHaveBeenCalledWith(validJobData);
  });

  it('should handle job creation errors', async () => {
    mockCreateJob.mockResolvedValue(mockActionError('Not authorized to create jobs'));

    const { result } = renderHookWithQuery(() => useCreateJob());

    result.current.mutate(validJobData);

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error?.message).toBe('Not authorized to create jobs');
  });

  it('should handle network errors', async () => {
    mockCreateJob.mockRejectedValue(new Error('Network error'));

    const { result } = renderHookWithQuery(() => useCreateJob());

    result.current.mutate(validJobData);

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBeInstanceOf(Error);
  });

  it('should set pending state while creating', async () => {
    let resolvePromise: (value: any) => void;
    const promise = new Promise((resolve) => {
      resolvePromise = resolve;
    });
    mockCreateJob.mockReturnValue(promise);

    const { result } = renderHookWithQuery(() => useCreateJob());

    result.current.mutate(validJobData);

    await waitFor(() => {
      expect(result.current.isPending).toBe(true);
    });

    resolvePromise!(mockActionSuccess({ jobId: 'job-pending' }));

    await waitFor(() => {
      expect(result.current.isPending).toBe(false);
    });
  });

  it('should use mutateAsync for promise-based handling', async () => {
    mockCreateJob.mockResolvedValue(mockActionSuccess({ jobId: 'job-async-123' }));

    const { result } = renderHookWithQuery(() => useCreateJob());

    const response = await result.current.mutateAsync(validJobData);

    expect(response.success).toBe(true);
    expect(response.data).toEqual({ jobId: 'job-async-123' });
  });

  it('should throw error from mutateAsync on failure', async () => {
    mockCreateJob.mockResolvedValue(mockActionError('Invalid job data'));

    const { result } = renderHookWithQuery(() => useCreateJob());

    await expect(result.current.mutateAsync(validJobData)).rejects.toThrow('Invalid job data');
  });

  it('should handle minimal job data', async () => {
    const minimalJobData = {
      title: 'General Helper',
      description: 'Helper needed',
      location: 'Houston, TX',
      trades: ['General Laborer'],
      job_type: 'temporary' as const,
      pay_rate: '$20/hr',
    };

    mockCreateJob.mockResolvedValue(mockActionSuccess({ jobId: 'minimal-job' }));

    const { result } = renderHookWithQuery(() => useCreateJob());

    result.current.mutate(minimalJobData);

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockCreateJob).toHaveBeenCalledWith(minimalJobData);
  });

  it('should handle job with custom questions', async () => {
    const jobWithQuestions = {
      ...validJobData,
      custom_questions: [
        { question: 'Do you have a valid drivers license?', required: true },
        { question: 'Can you pass a background check?', required: true },
      ],
    };

    mockCreateJob.mockResolvedValue(mockActionSuccess({ jobId: 'job-with-questions' }));

    const { result } = renderHookWithQuery(() => useCreateJob());

    result.current.mutate(jobWithQuestions);

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockCreateJob).toHaveBeenCalledWith(jobWithQuestions);
  });

  it('should handle contract job type', async () => {
    const contractJob = {
      ...validJobData,
      job_type: 'contract' as const,
      pay_rate: '$5000/contract',
    };

    mockCreateJob.mockResolvedValue(mockActionSuccess({ jobId: 'contract-job' }));

    const { result } = renderHookWithQuery(() => useCreateJob());

    result.current.mutate(contractJob);

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockCreateJob).toHaveBeenCalledWith(contractJob);
  });
});
