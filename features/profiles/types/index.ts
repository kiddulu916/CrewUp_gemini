export type User = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string | null;
  role: 'worker' | 'employer';
  employer_type?: 'contractor' | 'developer' | 'homeowner' | 'recruiter' | null;
  location: string;
  geo_coords?: any;
  bio?: string | null;
  profile_image_url?: string | null;
  subscription_status: 'free' | 'pro';
  is_admin: boolean;
  is_lifetime_pro: boolean;
  lifetime_pro_granted_at?: string | null;
  created_at: string;
  updated_at: string;
};

export type PublicProfile = User & {
  // Computed or joined fields
  name: string;
  trade?: string | null;
  sub_trade?: string | null;
  company_name?: string | null;
  years_of_experience?: number | null;
  has_tools?: boolean;
  tools_owned?: string[] | null;
  trade_skills?: string[] | null;
};

export type PortfolioImage = {
  id: string;
  user_id: string;
  image_url: string;
  description?: string | null;
  display_order: number;
  created_at: string;
};

// Work Experience - DB columns (component uses 'company' directly now)
export type WorkExperience = {
  id: string;
  user_id: string;
  company: string; // DB column
  job_title: string;
  description?: string | null;
  start_date: string;
  end_date?: string | null;
  is_current: boolean;
  is_verified: boolean;
  endorsement_count: number;
  created_at: string;
};

// Education - DB columns
export type Education = {
  id: string;
  user_id: string;
  institution: string; // DB column
  degree?: string | null; // DB column
  field_of_study?: string | null;
  start_date?: string | null;
  end_date?: string | null;
};

// Certification - DB columns + mapped fields for UI
export type Certification = {
  id: string;
  worker_id: string; // DB column
  name: string; // DB column
  issuing_organization: string;
  credential_id?: string | null;
  issue_date?: string | null;
  expiration_date?: string | null;
  image_url?: string | null;
  verification_status: 'pending' | 'verified' | 'rejected';
  rejection_reason?: string | null;
  created_at: string;
  updated_at: string;
  // Mapped fields for UI
  certification_type?: string; // Mapped from 'name'
  credential_category?: 'license' | 'certification'; // UI categorization
};

export type Reference = {
  id: string;
  user_id: string;
  name: string;
  relationship: string;
  company?: string | null;
  phone?: string | null;
  email?: string | null;
  created_at: string;
};
