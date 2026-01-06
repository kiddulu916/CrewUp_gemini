/**
 * Central type definitions for KrewUp
 *
 * This file exports common types used across the application.
 * Feature-specific types should be defined in their respective feature directories.
 */

// * Re-export subscription types
export * from './subscription';

// * Common user-related types
export type UserRole = 'worker' | 'employer';

export type EmployerType = 'contractor' | 'developer' | 'homeowner' | 'recruiter';

export type SubscriptionTier = 'free' | 'pro';

/**
 * Base user interface matching database schema
 */
export interface BaseUser {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string | null;
  role: UserRole;
  employer_type?: EmployerType | null;
  location: string;
  bio?: string | null;
  profile_image_url?: string | null;
  subscription_status: SubscriptionTier;
  is_admin: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Standard API response shape for server actions
 */
export type ActionResponse<T = void> = {
  success: boolean;
  error?: string;
  data?: T;
};

/**
 * Pagination parameters
 */
export interface PaginationParams {
  page?: number;
  limit?: number;
  cursor?: string;
}

/**
 * Paginated response wrapper
 */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

/**
 * Common status types
 */
export type VerificationStatus = 'pending' | 'verified' | 'rejected';

export type ApplicationStatus = 'pending' | 'reviewed' | 'accepted' | 'rejected' | 'withdrawn';

export type JobStatus = 'draft' | 'open' | 'paused' | 'closed' | 'filled';

export type ModerationActionType = 'warning' | 'suspension' | 'ban';

export type ReportStatus = 'pending' | 'actioned' | 'dismissed' | 'reviewed';

/**
 * Coordinate type for PostGIS geometry
 */
export interface GeoCoords {
  lat: number;
  lng: number;
}

