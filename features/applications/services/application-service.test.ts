import { describe, it, expect } from 'vitest';
import {
  validateApplicationInput,
  validateCoverLetter,
  validateCustomAnswers,
  validateApplicationStatus,
  validateStatusTransition,
  buildApplicationRecord,
  sanitizeCustomAnswers,
  isTerminalStatus,
  getAllowedTransitions,
  canWithdrawApplication,
  MAX_COVER_LETTER_LENGTH,
  MIN_COVER_LETTER_LENGTH,
  MAX_CUSTOM_ANSWER_LENGTH,
  type ApplicationInput,
  type CustomQuestion,
} from './application-service';

// ============================================================================
// validateApplicationInput Tests
// ============================================================================

describe('validateApplicationInput', () => {
  it('should return valid for valid input', () => {
    const input: ApplicationInput = {
      jobId: 'job-123',
      coverLetter: 'I am very interested in this position and have relevant experience.',
    };
    const result = validateApplicationInput(input);
    expect(result.valid).toBe(true);
  });

  it('should return valid for minimal input (just jobId)', () => {
    const input: ApplicationInput = { jobId: 'job-123' };
    const result = validateApplicationInput(input);
    expect(result.valid).toBe(true);
  });

  it('should reject missing jobId', () => {
    const input = { jobId: '' } as ApplicationInput;
    const result = validateApplicationInput(input);
    expect(result.valid).toBe(false);
    expect(result.field).toBe('jobId');
  });

  it('should reject empty jobId', () => {
    const input: ApplicationInput = { jobId: '   ' };
    const result = validateApplicationInput(input);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('empty');
  });

  it('should validate cover letter if provided', () => {
    const input: ApplicationInput = {
      jobId: 'job-123',
      coverLetter: 'Hi', // Too short
    };
    const result = validateApplicationInput(input);
    expect(result.valid).toBe(false);
    expect(result.field).toBe('coverLetter');
  });
});

// ============================================================================
// validateCoverLetter Tests
// ============================================================================

describe('validateCoverLetter', () => {
  it('should return valid for undefined cover letter', () => {
    expect(validateCoverLetter(undefined).valid).toBe(true);
  });

  it('should return valid for null cover letter', () => {
    expect(validateCoverLetter(null).valid).toBe(true);
  });

  it('should return valid for empty string', () => {
    expect(validateCoverLetter('').valid).toBe(true);
  });

  it('should return valid for valid cover letter', () => {
    const letter = 'I am writing to express my interest in this position. I have 5 years of experience.';
    expect(validateCoverLetter(letter).valid).toBe(true);
  });

  it('should reject cover letter that is too short', () => {
    const result = validateCoverLetter('Hello');
    expect(result.valid).toBe(false);
    expect(result.error).toContain(`${MIN_COVER_LETTER_LENGTH}`);
  });

  it('should reject cover letter that is too long', () => {
    const letter = 'A'.repeat(MAX_COVER_LETTER_LENGTH + 1);
    const result = validateCoverLetter(letter);
    expect(result.valid).toBe(false);
    expect(result.error).toContain(`${MAX_COVER_LETTER_LENGTH}`);
  });

  it('should accept cover letter at minimum length', () => {
    const letter = 'A'.repeat(MIN_COVER_LETTER_LENGTH);
    expect(validateCoverLetter(letter).valid).toBe(true);
  });

  it('should accept cover letter at maximum length', () => {
    const letter = 'A'.repeat(MAX_COVER_LETTER_LENGTH);
    expect(validateCoverLetter(letter).valid).toBe(true);
  });
});

// ============================================================================
// validateCustomAnswers Tests
// ============================================================================

describe('validateCustomAnswers', () => {
  it('should return valid for empty questions array', () => {
    expect(validateCustomAnswers({}, []).valid).toBe(true);
  });

  it('should return valid for undefined questions', () => {
    expect(validateCustomAnswers(undefined, []).valid).toBe(true);
  });

  it('should return valid when all required questions are answered', () => {
    const questions: CustomQuestion[] = [
      { id: 'q1', question: 'Do you have experience?', required: true },
      { id: 'q2', question: 'Are you available weekends?', required: false },
    ];
    const answers = { q1: 'Yes, 5 years', q2: '' };
    expect(validateCustomAnswers(answers, questions).valid).toBe(true);
  });

  it('should reject missing required answer', () => {
    const questions: CustomQuestion[] = [
      { id: 'q1', question: 'Do you have experience?', required: true },
    ];
    const answers = { q1: '' };
    const result = validateCustomAnswers(answers, questions);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('required');
  });

  it('should reject answer that is too long', () => {
    const questions: CustomQuestion[] = [
      { id: 'q1', question: 'Describe yourself', required: false },
    ];
    const answers = { q1: 'A'.repeat(MAX_CUSTOM_ANSWER_LENGTH + 1) };
    const result = validateCustomAnswers(answers, questions);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('too long');
  });

  it('should handle questions without IDs', () => {
    const questions: CustomQuestion[] = [
      { question: 'First question?', required: true },
    ];
    const answers = { q0: 'Answer' };
    expect(validateCustomAnswers(answers, questions).valid).toBe(true);
  });
});

// ============================================================================
// validateApplicationStatus Tests
// ============================================================================

describe('validateApplicationStatus', () => {
  it('should accept all valid statuses', () => {
    const validStatuses = ['pending', 'viewed', 'contacted', 'rejected', 'hired'];
    for (const status of validStatuses) {
      expect(validateApplicationStatus(status).valid).toBe(true);
    }
  });

  it('should reject invalid status', () => {
    const result = validateApplicationStatus('invalid');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Invalid status');
  });

  it('should reject empty status', () => {
    expect(validateApplicationStatus('').valid).toBe(false);
  });
});

// ============================================================================
// validateStatusTransition Tests
// ============================================================================

describe('validateStatusTransition', () => {
  it('should allow pending -> viewed', () => {
    expect(validateStatusTransition('pending', 'viewed').valid).toBe(true);
  });

  it('should allow pending -> hired', () => {
    expect(validateStatusTransition('pending', 'hired').valid).toBe(true);
  });

  it('should allow viewed -> contacted', () => {
    expect(validateStatusTransition('viewed', 'contacted').valid).toBe(true);
  });

  it('should reject hired -> anything', () => {
    const result = validateStatusTransition('hired', 'pending');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('terminal state');
  });

  it('should reject rejected -> anything', () => {
    const result = validateStatusTransition('rejected', 'pending');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('terminal state');
  });

  it('should reject invalid transition', () => {
    const result = validateStatusTransition('contacted', 'pending');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Cannot transition');
  });
});

// ============================================================================
// buildApplicationRecord Tests
// ============================================================================

describe('buildApplicationRecord', () => {
  it('should build complete record', () => {
    const input: ApplicationInput = {
      jobId: 'job-123',
      coverLetter: '  I am interested in this role.  ',
      customAnswers: { q1: 'Yes' },
    };
    const record = buildApplicationRecord(input, 'user-456');

    expect(record.job_id).toBe('job-123');
    expect(record.applicant_id).toBe('user-456');
    expect(record.cover_letter).toBe('I am interested in this role.');
    expect(record.custom_answers).toEqual({ q1: 'Yes' });
    expect(record.status).toBe('pending');
  });

  it('should handle missing cover letter', () => {
    const input: ApplicationInput = { jobId: 'job-123' };
    const record = buildApplicationRecord(input, 'user-456');
    expect(record.cover_letter).toBeNull();
  });

  it('should handle missing custom answers', () => {
    const input: ApplicationInput = { jobId: 'job-123' };
    const record = buildApplicationRecord(input, 'user-456');
    expect(record.custom_answers).toBeNull();
  });
});

// ============================================================================
// sanitizeCustomAnswers Tests
// ============================================================================

describe('sanitizeCustomAnswers', () => {
  it('should return empty object for undefined', () => {
    expect(sanitizeCustomAnswers(undefined)).toEqual({});
  });

  it('should trim whitespace from answers', () => {
    const answers = { q1: '  Yes  ', q2: '  No  ' };
    const result = sanitizeCustomAnswers(answers);
    expect(result.q1).toBe('Yes');
    expect(result.q2).toBe('No');
  });

  it('should skip non-string values', () => {
    const answers = { q1: 'Yes', q2: 123 as unknown as string };
    const result = sanitizeCustomAnswers(answers);
    expect(result.q1).toBe('Yes');
    expect(result.q2).toBeUndefined();
  });
});

// ============================================================================
// Status Utility Tests
// ============================================================================

describe('isTerminalStatus', () => {
  it('should return true for hired', () => {
    expect(isTerminalStatus('hired')).toBe(true);
  });

  it('should return true for rejected', () => {
    expect(isTerminalStatus('rejected')).toBe(true);
  });

  it('should return false for pending', () => {
    expect(isTerminalStatus('pending')).toBe(false);
  });

  it('should return false for viewed', () => {
    expect(isTerminalStatus('viewed')).toBe(false);
  });
});

describe('getAllowedTransitions', () => {
  it('should return transitions for pending', () => {
    const allowed = getAllowedTransitions('pending');
    expect(allowed).toContain('viewed');
    expect(allowed).toContain('hired');
    expect(allowed).toContain('rejected');
  });

  it('should return empty array for terminal status', () => {
    expect(getAllowedTransitions('hired')).toEqual([]);
    expect(getAllowedTransitions('rejected')).toEqual([]);
  });
});

describe('canWithdrawApplication', () => {
  it('should return true for pending', () => {
    expect(canWithdrawApplication('pending')).toBe(true);
  });

  it('should return true for viewed', () => {
    expect(canWithdrawApplication('viewed')).toBe(true);
  });

  it('should return false for contacted', () => {
    expect(canWithdrawApplication('contacted')).toBe(false);
  });

  it('should return false for hired', () => {
    expect(canWithdrawApplication('hired')).toBe(false);
  });

  it('should return false for rejected', () => {
    expect(canWithdrawApplication('rejected')).toBe(false);
  });
});
