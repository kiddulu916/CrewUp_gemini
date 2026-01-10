/**
 * Profile Service - Pure business logic for user profiles.
 *
 * This module contains testable pure functions for profile validation
 * and data transformation. No Server Action dependencies.
 */

import { TRADES, TRADE_SUBCATEGORIES, EMPLOYER_TYPES } from '@/lib/constants';
import type { Trade, EmployerType } from '@/lib/constants';

// ============================================================================
// Types
// ============================================================================

export type ProfileInput = {
  name?: string;
  phone?: string | null;
  email?: string;
  location?: string;
  bio?: string | null;
  trade?: string;
  subTrade?: string | null;
  employerType?: string | null;
  companyName?: string | null;
};

export type Coordinates = {
  lat: number;
  lng: number;
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

// ============================================================================
// Constants
// ============================================================================

export const MAX_NAME_LENGTH = 100;
export const MAX_BIO_LENGTH = 500;
export const MAX_LOCATION_LENGTH = 200;
export const MAX_COMPANY_NAME_LENGTH = 100;
export const MAX_TOOLS = 100;
export const MAX_TOOL_NAME_LENGTH = 100;

// Phone regex: (XXX) XXX-XXXX
export const PHONE_REGEX = /^\(\d{3}\) \d{3}-\d{4}$/;
// Email regex (basic)
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validates profile input data.
 * @param input - The profile input to validate
 * @returns ValidationResult
 */
export function validateProfileInput(input: ProfileInput): ValidationResult {
  // Name validation
  if (input.name !== undefined) {
    const nameResult = validateName(input.name);
    if (!nameResult.valid) return nameResult;
  }

  // Phone validation
  if (input.phone !== undefined && input.phone !== null) {
    const phoneResult = validatePhone(input.phone);
    if (!phoneResult.valid) return phoneResult;
  }

  // Email validation
  if (input.email !== undefined) {
    const emailResult = validateEmail(input.email);
    if (!emailResult.valid) return emailResult;
  }

  // Bio validation
  if (input.bio !== undefined && input.bio !== null) {
    const bioResult = validateBio(input.bio);
    if (!bioResult.valid) return bioResult;
  }

  // Location validation
  if (input.location !== undefined) {
    const locationResult = validateLocation(input.location);
    if (!locationResult.valid) return locationResult;
  }

  // Trade validation
  if (input.trade !== undefined) {
    const tradeResult = validateTrade(input.trade);
    if (!tradeResult.valid) return tradeResult;
  }

  // Sub-trade validation (must match parent trade)
  if (input.subTrade !== undefined && input.subTrade !== null && input.trade) {
    const subTradeResult = validateSubTrade(input.subTrade, input.trade);
    if (!subTradeResult.valid) return subTradeResult;
  }

  // Employer type validation
  if (input.employerType !== undefined && input.employerType !== null) {
    const employerTypeResult = validateEmployerType(input.employerType);
    if (!employerTypeResult.valid) return employerTypeResult;
  }

  // Company name validation
  if (input.companyName !== undefined && input.companyName !== null) {
    const companyResult = validateCompanyName(input.companyName);
    if (!companyResult.valid) return companyResult;
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

  if (name.trim().length > MAX_NAME_LENGTH) {
    return {
      valid: false,
      error: `Name must be less than ${MAX_NAME_LENGTH} characters`,
      field: 'name',
    };
  }

  return { valid: true };
}

/**
 * Validates a phone number.
 * @param phone - The phone number to validate
 * @returns ValidationResult
 */
export function validatePhone(phone: string): ValidationResult {
  if (!phone || phone.trim().length === 0) {
    return { valid: true }; // Phone is optional
  }

  if (!PHONE_REGEX.test(phone)) {
    return {
      valid: false,
      error: 'Phone must be in (XXX) XXX-XXXX format',
      field: 'phone',
    };
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

  if (!EMAIL_REGEX.test(email)) {
    return { valid: false, error: 'Invalid email format', field: 'email' };
  }

  return { valid: true };
}

/**
 * Validates a bio field.
 * @param bio - The bio to validate
 * @returns ValidationResult
 */
export function validateBio(bio: string): ValidationResult {
  if (bio.length > MAX_BIO_LENGTH) {
    return {
      valid: false,
      error: `Bio must be less than ${MAX_BIO_LENGTH} characters`,
      field: 'bio',
    };
  }

  return { valid: true };
}

/**
 * Validates a location field.
 * @param location - The location to validate
 * @returns ValidationResult
 */
export function validateLocation(location: string): ValidationResult {
  if (!location || location.trim().length === 0) {
    return { valid: false, error: 'Location is required', field: 'location' };
  }

  if (location.length > MAX_LOCATION_LENGTH) {
    return {
      valid: false,
      error: `Location must be less than ${MAX_LOCATION_LENGTH} characters`,
      field: 'location',
    };
  }

  return { valid: true };
}

/**
 * Validates a trade selection.
 * @param trade - The trade to validate
 * @returns ValidationResult
 */
export function validateTrade(trade: string): ValidationResult {
  if (!trade || trade.trim().length === 0) {
    return { valid: false, error: 'Trade is required', field: 'trade' };
  }

  if (!TRADES.includes(trade as Trade)) {
    return { valid: false, error: `Invalid trade: ${trade}`, field: 'trade' };
  }

  return { valid: true };
}

/**
 * Validates a sub-trade against its parent trade.
 * @param subTrade - The sub-trade to validate
 * @param trade - The parent trade
 * @returns ValidationResult
 */
export function validateSubTrade(subTrade: string, trade: string): ValidationResult {
  const validSubTrades = TRADE_SUBCATEGORIES[trade];

  if (!validSubTrades) {
    return { valid: false, error: `No sub-trades for trade: ${trade}`, field: 'subTrade' };
  }

  if (!validSubTrades.includes(subTrade as any)) {
    return {
      valid: false,
      error: `Invalid sub-trade "${subTrade}" for trade "${trade}"`,
      field: 'subTrade',
    };
  }

  return { valid: true };
}

/**
 * Validates an employer type.
 * @param employerType - The employer type to validate
 * @returns ValidationResult
 */
export function validateEmployerType(employerType: string): ValidationResult {
  if (!EMPLOYER_TYPES.includes(employerType as EmployerType)) {
    return {
      valid: false,
      error: `Invalid employer type: ${employerType}`,
      field: 'employerType',
    };
  }

  return { valid: true };
}

/**
 * Validates a company name.
 * @param companyName - The company name to validate
 * @returns ValidationResult
 */
export function validateCompanyName(companyName: string): ValidationResult {
  if (companyName.length > MAX_COMPANY_NAME_LENGTH) {
    return {
      valid: false,
      error: `Company name must be less than ${MAX_COMPANY_NAME_LENGTH} characters`,
      field: 'companyName',
    };
  }

  return { valid: true };
}

/**
 * Validates coordinates.
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
 * Validates tools owned array.
 * @param tools - Array of tool names
 * @returns ValidationResult
 */
export function validateToolsOwned(tools: string[]): ValidationResult {
  if (!Array.isArray(tools)) {
    return { valid: false, error: 'Tools must be an array', field: 'toolsOwned' };
  }

  if (tools.length > MAX_TOOLS) {
    return {
      valid: false,
      error: `Cannot have more than ${MAX_TOOLS} tools`,
      field: 'toolsOwned',
    };
  }

  for (const tool of tools) {
    if (typeof tool !== 'string') {
      return { valid: false, error: 'Each tool must be a string', field: 'toolsOwned' };
    }
    if (tool.trim().length > MAX_TOOL_NAME_LENGTH) {
      return {
        valid: false,
        error: `Tool name too long (max ${MAX_TOOL_NAME_LENGTH} characters)`,
        field: 'toolsOwned',
      };
    }
  }

  return { valid: true };
}

// ============================================================================
// Data Transformation Functions
// ============================================================================

/**
 * Parses a full name into first and last name parts.
 * @param fullName - The full name to parse
 * @returns NameParts with firstName and lastName
 */
export function parseNameParts(fullName: string): NameParts {
  const trimmed = fullName.trim();
  const parts = trimmed.split(/\s+/);

  if (parts.length === 0 || (parts.length === 1 && parts[0] === '')) {
    return { firstName: '', lastName: '' };
  }

  const firstName = parts[0];
  const lastName = parts.slice(1).join(' ');

  return { firstName, lastName };
}

/**
 * Formats a phone number to (XXX) XXX-XXXX format.
 * @param phone - Raw phone number input
 * @returns Formatted phone number or empty string if invalid
 */
export function formatPhoneNumber(phone: string): string {
  // Remove all non-digits
  const digits = phone.replace(/\D/g, '');

  // Must have exactly 10 digits
  if (digits.length !== 10) {
    return '';
  }

  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

/**
 * Sanitizes an email address (lowercase, trim).
 * @param email - Raw email input
 * @returns Sanitized email
 */
export function sanitizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Sanitizes tools array by trimming, removing empty, and deduplicating.
 * @param tools - Raw tools array
 * @returns Sanitized unique tools array
 */
export function sanitizeToolsOwned(tools: string[]): string[] {
  const sanitized = tools
    .map((tool) => tool.trim())
    .filter((tool) => tool.length > 0 && tool.length <= MAX_TOOL_NAME_LENGTH);

  return [...new Set(sanitized)];
}

/**
 * Builds a profile update record from input.
 * @param input - Profile input
 * @returns Record for database update
 */
export function buildProfileUpdateRecord(input: ProfileInput): Record<string, unknown> {
  const record: Record<string, unknown> = {};

  if (input.name !== undefined) {
    const { firstName, lastName } = parseNameParts(input.name);
    record.first_name = firstName;
    record.last_name = lastName;
  }

  if (input.phone !== undefined) {
    record.phone = input.phone;
  }

  if (input.email !== undefined) {
    record.email = sanitizeEmail(input.email);
  }

  if (input.location !== undefined) {
    record.location = input.location.trim();
  }

  if (input.bio !== undefined) {
    record.bio = input.bio?.trim() || null;
  }

  if (input.employerType !== undefined) {
    record.employer_type = input.employerType;
  }

  return record;
}

// ============================================================================
// Profile Completeness
// ============================================================================

export type ProfileCompletenessResult = {
  isComplete: boolean;
  percentage: number;
  missingFields: string[];
};

/**
 * Calculates profile completeness for workers.
 * @param profile - Profile data
 * @returns Completeness result
 */
export function calculateWorkerProfileCompleteness(profile: {
  first_name?: string | null;
  last_name?: string | null;
  phone?: string | null;
  location?: string | null;
  bio?: string | null;
  trade?: string | null;
  profile_image_url?: string | null;
}): ProfileCompletenessResult {
  const fields = [
    { name: 'Name', value: profile.first_name },
    { name: 'Phone', value: profile.phone },
    { name: 'Location', value: profile.location },
    { name: 'Bio', value: profile.bio },
    { name: 'Trade', value: profile.trade },
    { name: 'Profile Photo', value: profile.profile_image_url },
  ];

  const completedFields = fields.filter((f) => f.value && String(f.value).trim().length > 0);
  const missingFields = fields.filter((f) => !f.value || String(f.value).trim().length === 0).map((f) => f.name);

  const percentage = Math.round((completedFields.length / fields.length) * 100);

  return {
    isComplete: missingFields.length === 0,
    percentage,
    missingFields,
  };
}
