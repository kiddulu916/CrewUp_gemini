// Profile and related table types

export interface Profile {
  id: string;
  name: string;
  role: 'worker' | 'employer';
  employer_type?: 'contractor' | 'recruiter';
  subscription_status: 'free' | 'pro';
  subscription_id?: string;
  trade: string;
  sub_trade?: string;
  location: string;
  coords?: { x: number; y: number }; // PostGIS point
  bio?: string;
  phone?: string;
  email: string;
  profile_image_url?: string;
  is_profile_boosted: boolean;
  boost_expires_at?: string;

  // Address fields (for application auto-fill)
  address_street?: string;
  address_city?: string;
  address_state?: string;
  address_zip_code?: string;

  // Work authorization (for application auto-fill)
  authorized_to_work: boolean;
  has_drivers_license: boolean;
  license_class?: 'A' | 'B' | 'C';
  has_reliable_transportation: boolean;

  // Skills (for application auto-fill)
  years_of_experience: number;
  trade_skills: string[];

  // Emergency contact (for application auto-fill)
  emergency_contact_name?: string;
  emergency_contact_relationship?: string;
  emergency_contact_phone?: string;

  created_at: string;
  updated_at: string;
}

export interface WorkExperience {
  id: string;
  user_id: string;
  job_title: string;
  company_name: string;
  description?: string;
  start_date: string; // DATE
  end_date?: string; // DATE
  responsibilities?: string;
  reason_for_leaving?: string;
  is_current: boolean;
  created_at: string;
}

export interface Education {
  id: string;
  user_id: string;
  institution_name: string;
  degree_type: string;
  field_of_study: string;
  graduation_year: number;
  is_currently_enrolled: boolean;
  created_at: string;
}

export interface ProfessionalReference {
  id: string;
  user_id: string;
  name: string;
  company: string;
  phone: string;
  email: string;
  relationship: string;
  created_at: string;
}

export interface Certification {
  id: string;
  user_id: string;
  credential_category: 'license' | 'certification';
  name: string; // Certification type/name
  certification_number?: string;
  issuer?: string;
  issued_by?: string;
  issue_date?: string;
  expiry_date?: string;
  credential_id?: string;
  credential_url?: string;
  photo_url?: string;
  verification_status?: 'pending' | 'verified' | 'rejected';
  verified_at?: string;
  verified_by?: string;
  rejection_reason?: string;
  verification_notes?: string;
  created_at: string;
  updated_at?: string;

  // Legacy field mapping
  certification_type?: string; // Maps to 'name' for backwards compatibility
  image_url?: string; // Maps to 'photo_url' for backwards compatibility
  is_verified?: boolean; // Computed from verification_status
}

// Profile with all related data (for application auto-fill)
export interface ProfileWithRelations {
  profile: Profile;
  workExperience: WorkExperience[];
  education: Education[];
  professionalReferences: ProfessionalReference[];
  certifications: Certification[];
}
