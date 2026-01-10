import { describe, it, expect } from 'vitest';
import {
  validateProfileInput,
  validateName,
  validatePhone,
  validateEmail,
  validateBio,
  validateLocation,
  validateTrade,
  validateSubTrade,
  validateEmployerType,
  validateCompanyName,
  validateCoordinates,
  validateToolsOwned,
  parseNameParts,
  formatPhoneNumber,
  sanitizeEmail,
  sanitizeToolsOwned,
  buildProfileUpdateRecord,
  calculateWorkerProfileCompleteness,
  MAX_NAME_LENGTH,
  MAX_BIO_LENGTH,
  MAX_LOCATION_LENGTH,
  MAX_TOOLS,
  type ProfileInput,
} from './profile-service';

// ============================================================================
// validateProfileInput Tests
// ============================================================================

describe('validateProfileInput', () => {
  it('should return valid for complete input', () => {
    const input: ProfileInput = {
      name: 'John Doe',
      phone: '(555) 123-4567',
      email: 'john@example.com',
      location: 'Austin, TX',
      bio: 'Experienced electrician',
      trade: 'Electricians',
      employerType: 'contractor',
    };
    expect(validateProfileInput(input).valid).toBe(true);
  });

  it('should return valid for minimal input', () => {
    expect(validateProfileInput({}).valid).toBe(true);
  });

  it('should validate each field if provided', () => {
    const input: ProfileInput = { name: '' };
    const result = validateProfileInput(input);
    expect(result.valid).toBe(false);
    expect(result.field).toBe('name');
  });
});

// ============================================================================
// validateName Tests
// ============================================================================

describe('validateName', () => {
  it('should return valid for valid name', () => {
    expect(validateName('John Doe').valid).toBe(true);
  });

  it('should reject empty name', () => {
    expect(validateName('').valid).toBe(false);
    expect(validateName('   ').valid).toBe(false);
  });

  it('should reject undefined name', () => {
    expect(validateName(undefined).valid).toBe(false);
  });

  it('should reject name too long', () => {
    const longName = 'A'.repeat(MAX_NAME_LENGTH + 1);
    const result = validateName(longName);
    expect(result.valid).toBe(false);
    expect(result.error).toContain(`${MAX_NAME_LENGTH}`);
  });

  it('should accept name at max length', () => {
    const name = 'A'.repeat(MAX_NAME_LENGTH);
    expect(validateName(name).valid).toBe(true);
  });
});

// ============================================================================
// validatePhone Tests
// ============================================================================

describe('validatePhone', () => {
  it('should return valid for properly formatted phone', () => {
    expect(validatePhone('(555) 123-4567').valid).toBe(true);
  });

  it('should return valid for empty phone (optional)', () => {
    expect(validatePhone('').valid).toBe(true);
  });

  it('should reject improperly formatted phone', () => {
    expect(validatePhone('555-123-4567').valid).toBe(false);
    expect(validatePhone('5551234567').valid).toBe(false);
    expect(validatePhone('(555)123-4567').valid).toBe(false);
  });

  it('should show format hint in error', () => {
    const result = validatePhone('invalid');
    expect(result.error).toContain('(XXX) XXX-XXXX');
  });
});

// ============================================================================
// validateEmail Tests
// ============================================================================

describe('validateEmail', () => {
  it('should return valid for valid email', () => {
    expect(validateEmail('test@example.com').valid).toBe(true);
    expect(validateEmail('user.name@domain.co.uk').valid).toBe(true);
  });

  it('should reject empty email', () => {
    expect(validateEmail('').valid).toBe(false);
    expect(validateEmail(undefined).valid).toBe(false);
  });

  it('should reject invalid email formats', () => {
    expect(validateEmail('invalid').valid).toBe(false);
    expect(validateEmail('no@domain').valid).toBe(false);
    expect(validateEmail('@nodomain.com').valid).toBe(false);
  });
});

// ============================================================================
// validateBio Tests
// ============================================================================

describe('validateBio', () => {
  it('should return valid for short bio', () => {
    expect(validateBio('Experienced worker').valid).toBe(true);
  });

  it('should return valid for empty bio', () => {
    expect(validateBio('').valid).toBe(true);
  });

  it('should reject bio too long', () => {
    const longBio = 'A'.repeat(MAX_BIO_LENGTH + 1);
    const result = validateBio(longBio);
    expect(result.valid).toBe(false);
    expect(result.error).toContain(`${MAX_BIO_LENGTH}`);
  });
});

// ============================================================================
// validateLocation Tests
// ============================================================================

describe('validateLocation', () => {
  it('should return valid for valid location', () => {
    expect(validateLocation('Austin, TX').valid).toBe(true);
  });

  it('should reject empty location', () => {
    expect(validateLocation('').valid).toBe(false);
    expect(validateLocation('   ').valid).toBe(false);
  });

  it('should reject location too long', () => {
    const longLocation = 'A'.repeat(MAX_LOCATION_LENGTH + 1);
    expect(validateLocation(longLocation).valid).toBe(false);
  });
});

// ============================================================================
// validateTrade Tests
// ============================================================================

describe('validateTrade', () => {
  it('should return valid for valid trades', () => {
    expect(validateTrade('Electricians').valid).toBe(true);
    expect(validateTrade('Plumbers & Pipefitters').valid).toBe(true);
    expect(validateTrade('Carpenters (Rough)').valid).toBe(true);
  });

  it('should reject empty trade', () => {
    expect(validateTrade('').valid).toBe(false);
  });

  it('should reject invalid trade', () => {
    const result = validateTrade('Invalid Trade');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Invalid trade');
  });
});

// ============================================================================
// validateSubTrade Tests
// ============================================================================

describe('validateSubTrade', () => {
  it('should return valid for matching sub-trade', () => {
    expect(validateSubTrade('Inside Wireman (Commercial)', 'Electricians').valid).toBe(true);
  });

  it('should reject sub-trade for wrong trade', () => {
    const result = validateSubTrade('Inside Wireman (Commercial)', 'Plumbers & Pipefitters');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Invalid sub-trade');
  });

  it('should reject invalid parent trade', () => {
    const result = validateSubTrade('Something', 'Invalid Trade');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('No sub-trades');
  });
});

// ============================================================================
// validateEmployerType Tests
// ============================================================================

describe('validateEmployerType', () => {
  it('should return valid for valid types', () => {
    expect(validateEmployerType('contractor').valid).toBe(true);
    expect(validateEmployerType('recruiter').valid).toBe(true);
    expect(validateEmployerType('developer').valid).toBe(true);
    expect(validateEmployerType('homeowner').valid).toBe(true);
  });

  it('should reject invalid type', () => {
    const result = validateEmployerType('invalid');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Invalid employer type');
  });
});

// ============================================================================
// validateCoordinates Tests
// ============================================================================

describe('validateCoordinates', () => {
  it('should return valid for null/undefined', () => {
    expect(validateCoordinates(null).valid).toBe(true);
    expect(validateCoordinates(undefined).valid).toBe(true);
  });

  it('should return valid for valid coords', () => {
    expect(validateCoordinates({ lat: 30.2672, lng: -97.7431 }).valid).toBe(true);
  });

  it('should reject out of range latitude', () => {
    expect(validateCoordinates({ lat: 91, lng: 0 }).valid).toBe(false);
    expect(validateCoordinates({ lat: -91, lng: 0 }).valid).toBe(false);
  });

  it('should reject out of range longitude', () => {
    expect(validateCoordinates({ lat: 0, lng: 181 }).valid).toBe(false);
    expect(validateCoordinates({ lat: 0, lng: -181 }).valid).toBe(false);
  });

  it('should reject NaN values', () => {
    expect(validateCoordinates({ lat: NaN, lng: 0 }).valid).toBe(false);
  });
});

// ============================================================================
// validateToolsOwned Tests
// ============================================================================

describe('validateToolsOwned', () => {
  it('should return valid for valid tools array', () => {
    expect(validateToolsOwned(['Hammer', 'Drill']).valid).toBe(true);
  });

  it('should return valid for empty array', () => {
    expect(validateToolsOwned([]).valid).toBe(true);
  });

  it('should reject too many tools', () => {
    const tools = Array(MAX_TOOLS + 1).fill('Tool');
    const result = validateToolsOwned(tools);
    expect(result.valid).toBe(false);
    expect(result.error).toContain(`${MAX_TOOLS}`);
  });

  it('should reject non-array', () => {
    expect(validateToolsOwned('hammer' as unknown as string[]).valid).toBe(false);
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

  it('should handle single name', () => {
    const result = parseNameParts('John');
    expect(result.firstName).toBe('John');
    expect(result.lastName).toBe('');
  });

  it('should handle multiple last names', () => {
    const result = parseNameParts('John Van Der Berg');
    expect(result.firstName).toBe('John');
    expect(result.lastName).toBe('Van Der Berg');
  });

  it('should handle empty string', () => {
    const result = parseNameParts('');
    expect(result.firstName).toBe('');
    expect(result.lastName).toBe('');
  });

  it('should trim whitespace', () => {
    const result = parseNameParts('  John   Doe  ');
    expect(result.firstName).toBe('John');
    expect(result.lastName).toBe('Doe');
  });
});

// ============================================================================
// formatPhoneNumber Tests
// ============================================================================

describe('formatPhoneNumber', () => {
  it('should format 10 digit number', () => {
    expect(formatPhoneNumber('5551234567')).toBe('(555) 123-4567');
  });

  it('should strip non-digits and format', () => {
    expect(formatPhoneNumber('555-123-4567')).toBe('(555) 123-4567');
    expect(formatPhoneNumber('(555) 123-4567')).toBe('(555) 123-4567');
    expect(formatPhoneNumber('555.123.4567')).toBe('(555) 123-4567');
  });

  it('should return empty for invalid length', () => {
    expect(formatPhoneNumber('123')).toBe('');
    expect(formatPhoneNumber('12345678901')).toBe('');
  });

  it('should return empty for non-numeric', () => {
    expect(formatPhoneNumber('abcdefghij')).toBe('');
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
// sanitizeToolsOwned Tests
// ============================================================================

describe('sanitizeToolsOwned', () => {
  it('should trim whitespace', () => {
    const result = sanitizeToolsOwned(['  Hammer  ', '  Drill  ']);
    expect(result).toEqual(['Hammer', 'Drill']);
  });

  it('should remove empty strings', () => {
    const result = sanitizeToolsOwned(['Hammer', '', '   ', 'Drill']);
    expect(result).toEqual(['Hammer', 'Drill']);
  });

  it('should remove duplicates', () => {
    const result = sanitizeToolsOwned(['Hammer', 'Drill', 'Hammer']);
    expect(result).toEqual(['Hammer', 'Drill']);
  });
});

// ============================================================================
// buildProfileUpdateRecord Tests
// ============================================================================

describe('buildProfileUpdateRecord', () => {
  it('should build record with name parts', () => {
    const record = buildProfileUpdateRecord({ name: 'John Doe' });
    expect(record.first_name).toBe('John');
    expect(record.last_name).toBe('Doe');
  });

  it('should include only provided fields', () => {
    const record = buildProfileUpdateRecord({ bio: 'Test bio' });
    expect(record.bio).toBe('Test bio');
    expect(record.first_name).toBeUndefined();
    expect(record.phone).toBeUndefined();
  });

  it('should sanitize email', () => {
    const record = buildProfileUpdateRecord({ email: 'TEST@EXAMPLE.COM' });
    expect(record.email).toBe('test@example.com');
  });

  it('should trim location', () => {
    const record = buildProfileUpdateRecord({ location: '  Austin, TX  ' });
    expect(record.location).toBe('Austin, TX');
  });
});

// ============================================================================
// calculateWorkerProfileCompleteness Tests
// ============================================================================

describe('calculateWorkerProfileCompleteness', () => {
  it('should return 100% for complete profile', () => {
    const profile = {
      first_name: 'John',
      last_name: 'Doe',
      phone: '(555) 123-4567',
      location: 'Austin, TX',
      bio: 'Experienced worker',
      trade: 'Electricians',
      profile_image_url: 'https://example.com/image.jpg',
    };
    const result = calculateWorkerProfileCompleteness(profile);
    expect(result.isComplete).toBe(true);
    expect(result.percentage).toBe(100);
    expect(result.missingFields).toHaveLength(0);
  });

  it('should return 0% for empty profile', () => {
    const result = calculateWorkerProfileCompleteness({});
    expect(result.isComplete).toBe(false);
    expect(result.percentage).toBe(0);
    expect(result.missingFields.length).toBeGreaterThan(0);
  });

  it('should identify missing fields', () => {
    const profile = {
      first_name: 'John',
      phone: '(555) 123-4567',
    };
    const result = calculateWorkerProfileCompleteness(profile);
    expect(result.missingFields).toContain('Location');
    expect(result.missingFields).toContain('Bio');
    expect(result.missingFields).toContain('Trade');
    expect(result.missingFields).not.toContain('Name');
    expect(result.missingFields).not.toContain('Phone');
  });

  it('should handle null values', () => {
    const profile = {
      first_name: 'John',
      bio: null,
      trade: null,
    };
    const result = calculateWorkerProfileCompleteness(profile);
    expect(result.missingFields).toContain('Bio');
    expect(result.missingFields).toContain('Trade');
  });
});
