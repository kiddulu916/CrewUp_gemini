import { describe, it, expect } from 'vitest';
import {
  validateSignUpInput,
  validateSignInInput,
  validateEmail,
  validatePassword,
  validateName,
  calculatePasswordStrength,
  getPasswordStrengthLabel,
  parseNameParts,
  sanitizeEmail,
  checkModerationStatus,
  isSuspensionExpired,
  formatModerationError,
  MIN_PASSWORD_LENGTH,
  MAX_PASSWORD_LENGTH,
  MIN_NAME_LENGTH,
  MAX_NAME_LENGTH,
  type SignUpInput,
  type SignInInput,
  type ModerationAction,
} from './auth-service';

// ============================================================================
// validateSignUpInput Tests
// ============================================================================

describe('validateSignUpInput', () => {
  it('should return valid for complete valid input', () => {
    const input: SignUpInput = {
      email: 'test@example.com',
      password: 'Password123',
      name: 'John Doe',
    };
    expect(validateSignUpInput(input).valid).toBe(true);
  });

  it('should reject invalid email', () => {
    const input: SignUpInput = {
      email: 'invalid',
      password: 'Password123',
      name: 'John Doe',
    };
    const result = validateSignUpInput(input);
    expect(result.valid).toBe(false);
    expect(result.field).toBe('email');
  });

  it('should reject weak password', () => {
    const input: SignUpInput = {
      email: 'test@example.com',
      password: 'weak',
      name: 'John Doe',
    };
    const result = validateSignUpInput(input);
    expect(result.valid).toBe(false);
    expect(result.field).toBe('password');
  });

  it('should reject empty name', () => {
    const input: SignUpInput = {
      email: 'test@example.com',
      password: 'Password123',
      name: '',
    };
    const result = validateSignUpInput(input);
    expect(result.valid).toBe(false);
    expect(result.field).toBe('name');
  });
});

// ============================================================================
// validateSignInInput Tests
// ============================================================================

describe('validateSignInInput', () => {
  it('should return valid for valid input', () => {
    const input: SignInInput = {
      email: 'test@example.com',
      password: 'anypassword',
    };
    expect(validateSignInInput(input).valid).toBe(true);
  });

  it('should reject invalid email', () => {
    const input: SignInInput = {
      email: 'invalid',
      password: 'password',
    };
    expect(validateSignInInput(input).valid).toBe(false);
  });

  it('should reject empty password', () => {
    const input: SignInInput = {
      email: 'test@example.com',
      password: '',
    };
    const result = validateSignInInput(input);
    expect(result.valid).toBe(false);
    expect(result.field).toBe('password');
  });
});

// ============================================================================
// validateEmail Tests
// ============================================================================

describe('validateEmail', () => {
  it('should accept valid emails', () => {
    expect(validateEmail('test@example.com').valid).toBe(true);
    expect(validateEmail('user.name@domain.co.uk').valid).toBe(true);
    expect(validateEmail('user+tag@example.com').valid).toBe(true);
  });

  it('should reject empty email', () => {
    expect(validateEmail('').valid).toBe(false);
    expect(validateEmail(undefined).valid).toBe(false);
    expect(validateEmail('   ').valid).toBe(false);
  });

  it('should reject invalid formats', () => {
    expect(validateEmail('notanemail').valid).toBe(false);
    expect(validateEmail('missing@domain').valid).toBe(false);
    expect(validateEmail('@nodomain.com').valid).toBe(false);
    expect(validateEmail('spaces in@email.com').valid).toBe(false);
  });
});

// ============================================================================
// validatePassword Tests
// ============================================================================

describe('validatePassword', () => {
  it('should accept valid password', () => {
    expect(validatePassword('Password123').valid).toBe(true);
    expect(validatePassword('SecurePass1').valid).toBe(true);
  });

  it('should reject empty password', () => {
    expect(validatePassword('').valid).toBe(false);
    expect(validatePassword(undefined).valid).toBe(false);
  });

  it('should reject password too short', () => {
    const result = validatePassword('Pass1');
    expect(result.valid).toBe(false);
    expect(result.error).toContain(`${MIN_PASSWORD_LENGTH}`);
  });

  it('should reject password too long', () => {
    const longPassword = 'P'.repeat(MAX_PASSWORD_LENGTH + 1) + 'a1';
    const result = validatePassword(longPassword);
    expect(result.valid).toBe(false);
    expect(result.error).toContain(`${MAX_PASSWORD_LENGTH}`);
  });

  it('should reject password without uppercase', () => {
    const result = validatePassword('password123');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('uppercase');
  });

  it('should reject password without lowercase', () => {
    const result = validatePassword('PASSWORD123');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('lowercase');
  });

  it('should reject password without number', () => {
    const result = validatePassword('Passwordabc');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('number');
  });
});

// ============================================================================
// validateName Tests
// ============================================================================

describe('validateName', () => {
  it('should accept valid names', () => {
    expect(validateName('John').valid).toBe(true);
    expect(validateName('John Doe').valid).toBe(true);
    expect(validateName('Jo').valid).toBe(true);
  });

  it('should reject empty name', () => {
    expect(validateName('').valid).toBe(false);
    expect(validateName('   ').valid).toBe(false);
    expect(validateName(undefined).valid).toBe(false);
  });

  it('should reject name too short', () => {
    const result = validateName('J');
    expect(result.valid).toBe(false);
    expect(result.error).toContain(`${MIN_NAME_LENGTH}`);
  });

  it('should reject name too long', () => {
    const longName = 'A'.repeat(MAX_NAME_LENGTH + 1);
    const result = validateName(longName);
    expect(result.valid).toBe(false);
    expect(result.error).toContain(`${MAX_NAME_LENGTH}`);
  });
});

// ============================================================================
// Password Strength Tests
// ============================================================================

describe('calculatePasswordStrength', () => {
  it('should return 0 for empty password', () => {
    expect(calculatePasswordStrength('')).toBe(0);
  });

  it('should return low score for weak password', () => {
    const score = calculatePasswordStrength('abc');
    expect(score).toBeLessThan(30);
  });

  it('should return higher score for longer password', () => {
    const shortScore = calculatePasswordStrength('Pass1');
    const longScore = calculatePasswordStrength('Password123!@#');
    expect(longScore).toBeGreaterThan(shortScore);
  });

  it('should return higher score for more variety', () => {
    const simpleScore = calculatePasswordStrength('aaaaaaaa');
    const variedScore = calculatePasswordStrength('aB1!aB1!');
    expect(variedScore).toBeGreaterThan(simpleScore);
  });

  it('should cap at 100', () => {
    const veryStrongPassword = 'VeryStr0ng!P@ssword123#$%^&*()';
    expect(calculatePasswordStrength(veryStrongPassword)).toBeLessThanOrEqual(100);
  });
});

describe('getPasswordStrengthLabel', () => {
  it('should return weak for low scores', () => {
    expect(getPasswordStrengthLabel(0)).toBe('weak');
    expect(getPasswordStrengthLabel(29)).toBe('weak');
  });

  it('should return fair for medium-low scores', () => {
    expect(getPasswordStrengthLabel(30)).toBe('fair');
    expect(getPasswordStrengthLabel(49)).toBe('fair');
  });

  it('should return good for medium-high scores', () => {
    expect(getPasswordStrengthLabel(50)).toBe('good');
    expect(getPasswordStrengthLabel(69)).toBe('good');
  });

  it('should return strong for high scores', () => {
    expect(getPasswordStrengthLabel(70)).toBe('strong');
    expect(getPasswordStrengthLabel(100)).toBe('strong');
  });
});

// ============================================================================
// parseNameParts Tests
// ============================================================================

describe('parseNameParts', () => {
  it('should parse first and last name', () => {
    const result = parseNameParts('John Doe');
    expect(result.firstName).toBe('John');
    expect(result.lastName).toBe('Doe');
  });

  it('should default to "New User" for empty', () => {
    const result = parseNameParts('');
    expect(result.firstName).toBe('New');
    expect(result.lastName).toBe('User');
  });

  it('should default lastName to "User" for single name', () => {
    const result = parseNameParts('John');
    expect(result.firstName).toBe('John');
    expect(result.lastName).toBe('User');
  });

  it('should handle multiple names', () => {
    const result = parseNameParts('John Van Der Berg');
    expect(result.firstName).toBe('John');
    expect(result.lastName).toBe('Van Der Berg');
  });
});

// ============================================================================
// sanitizeEmail Tests
// ============================================================================

describe('sanitizeEmail', () => {
  it('should lowercase and trim', () => {
    expect(sanitizeEmail('  TEST@EXAMPLE.COM  ')).toBe('test@example.com');
  });

  it('should handle already clean email', () => {
    expect(sanitizeEmail('test@example.com')).toBe('test@example.com');
  });
});

// ============================================================================
// Moderation Tests
// ============================================================================

describe('checkModerationStatus', () => {
  it('should allow user with no actions', () => {
    expect(checkModerationStatus([]).allowed).toBe(true);
    expect(checkModerationStatus(null as unknown as ModerationAction[]).allowed).toBe(true);
  });

  it('should block banned user', () => {
    const actions: ModerationAction[] = [
      { action_type: 'ban', reason: 'Violation', created_at: new Date().toISOString() },
    ];
    const result = checkModerationStatus(actions);
    expect(result.allowed).toBe(false);
    expect(result.actionType).toBe('ban');
    expect(result.error).toContain('banned');
  });

  it('should block user with active suspension', () => {
    const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const actions: ModerationAction[] = [
      { action_type: 'suspension', reason: 'Temp ban', expires_at: futureDate, created_at: new Date().toISOString() },
    ];
    const result = checkModerationStatus(actions);
    expect(result.allowed).toBe(false);
    expect(result.actionType).toBe('suspension');
    expect(result.expiresAt).toBe(futureDate);
  });

  it('should allow user with expired suspension', () => {
    const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const actions: ModerationAction[] = [
      { action_type: 'suspension', reason: 'Past', expires_at: pastDate, created_at: new Date().toISOString() },
    ];
    expect(checkModerationStatus(actions).allowed).toBe(true);
  });

  it('should allow user with only warnings', () => {
    const actions: ModerationAction[] = [
      { action_type: 'warning', reason: 'Minor issue', created_at: new Date().toISOString() },
    ];
    expect(checkModerationStatus(actions).allowed).toBe(true);
  });

  it('should prioritize ban over suspension', () => {
    const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const actions: ModerationAction[] = [
      { action_type: 'suspension', reason: 'Suspension', expires_at: futureDate, created_at: new Date().toISOString() },
      { action_type: 'ban', reason: 'Ban', created_at: new Date().toISOString() },
    ];
    const result = checkModerationStatus(actions);
    expect(result.actionType).toBe('ban');
  });
});

describe('isSuspensionExpired', () => {
  it('should return true for null/undefined', () => {
    expect(isSuspensionExpired(null)).toBe(true);
    expect(isSuspensionExpired(undefined)).toBe(true);
  });

  it('should return true for past date', () => {
    const pastDate = new Date(Date.now() - 1000).toISOString();
    expect(isSuspensionExpired(pastDate)).toBe(true);
  });

  it('should return false for future date', () => {
    const futureDate = new Date(Date.now() + 60000).toISOString();
    expect(isSuspensionExpired(futureDate)).toBe(false);
  });
});

describe('formatModerationError', () => {
  it('should return empty for allowed result', () => {
    expect(formatModerationError({ allowed: true }, 'support@test.com')).toBe('');
  });

  it('should include support email', () => {
    const result = formatModerationError(
      { allowed: false, error: 'Banned' },
      'support@krewup.net'
    );
    expect(result).toContain('support@krewup.net');
    expect(result).toContain('appeal');
  });

  it('should include original error message', () => {
    const result = formatModerationError(
      { allowed: false, error: 'Your account has been banned' },
      'support@test.com'
    );
    expect(result).toContain('banned');
  });
});
