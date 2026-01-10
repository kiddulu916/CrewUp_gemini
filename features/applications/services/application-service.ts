/**
 * Application Service - Pure business logic for job applications.
 *
 * This module contains testable pure functions for application validation
 * and data transformation. No Server Action dependencies.
 */

import { APPLICATION_STATUSES } from '@/lib/constants';
import type { ApplicationStatus } from '@/lib/constants';

// ============================================================================
// Types
// ============================================================================

export type ApplicationInput = {
  jobId: string;
  coverLetter?: string;
  customAnswers?: Record<string, string>;
};

export type CustomQuestion = {
  id?: string;
  question: string;
  required: boolean;
};

export type ValidationResult = {
  valid: boolean;
  error?: string;
  field?: string;
};

export type StatusTransition = {
  from: ApplicationStatus;
  to: ApplicationStatus;
};

// ============================================================================
// Constants
// ============================================================================

export const MAX_COVER_LETTER_LENGTH = 5000;
export const MIN_COVER_LETTER_LENGTH = 10;
export const MAX_CUSTOM_ANSWER_LENGTH = 2000;

// Valid status transitions for applications
export const VALID_STATUS_TRANSITIONS: Record<ApplicationStatus, ApplicationStatus[]> = {
  pending: ['viewed', 'contacted', 'rejected', 'hired'],
  viewed: ['contacted', 'rejected', 'hired'],
  contacted: ['rejected', 'hired'],
  rejected: [], // Terminal state
  hired: [], // Terminal state
};

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validates application input data.
 * @param input - The application input to validate
 * @returns ValidationResult
 */
export function validateApplicationInput(input: ApplicationInput): ValidationResult {
  // Job ID validation
  if (!input.jobId || typeof input.jobId !== 'string') {
    return { valid: false, error: 'Job ID is required', field: 'jobId' };
  }

  if (input.jobId.trim().length === 0) {
    return { valid: false, error: 'Job ID cannot be empty', field: 'jobId' };
  }

  // Cover letter validation (optional but if provided, must meet requirements)
  if (input.coverLetter !== undefined && input.coverLetter !== null) {
    const coverLetterResult = validateCoverLetter(input.coverLetter);
    if (!coverLetterResult.valid) {
      return coverLetterResult;
    }
  }

  return { valid: true };
}

/**
 * Validates cover letter content.
 * @param coverLetter - The cover letter text
 * @returns ValidationResult
 */
export function validateCoverLetter(coverLetter: string | undefined | null): ValidationResult {
  if (!coverLetter || coverLetter.trim().length === 0) {
    return { valid: true }; // Cover letter is optional
  }

  const trimmed = coverLetter.trim();

  if (trimmed.length < MIN_COVER_LETTER_LENGTH) {
    return {
      valid: false,
      error: `Cover letter must be at least ${MIN_COVER_LETTER_LENGTH} characters`,
      field: 'coverLetter',
    };
  }

  if (trimmed.length > MAX_COVER_LETTER_LENGTH) {
    return {
      valid: false,
      error: `Cover letter must be less than ${MAX_COVER_LETTER_LENGTH} characters`,
      field: 'coverLetter',
    };
  }

  return { valid: true };
}

/**
 * Validates custom answers against required questions.
 * @param answers - The answers provided
 * @param questions - The custom questions from the job
 * @returns ValidationResult
 */
export function validateCustomAnswers(
  answers: Record<string, string> | undefined,
  questions: CustomQuestion[]
): ValidationResult {
  if (!questions || questions.length === 0) {
    return { valid: true }; // No questions to validate
  }

  const providedAnswers = answers || {};

  for (let i = 0; i < questions.length; i++) {
    const question = questions[i];
    const questionId = question.id || `q${i}`;
    const answer = providedAnswers[questionId];

    // Check required questions have answers
    if (question.required) {
      if (!answer || answer.trim().length === 0) {
        return {
          valid: false,
          error: `Answer required for: "${question.question}"`,
          field: `customAnswers.${questionId}`,
        };
      }
    }

    // Validate answer length if provided
    if (answer && answer.length > MAX_CUSTOM_ANSWER_LENGTH) {
      return {
        valid: false,
        error: `Answer too long for question ${i + 1} (max ${MAX_CUSTOM_ANSWER_LENGTH} characters)`,
        field: `customAnswers.${questionId}`,
      };
    }
  }

  return { valid: true };
}

/**
 * Validates application status value.
 * @param status - The status to validate
 * @returns ValidationResult
 */
export function validateApplicationStatus(status: string): ValidationResult {
  if (!status || typeof status !== 'string') {
    return { valid: false, error: 'Status is required', field: 'status' };
  }

  if (!APPLICATION_STATUSES.includes(status as ApplicationStatus)) {
    return {
      valid: false,
      error: `Invalid status: ${status}. Must be one of: ${APPLICATION_STATUSES.join(', ')}`,
      field: 'status',
    };
  }

  return { valid: true };
}

/**
 * Validates if a status transition is allowed.
 * @param from - Current status
 * @param to - Desired new status
 * @returns ValidationResult
 */
export function validateStatusTransition(from: ApplicationStatus, to: ApplicationStatus): ValidationResult {
  const allowedTransitions = VALID_STATUS_TRANSITIONS[from];

  if (!allowedTransitions) {
    return { valid: false, error: `Unknown current status: ${from}` };
  }

  if (!allowedTransitions.includes(to)) {
    if (allowedTransitions.length === 0) {
      return {
        valid: false,
        error: `Cannot change status from "${from}" - this is a terminal state`,
      };
    }
    return {
      valid: false,
      error: `Cannot transition from "${from}" to "${to}". Allowed: ${allowedTransitions.join(', ')}`,
    };
  }

  return { valid: true };
}

// ============================================================================
// Data Transformation Functions
// ============================================================================

/**
 * Builds an application record for database insertion.
 * @param input - Application input
 * @param applicantId - The applicant's user ID
 * @returns Application record
 */
export function buildApplicationRecord(
  input: ApplicationInput,
  applicantId: string
): {
  job_id: string;
  applicant_id: string;
  cover_letter: string | null;
  custom_answers: Record<string, string> | null;
  status: ApplicationStatus;
} {
  return {
    job_id: input.jobId,
    applicant_id: applicantId,
    cover_letter: input.coverLetter?.trim() || null,
    custom_answers: input.customAnswers || null,
    status: 'pending',
  };
}

/**
 * Sanitizes custom answers by trimming whitespace.
 * @param answers - Raw answers
 * @returns Sanitized answers
 */
export function sanitizeCustomAnswers(
  answers: Record<string, string> | undefined
): Record<string, string> {
  if (!answers) return {};

  const sanitized: Record<string, string> = {};
  for (const [key, value] of Object.entries(answers)) {
    if (typeof value === 'string') {
      sanitized[key] = value.trim();
    }
  }
  return sanitized;
}

// ============================================================================
// Status Utilities
// ============================================================================

/**
 * Checks if a status is a terminal state (cannot be changed).
 * @param status - The status to check
 * @returns true if terminal
 */
export function isTerminalStatus(status: ApplicationStatus): boolean {
  return VALID_STATUS_TRANSITIONS[status]?.length === 0;
}

/**
 * Gets allowed next statuses from current status.
 * @param currentStatus - The current status
 * @returns Array of allowed next statuses
 */
export function getAllowedTransitions(currentStatus: ApplicationStatus): ApplicationStatus[] {
  return VALID_STATUS_TRANSITIONS[currentStatus] || [];
}

/**
 * Checks if application can be withdrawn.
 * Only pending and viewed applications can be withdrawn.
 * @param status - Current application status
 * @returns true if can withdraw
 */
export function canWithdrawApplication(status: ApplicationStatus): boolean {
  return status === 'pending' || status === 'viewed';
}
