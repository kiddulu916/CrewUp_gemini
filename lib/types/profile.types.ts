// Profile and related table types - matching database schema with mapped fields for UI

export interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string | null;
  role: 'worker' | 'employer';
  employer_type?: 'contractor' | 'developer' | 'homeowner' | 'recruiter' | null;
  location: string;
  geo_coords?: { x: number; y: number } | null; // PostGIS point
  bio?: string | null;
  profile_image_url?: string | null;
  subscription_status: 'free' | 'pro';
  is_admin: boolean;
  is_lifetime_pro: boolean;
  lifetime_pro_granted_at?: string | null;
  created_at: string;
  updated_at: string;
}

// Combined profile with data from workers/contractors tables
export interface ProfileWithWorkerData extends Profile {
  name: string; // Computed: first_name + last_name
  trade?: string | null;
  sub_trade?: string | null;
  years_of_experience?: number | null;
  hourly_rate?: number | null;
  union_status?: string | null;
  trade_skills?: string[] | null;
  has_tools?: boolean;
  tools_owned?: string[] | null;
  has_certifications?: boolean;
  has_portfolio?: boolean;
  is_profile_boosted?: boolean;
  boost_expires_at?: string | null;
  has_dl?: boolean;
  dl_class?: 'A' | 'B' | 'C' | 'CDL' | null;
  reliable_transportation?: boolean;
  authorized_to_work?: boolean;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
  emergency_contact_relationship?: string | null;
  company_name?: string | null; // From contractors table
}

// Work Experience - DB columns + mapped fields for UI compatibility
export interface WorkExperience {
  id: string;
  user_id: string;
  // DB columns
  company: string;
  job_title: string;
  description?: string | null;
  start_date: string;
  end_date?: string | null;
  is_current: boolean;
  is_verified: boolean;
  endorsement_count: number;
  created_at: string;
  // Mapped fields for backward compatibility
  company_name?: string; // Mapped from 'company'
  responsibilities?: string; // Used by application wizard, maps to 'description'
  reason_for_leaving?: string; // Optional field in forms
}

// Education - DB columns + mapped fields for UI compatibility
export interface Education {
  id: string;
  user_id: string;
  // DB columns
  institution: string;
  degree?: string | null;
  field_of_study?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  // Mapped fields for backward compatibility
  institution_name?: string; // Mapped from 'institution'
  degree_type?: string | null; // Mapped from 'degree'
  graduation_year?: number | null; // Computed from 'end_date'
  is_currently_enrolled?: boolean; // Used by application wizard
}

export interface ProfessionalReference {
  id: string;
  user_id: string;
  name: string;
  company?: string | null;
  phone?: string | null;
  email?: string | null;
  relationship: string;
  created_at: string;
}

// Certification - DB columns + mapped fields for UI compatibility
export interface Certification {
  id: string;
  // DB columns
  worker_id: string;
  name: string;
  issuing_organization: string;
  credential_id?: string | null;
  issue_date?: string | null;
  expiration_date?: string | null;
  image_url?: string | null;
  verification_status: 'pending' | 'verified' | 'rejected';
  rejection_reason?: string | null;
  created_at: string;
  updated_at: string;
  // Mapped fields for UI compatibility
  user_id?: string; // Alias for worker_id in some contexts
  certification_type?: string; // Mapped from 'name'
  credential_category?: 'license' | 'certification'; // UI categorization
  is_verified?: boolean; // Computed from verification_status
  expires_at?: string | null; // Alias for expiration_date
}

export interface License {
  id: string;
  contractor_id: string;
  license_number: string;
  classification?: string | null;
  issuing_state?: string | null;
  issue_date?: string | null;
  expiration_date?: string | null;
  image_url?: string | null;
  verification_status: 'pending' | 'verified' | 'rejected';
  rejection_reason?: string | null;
  created_at: string;
  updated_at: string;
  // Mapped fields for UI compatibility
  certification_type?: string; // Mapped from 'classification'
  credential_category?: 'license' | 'certification'; // UI categorization
}

export interface PortfolioImage {
  id: string;
  user_id: string;
  image_url: string;
  description?: string | null;
  display_order: number;
  created_at: string;
}

// Profile with all related data (for application auto-fill)
export interface ProfileWithRelations {
  profile: ProfileWithWorkerData;
  workExperience: WorkExperience[];
  education: Education[];
  professionalReferences: ProfessionalReference[];
  certifications: Certification[];
}
