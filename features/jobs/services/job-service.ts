/**
 * Job Service - Pure business logic for job operations.
 *
 * This module contains testable pure functions extracted from job-actions.ts.
 * No Server Action dependencies (cookies, headers, etc.)
 */

import { TRADES, JOB_TYPES, ALLOWED_JOB_POSTING_EMPLOYER_TYPES } from '@/lib/constants';
import type { EmployerType } from '@/lib/constants';

// ============================================================================
// Types
// ============================================================================

export type TradeSelection = {
  trade: string;
  subTrades: string[];
};

export type CustomQuestion = {
  question: string;
  required: boolean;
};

export type Coordinates = {
  lat: number;
  lng: number;
};

export type JobInput = {
  title: string;
  trades: string[];
  sub_trades?: string[];
  job_type: string;
  description: string;
  location: string;
  coords?: Coordinates | null;
  pay_rate: string;
  pay_min?: number;
  pay_max?: number;
  required_certs?: string[];
  status?: 'active' | 'filled' | 'closed' | 'draft';
  time_length?: string;
  trade_selections?: TradeSelection[];
  custom_questions?: CustomQuestion[];
};

export type JobFilters = {
  trade?: string;
  subTrade?: string;
  jobType?: string;
  status?: string;
  employerId?: string;
  minPay?: number;
};

export type ValidationResult = {
  valid: boolean;
  error?: string;
  field?: string;
};

export type JobRecord = {
  employer_id: string;
  title: string;
  description: string;
  location: string;
  trades: string[];
  sub_trades: string[];
  job_type: string;
  pay_rate: string;
  pay_min: number | null;
  pay_max: number | null;
  required_certs: string[];
  status: 'active' | 'filled' | 'closed' | 'draft';
  custom_questions?: CustomQuestion[];
};

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validates job input data.
 * @param input - The job input to validate
 * @returns ValidationResult with valid flag and optional error
 */
export function validateJobInput(input: JobInput): ValidationResult {
  // Title validation
  if (!input.title || typeof input.title !== 'string') {
    return { valid: false, error: 'Job title is required', field: 'title' };
  }

  const trimmedTitle = input.title.trim();
  if (trimmedTitle.length < 3) {
    return { valid: false, error: 'Job title must be at least 3 characters', field: 'title' };
  }

  if (trimmedTitle.length > 100) {
    return { valid: false, error: 'Job title must be less than 100 characters', field: 'title' };
  }

  // Trades validation
  if (!input.trades || !Array.isArray(input.trades) || input.trades.length === 0) {
    return { valid: false, error: 'At least one trade is required', field: 'trades' };
  }

  // Validate each trade is a known trade
  for (const trade of input.trades) {
    if (!TRADES.includes(trade as typeof TRADES[number])) {
      return { valid: false, error: `Invalid trade: ${trade}`, field: 'trades' };
    }
  }

  // Job type validation
  if (!input.job_type || typeof input.job_type !== 'string') {
    return { valid: false, error: 'Job type is required', field: 'job_type' };
  }

  if (!JOB_TYPES.includes(input.job_type as typeof JOB_TYPES[number])) {
    return { valid: false, error: `Invalid job type: ${input.job_type}`, field: 'job_type' };
  }

  // Description validation
  if (!input.description || typeof input.description !== 'string') {
    return { valid: false, error: 'Job description is required', field: 'description' };
  }

  const trimmedDescription = input.description.trim();
  if (trimmedDescription.length < 10) {
    return { valid: false, error: 'Job description must be at least 10 characters', field: 'description' };
  }

  if (trimmedDescription.length > 5000) {
    return { valid: false, error: 'Job description must be less than 5000 characters', field: 'description' };
  }

  // Location validation
  if (!input.location || typeof input.location !== 'string') {
    return { valid: false, error: 'Location is required', field: 'location' };
  }

  if (input.location.trim().length < 2) {
    return { valid: false, error: 'Location must be at least 2 characters', field: 'location' };
  }

  // Pay rate validation
  if (!input.pay_rate || typeof input.pay_rate !== 'string') {
    return { valid: false, error: 'Pay rate is required', field: 'pay_rate' };
  }

  // Coordinates validation (if provided)
  if (input.coords) {
    const coordsResult = validateCoordinates(input.coords);
    if (!coordsResult.valid) {
      return coordsResult;
    }
  }

  // Custom questions validation (if provided)
  if (input.custom_questions) {
    const questionsResult = validateCustomQuestions(input.custom_questions);
    if (!questionsResult.valid) {
      return questionsResult;
    }
  }

  return { valid: true };
}

/**
 * Validates coordinate input.
 * @param coords - The coordinates to validate
 * @returns ValidationResult
 */
export function validateCoordinates(coords: Coordinates | null | undefined): ValidationResult {
  if (!coords) {
    return { valid: true }; // Coords are optional
  }

  if (typeof coords.lat !== 'number' || typeof coords.lng !== 'number') {
    return { valid: false, error: 'Coordinates must be numbers', field: 'coords' };
  }

  if (coords.lat < -90 || coords.lat > 90) {
    return { valid: false, error: 'Latitude must be between -90 and 90', field: 'coords' };
  }

  if (coords.lng < -180 || coords.lng > 180) {
    return { valid: false, error: 'Longitude must be between -180 and 180', field: 'coords' };
  }

  if (isNaN(coords.lat) || isNaN(coords.lng)) {
    return { valid: false, error: 'Coordinates cannot be NaN', field: 'coords' };
  }

  return { valid: true };
}

/**
 * Validates custom screening questions.
 * @param questions - Array of custom questions
 * @returns ValidationResult
 */
export function validateCustomQuestions(questions: CustomQuestion[]): ValidationResult {
  if (!Array.isArray(questions)) {
    return { valid: false, error: 'Custom questions must be an array', field: 'custom_questions' };
  }

  if (questions.length > 5) {
    return { valid: false, error: 'Maximum 5 custom questions allowed', field: 'custom_questions' };
  }

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];

    if (!q.question || typeof q.question !== 'string') {
      return { valid: false, error: `Question ${i + 1} text is required`, field: 'custom_questions' };
    }

    if (q.question.trim().length < 5) {
      return { valid: false, error: `Question ${i + 1} must be at least 5 characters`, field: 'custom_questions' };
    }

    if (q.question.trim().length > 500) {
      return { valid: false, error: `Question ${i + 1} must be less than 500 characters`, field: 'custom_questions' };
    }

    if (typeof q.required !== 'boolean') {
      return { valid: false, error: `Question ${i + 1} required flag must be a boolean`, field: 'custom_questions' };
    }
  }

  return { valid: true };
}

/**
 * Validates employer type for job posting permissions.
 * @param employerType - The employer type to check
 * @returns ValidationResult
 */
export function validateEmployerType(employerType: string | null | undefined): ValidationResult {
  if (!employerType) {
    return { valid: false, error: 'Employer type is required' };
  }

  if (!ALLOWED_JOB_POSTING_EMPLOYER_TYPES.includes(employerType as EmployerType)) {
    return { valid: false, error: 'Only contractors and developers can post jobs' };
  }

  return { valid: true };
}

// ============================================================================
// Data Transformation Functions
// ============================================================================

/**
 * Builds a job record from validated input for database insertion.
 * @param input - Validated job input
 * @param employerId - The employer's user ID
 * @returns JobRecord ready for database insertion
 */
export function buildJobRecord(input: JobInput, employerId: string): JobRecord {
  return {
    employer_id: employerId,
    title: input.title.trim(),
    description: input.description.trim(),
    location: input.location.trim(),
    trades: input.trades,
    sub_trades: input.sub_trades || [],
    job_type: input.job_type,
    pay_rate: input.pay_rate,
    pay_min: input.pay_min ?? null,
    pay_max: input.pay_max ?? null,
    required_certs: input.required_certs || [],
    status: input.status || 'active',
    custom_questions: input.custom_questions,
  };
}

/**
 * Builds a partial update record from input, excluding undefined fields.
 * @param input - Partial job input for update
 * @returns Partial record for database update
 */
export function buildJobUpdateRecord(input: Partial<JobInput>): Partial<JobRecord> {
  const record: Partial<JobRecord> = {};

  if (input.title !== undefined) record.title = input.title.trim();
  if (input.description !== undefined) record.description = input.description.trim();
  if (input.location !== undefined) record.location = input.location.trim();
  if (input.trades !== undefined) record.trades = input.trades;
  if (input.sub_trades !== undefined) record.sub_trades = input.sub_trades;
  if (input.job_type !== undefined) record.job_type = input.job_type;
  if (input.pay_rate !== undefined) record.pay_rate = input.pay_rate;
  if (input.pay_min !== undefined) record.pay_min = input.pay_min;
  if (input.pay_max !== undefined) record.pay_max = input.pay_max;
  if (input.required_certs !== undefined) record.required_certs = input.required_certs;
  if (input.status !== undefined) record.status = input.status;
  if (input.custom_questions !== undefined) record.custom_questions = input.custom_questions;

  return record;
}

// ============================================================================
// Pay Rate Formatting
// ============================================================================

export type PayPeriod = 'weekly' | 'bi-weekly' | 'monthly';
export type PaymentType = 'per_contract' | 'per_job';

/**
 * Formats pay rate for hourly jobs.
 * @param hourlyRate - The hourly rate in dollars
 * @param period - The pay period
 * @returns Formatted pay rate string
 */
export function formatHourlyPayRate(hourlyRate: number, period: PayPeriod): string {
  if (hourlyRate <= 0 || isNaN(hourlyRate)) {
    return '';
  }

  const formatted = hourlyRate.toFixed(2);
  const periodLabel = period === 'bi-weekly' ? 'bi-weekly' : period;

  return `$${formatted}/hr (${periodLabel})`;
}

/**
 * Formats pay rate for contract jobs.
 * @param amount - The contract amount in dollars
 * @param paymentType - Per contract or per job
 * @returns Formatted pay rate string
 */
export function formatContractPayRate(amount: number, paymentType: PaymentType): string {
  if (amount <= 0 || isNaN(amount)) {
    return '';
  }

  const formatted = amount.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

  const typeLabel = paymentType === 'per_contract' ? 'contract' : 'job';

  return `$${formatted}/${typeLabel}`;
}

/**
 * Formats pay range for display.
 * @param min - Minimum pay
 * @param max - Maximum pay
 * @returns Formatted pay range string
 */
export function formatPayRange(min?: number, max?: number): string {
  if (!min && !max) return '';

  if (min && max) {
    return `$${min.toLocaleString()} - $${max.toLocaleString()}`;
  }

  if (min) {
    return `$${min.toLocaleString()}+`;
  }

  if (max) {
    return `Up to $${max.toLocaleString()}`;
  }

  return '';
}

// ============================================================================
// Filter Utilities
// ============================================================================

/**
 * Parses and validates job filters.
 * @param filters - Raw filter input
 * @returns Cleaned filter object
 */
export function parseJobFilters(filters?: JobFilters): JobFilters {
  if (!filters) return {};

  const parsed: JobFilters = {};

  if (filters.trade && typeof filters.trade === 'string' && filters.trade.trim()) {
    parsed.trade = filters.trade.trim();
  }

  if (filters.subTrade && typeof filters.subTrade === 'string' && filters.subTrade.trim()) {
    parsed.subTrade = filters.subTrade.trim();
  }

  if (filters.jobType && typeof filters.jobType === 'string' && filters.jobType.trim()) {
    parsed.jobType = filters.jobType.trim();
  }

  if (filters.status && typeof filters.status === 'string' && filters.status.trim()) {
    parsed.status = filters.status.trim();
  }

  if (filters.employerId && typeof filters.employerId === 'string' && filters.employerId.trim()) {
    parsed.employerId = filters.employerId.trim();
  }

  if (typeof filters.minPay === 'number' && filters.minPay > 0 && !isNaN(filters.minPay)) {
    parsed.minPay = filters.minPay;
  }

  return parsed;
}

/**
 * Checks if filters are empty (no active filters).
 * @param filters - Filter object to check
 * @returns true if no filters are active
 */
export function areFiltersEmpty(filters?: JobFilters): boolean {
  if (!filters) return true;

  return (
    !filters.trade &&
    !filters.subTrade &&
    !filters.jobType &&
    !filters.status &&
    !filters.employerId &&
    !filters.minPay
  );
}

/**
 * Counts active filters.
 * @param filters - Filter object
 * @returns Number of active filters
 */
export function countActiveFilters(filters?: JobFilters): number {
  if (!filters) return 0;

  let count = 0;
  if (filters.trade) count++;
  if (filters.subTrade) count++;
  if (filters.jobType) count++;
  if (filters.status) count++;
  if (filters.employerId) count++;
  if (filters.minPay) count++;

  return count;
}
