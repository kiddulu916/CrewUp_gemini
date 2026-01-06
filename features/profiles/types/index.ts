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
  // Legacy support or joined fields
  name: string;
  trade?: string | null;
  sub_trade?: string | null;
  company_name?: string | null;
  years_of_experience?: number | null;
  has_tools?: boolean;
  tools_owned?: string[] | null;
  skills?: string[] | null;
};

export type PortfolioImage = {
  id: string;
  user_id: string;
  image_url: string;
  description?: string | null;
  display_order: number;
  created_at: string;
};

export type WorkExperience = {
  id: string;
  user_id: string;
  company: string;
  job_title: string;
  description?: string | null;
  start_date: string;
  end_date?: string | null;
  is_current: boolean;
  is_verified: boolean;
  endorsement_count: number;
  created_at: string;
};

export type Education = {
  id: string;
  user_id: string;
  institution: string;
  degree?: string | null;
  field_of_study?: string | null;
  start_date?: string | null;
  end_date?: string | null;
};

export type Certification = {
  id: string;
  user_id: string;
  credential_category: 'license' | 'certification';
  certification_type: string;
  certification_number?: string | null;
  issued_by?: string | null;
  issuing_state?: string | null;
  issue_date?: string | null;
  expires_at?: string | null;
  image_url?: string | null;
  verification_status: 'pending' | 'verified' | 'rejected';
  created_at: string;
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
