/**
 * Auth Service - Pure business logic for authentication.
 *
 * This module contains testable pure functions for auth validation
 * and data transformation. No Server Action dependencies.
 */

// ============================================================================
// Types
// ============================================================================

export type SignUpInput = {
  email: string;
  password: string;
  name: string;
};

export type SignInInput = {
  email: string;
  password: string;
};

export type ValidationResult = {
  valid: boolean;
  error?: string;
  field?: string;
};

export type NameParts = {
  firstName: string;
  lastName: string;
};

export type ModerationAction = {
  action_type: 'ban' | 'suspension' | 'warning';
  reason: string;
  expires_at?: string | null;
  created_at: string;
};

export type ModerationCheckResult = {
  allowed: boolean;
  error?: string;
  actionType?: 'ban' | 'suspension';
  expiresAt?: string;
};

// ============================================================================
// Constants
// ============================================================================

export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_LENGTH = 128;
export const MIN_NAME_LENGTH = 2;
export const MAX_NAME_LENGTH = 100;

// Email regex (RFC 5322 simplified)
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Password requirements
export const PASSWORD_REQUIREMENTS = {
  minLength: MIN_PASSWORD_LENGTH,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSpecial: false, // Optional for now
};

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validates sign-up input.
 * @param input - Sign-up input data
 * @returns ValidationResult
 */
export function validateSignUpInput(input: SignUpInput): ValidationResult {
  // Email validation
  const emailResult = validateEmail(input.email);
  if (!emailResult.valid) return emailResult;

  // Password validation
  const passwordResult = validatePassword(input.password);
  if (!passwordResult.valid) return passwordResult;

  // Name validation
  const nameResult = validateName(input.name);
  if (!nameResult.valid) return nameResult;

  return { valid: true };
}

/**
 * Validates sign-in input.
 * @param input - Sign-in input data
 * @returns ValidationResult
 */
export function validateSignInInput(input: SignInInput): ValidationResult {
  // Email validation
  const emailResult = validateEmail(input.email);
  if (!emailResult.valid) return emailResult;

  // Password presence check (not strength, just presence)
  if (!input.password || input.password.length === 0) {
    return { valid: false, error: 'Password is required', field: 'password' };
  }

  return { valid: true };
}

/**
 * Validates an email address.
 * @param email - The email to validate
 * @returns ValidationResult
 */
export function validateEmail(email: string | undefined): ValidationResult {
  if (!email || email.trim().length === 0) {
    return { valid: false, error: 'Email is required', field: 'email' };
  }

  const trimmed = email.trim().toLowerCase();

  if (!EMAIL_REGEX.test(trimmed)) {
    return { valid: false, error: 'Please enter a valid email address', field: 'email' };
  }

  return { valid: true };
}

/**
 * Validates a password against requirements.
 * @param password - The password to validate
 * @returns ValidationResult
 */
export function validatePassword(password: string | undefined): ValidationResult {
  if (!password) {
    return { valid: false, error: 'Password is required', field: 'password' };
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    return {
      valid: false,
      error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters`,
      field: 'password',
    };
  }

  if (password.length > MAX_PASSWORD_LENGTH) {
    return {
      valid: false,
      error: `Password must be less than ${MAX_PASSWORD_LENGTH} characters`,
      field: 'password',
    };
  }

  if (PASSWORD_REQUIREMENTS.requireUppercase && !/[A-Z]/.test(password)) {
    return {
      valid: false,
      error: 'Password must contain at least one uppercase letter',
      field: 'password',
    };
  }

  if (PASSWORD_REQUIREMENTS.requireLowercase && !/[a-z]/.test(password)) {
    return {
      valid: false,
      error: 'Password must contain at least one lowercase letter',
      field: 'password',
    };
  }

  if (PASSWORD_REQUIREMENTS.requireNumber && !/\d/.test(password)) {
    return {
      valid: false,
      error: 'Password must contain at least one number',
      field: 'password',
    };
  }

  if (PASSWORD_REQUIREMENTS.requireSpecial && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    return {
      valid: false,
      error: 'Password must contain at least one special character',
      field: 'password',
    };
  }

  return { valid: true };
}

/**
 * Validates a name field.
 * @param name - The name to validate
 * @returns ValidationResult
 */
export function validateName(name: string | undefined): ValidationResult {
  if (!name || name.trim().length === 0) {
    return { valid: false, error: 'Name is required', field: 'name' };
  }

  const trimmed = name.trim();

  if (trimmed.length < MIN_NAME_LENGTH) {
    return {
      valid: false,
      error: `Name must be at least ${MIN_NAME_LENGTH} characters`,
      field: 'name',
    };
  }

  if (trimmed.length > MAX_NAME_LENGTH) {
    return {
      valid: false,
      error: `Name must be less than ${MAX_NAME_LENGTH} characters`,
      field: 'name',
    };
  }

  return { valid: true };
}

/**
 * Calculates password strength score (0-100).
 * @param password - The password to evaluate
 * @returns Score from 0-100
 */
export function calculatePasswordStrength(password: string): number {
  if (!password) return 0;

  let score = 0;

  // Length scoring (up to 40 points)
  score += Math.min(password.length * 4, 40);

  // Character variety (up to 40 points)
  if (/[a-z]/.test(password)) score += 10;
  if (/[A-Z]/.test(password)) score += 10;
  if (/\d/.test(password)) score += 10;
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score += 10;

  // Complexity bonus (up to 20 points)
  const uniqueChars = new Set(password).size;
  score += Math.min(uniqueChars * 2, 20);

  return Math.min(score, 100);
}

/**
 * Gets password strength label.
 * @param score - Password strength score
 * @returns Strength label
 */
export function getPasswordStrengthLabel(score: number): 'weak' | 'fair' | 'good' | 'strong' {
  if (score < 30) return 'weak';
  if (score < 50) return 'fair';
  if (score < 70) return 'good';
  return 'strong';
}

// ============================================================================
// Data Transformation Functions
// ============================================================================

/**
 * Parses a full name into first and last name parts.
 * @param fullName - The full name to parse
 * @returns NameParts
 */
export function parseNameParts(fullName: string): NameParts {
  const trimmed = fullName.trim();
  const parts = trimmed.split(/\s+/);

  if (parts.length === 0 || (parts.length === 1 && parts[0] === '')) {
    return { firstName: 'New', lastName: 'User' };
  }

  const firstName = parts[0] || 'New';
  const lastName = parts.slice(1).join(' ') || 'User';

  return { firstName, lastName };
}

/**
 * Sanitizes an email address.
 * @param email - Raw email input
 * @returns Sanitized lowercase email
 */
export function sanitizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

// ============================================================================
// Moderation Functions
// ============================================================================

/**
 * Checks if a user is allowed to sign in based on moderation actions.
 * @param actions - Array of moderation actions for the user
 * @returns ModerationCheckResult
 */
export function checkModerationStatus(actions: ModerationAction[]): ModerationCheckResult {
  if (!actions || actions.length === 0) {
    return { allowed: true };
  }

  // Check for permanent ban
  const ban = actions.find((a) => a.action_type === 'ban');
  if (ban) {
    return {
      allowed: false,
      actionType: 'ban',
      error: `Your account has been permanently banned. Reason: ${ban.reason}`,
    };
  }

  // Check for active suspension
  const now = new Date();
  const activeSuspension = actions.find(
    (a) => a.action_type === 'suspension' && a.expires_at && new Date(a.expires_at) > now
  );

  if (activeSuspension) {
    return {
      allowed: false,
      actionType: 'suspension',
      expiresAt: activeSuspension.expires_at!,
      error: `Your account is suspended until ${new Date(activeSuspension.expires_at!).toLocaleString()}. Reason: ${activeSuspension.reason}`,
    };
  }

  return { allowed: true };
}

/**
 * Checks if a suspension has expired.
 * @param expiresAt - The expiration date string
 * @returns true if expired
 */
export function isSuspensionExpired(expiresAt: string | null | undefined): boolean {
  if (!expiresAt) return true;
  return new Date(expiresAt) <= new Date();
}

/**
 * Formats a moderation error message for display.
 * @param result - Moderation check result
 * @param supportEmail - Support email for appeals
 * @returns Formatted error message
 */
export function formatModerationError(result: ModerationCheckResult, supportEmail: string): string {
  if (result.allowed) return '';

  const baseMessage = result.error || 'Your account has been restricted.';
  return `${baseMessage}\n\nIf you believe this is a mistake, please contact ${supportEmail} to appeal.`;
}
