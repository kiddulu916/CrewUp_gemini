export interface ApplicationFormData {
  // Step 1: Documents (URLs stored separately)
  coverLetterText?: string;

  // Step 2: Personal Information
  fullName: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
  };

  // Step 3: Contact & Availability
  phoneNumber: string;
  availableStartDate: string; // ISO date

  // Step 4: Work Authorization
  authorizedToWork: boolean;
  hasDriversLicense: boolean;
  licenseClass?: 'A' | 'B' | 'C';
  hasReliableTransportation: boolean;

  // Step 5: Work History
  workHistory: WorkHistoryEntry[];

  // Step 6: Education
  education: EducationEntry[];

  // Step 7: Skills & Certifications
  yearsOfExperience: number;
  tradeSkills: string[];
  certifications: CertificationEntry[];

  // Step 8: References & Final
  references: ReferenceEntry[];
  whyInterested: string;
  salaryExpectations: string;
  howHeardAboutJob: string;
  emergencyContact: EmergencyContactEntry;
  consents: ConsentEntry;

  // Responses to employer-defined screening questions
  customAnswers?: Record<string, string>;
}

export interface WorkHistoryEntry {
  id: string;
  companyName: string;
  jobTitle: string;
  startDate: string;
  endDate?: string;
  isCurrent: boolean;
  responsibilities: string;
  reasonForLeaving?: string;
}

export interface EducationEntry {
  id: string;
  institutionName: string;
  degreeType: string;
  fieldOfStudy: string;
  graduationYear: number;
  isCurrentlyEnrolled: boolean;
}

export interface CertificationEntry {
  id: string;
  name: string;
  issuingOrganization: string;
  expirationDate?: string;
}

export interface ReferenceEntry {
  id: string;
  name: string;
  company: string;
  phone: string;
  email: string;
  relationship: string;
}

export interface EmergencyContactEntry {
  name: string;
  relationship: string;
  phone: string;
}

export interface ConsentEntry {
  physicalRequirements: boolean;
  backgroundCheck: boolean;
  drugTest: boolean;
  dataAccuracy: boolean;
}

export interface ApplicationDraft {
  id: string;
  job_id: string;
  applicant_id: string;
  form_data: Partial<ApplicationFormData>;
  resume_url?: string;
  cover_letter_url?: string;
  resume_extracted_text?: string;
  last_saved_at: string;
  expires_at: string;
  created_at: string;
}

export interface JobApplication {
  id: string;
  job_id: string;
  applicant_id: string;
  status: 'pending' | 'viewed' | 'contacted' | 'rejected' | 'hired' | 'withdrawn';
  form_data: ApplicationFormData;
  // Responses to employer-defined screening questions
  custom_answers?: Record<string, unknown>;
  resume_url?: string;
  cover_letter_url?: string;
  resume_extracted_text?: string;
  contact_shared: boolean;
  created_at: string;
}

export interface NotificationPreferences {
  user_id: string;
  application_status_changes: boolean;
  new_applications: boolean;
  email_notifications: boolean;
  email_digest: 'immediate' | 'daily' | 'weekly' | 'never';
  desktop_notifications: boolean;
  notification_sound: boolean;
  push_notifications: boolean;
  created_at: string;
  updated_at: string;
}
