'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import type {
  ApplicationFormData,
  WorkHistoryEntry,
  EducationEntry,
  CertificationEntry,
  ReferenceEntry,
} from '../types/application.types';
import { loadDraft, saveDraft } from '../actions/draft-actions';
import { loadProfileDataForApplication } from '../actions/profile-data-actions';
import { useToast } from '@/components/providers/toast-provider';
import type { ProfileWithRelations } from '@/lib/types/profile.types';

/**
 * Transform profile data to application form data format
 */
function transformProfileToFormData(profileData: ProfileWithRelations): Partial<ApplicationFormData> {
  const { profile, workExperience, education, professionalReferences, certifications } = profileData;

  // Transform work experience
  const workHistory: WorkHistoryEntry[] = workExperience.map((exp) => ({
    id: exp.id,
    companyName: exp.company_name || exp.company || '',
    jobTitle: exp.job_title,
    startDate: exp.start_date,
    endDate: exp.end_date || undefined,
    isCurrent: exp.is_current,
    responsibilities: exp.responsibilities || exp.description || '',
    reasonForLeaving: exp.reason_for_leaving || undefined,
  }));

  // Transform education
  const educationEntries: EducationEntry[] = education.map((edu) => ({
    id: edu.id,
    institutionName: edu.institution_name || edu.institution || '',
    degreeType: edu.degree_type || edu.degree || '',
    fieldOfStudy: edu.field_of_study || '',
    graduationYear: edu.graduation_year || new Date().getFullYear(),
    isCurrentlyEnrolled: edu.is_currently_enrolled || false,
  }));

  // Transform certifications (database certs to wizard format)
  const certificationEntries: CertificationEntry[] = certifications.map((cert) => ({
    id: cert.id,
    name: cert.certification_type || cert.name || '',
    issuingOrganization: cert.issuing_organization || (cert.is_verified ? 'Verified' : 'Not Verified'),
    expirationDate: cert.expires_at || cert.expiration_date || undefined,
  }));

  // Transform professional references
  const referenceEntries: ReferenceEntry[] = professionalReferences.map((ref) => ({
    id: ref.id,
    name: ref.name,
    company: ref.company || '',
    phone: ref.phone || '',
    email: ref.email || '',
    relationship: ref.relationship,
  }));

  // Derive full name from profile
  const fullName = profile.name || `${profile.first_name || ''} ${profile.last_name || ''}`.trim();

  return {
    // Step 2: Personal Information
    fullName,
    address: {
      street: '',
      city: profile.location?.split(',')[0]?.trim() || '',
      state: profile.location?.split(',')[1]?.trim() || '',
      zipCode: '',
    },

    // Step 3: Contact
    phoneNumber: profile.phone || '',

    // Step 4: Work Authorization
    authorizedToWork: profile.authorized_to_work ?? true,
    hasDriversLicense: profile.has_dl ?? false,
    licenseClass: profile.dl_class && ['A', 'B', 'C'].includes(profile.dl_class) 
      ? (profile.dl_class as 'A' | 'B' | 'C') 
      : undefined,
    hasReliableTransportation: profile.reliable_transportation ?? false,

    // Step 5: Work History
    workHistory,

    // Step 6: Education
    education: educationEntries,

    // Step 7: Skills & Certifications
    yearsOfExperience: profile.years_of_experience ?? 0,
    tradeSkills: profile.trade_skills || [],
    certifications: certificationEntries,

    // Step 8: References & Emergency Contact
    references: referenceEntries,
    emergencyContact: {
      name: profile.emergency_contact_name || '',
      relationship: profile.emergency_contact_relationship || '',
      phone: profile.emergency_contact_phone || '',
    },
  };
}

/**
 * Custom hook for managing application wizard state
 *
 * Features:
 * - Multi-step form management with React Hook Form
 * - Auto-fill from worker profile data
 * - Auto-save drafts every 30 seconds
 * - Load existing drafts on mount
 * - Step navigation with validation
 * - Resume and cover letter URL tracking
 * - Extracted resume text storage
 *
 * Note: Individual step validation is handled at the step component level
 * using step-specific schemas. This hook manages the overall form state
 * without requiring all fields to be complete.
 *
 * @param jobId - The job ID for the application
 * @param totalSteps - Total number of steps in the wizard (default 8)
 * @returns Wizard state and control functions
 */
export function useApplicationWizard(jobId: string, totalSteps: number = 8) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [resumeUrl, setResumeUrl] = useState<string>();
  const [coverLetterUrl, setCoverLetterUrl] = useState<string>();
  const [extractedText, setExtractedText] = useState<string>();
  const toast = useToast();

  // Form without resolver - validation happens at step level
  const form = useForm<Partial<ApplicationFormData>>({
    mode: 'onChange',
    defaultValues: {
      // Step 1
      coverLetterText: '',

      // Step 2
      fullName: '',
      address: {
        street: '',
        city: '',
        state: '',
        zipCode: '',
      },

      // Step 3
      phoneNumber: '',
      availableStartDate: '',

      // Step 4
      authorizedToWork: false,
      hasDriversLicense: false,
      licenseClass: undefined,
      hasReliableTransportation: false,

      // Step 5
      workHistory: [],

      // Step 6
      education: [],

      // Step 7
      yearsOfExperience: 0,
      tradeSkills: [],
      certifications: [],

      // Step 8
      references: [],
      whyInterested: '',
      salaryExpectations: '',
      howHeardAboutJob: '',
      emergencyContact: {
        name: '',
        relationship: '',
        phone: '',
      },
      consents: {
        backgroundCheck: false,
        drugTest: false,
        dataAccuracy: false,
      },
    },
  });

  // Load profile data and draft on mount
  useEffect(() => {
    async function loadApplicationData() {
      // Load profile data first (for auto-fill)
      const profileResult = await loadProfileDataForApplication();
      let profileFormData: Partial<ApplicationFormData> = {};

      if (profileResult.success && profileResult.data) {
        profileFormData = transformProfileToFormData(profileResult.data);
      }

      // Load draft (if exists, it takes precedence over profile)
      const draftResult = await loadDraft(jobId);

      if (draftResult.success && draftResult.draft) {
        // Merge profile data with draft data (draft wins)
        const mergedData = { ...profileFormData, ...draftResult.draft.form_data };
        form.reset(mergedData);
        setResumeUrl(draftResult.draft.resume_url || undefined);
        setCoverLetterUrl(draftResult.draft.cover_letter_url || undefined);
        setExtractedText(draftResult.draft.resume_extracted_text || undefined);
        setLastSaved(new Date(draftResult.draft.last_saved_at));
      } else {
        // No draft, just use profile data
        form.reset(profileFormData);
      }

      setIsLoading(false);
    }
    loadApplicationData();
  }, [jobId, form]);

  // Auto-save every 30 seconds
  useEffect(() => {
    const interval = setInterval(async () => {
      if (form.formState.isDirty) {
        await handleAutoSave();
      }
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [form.formState.isDirty]);

  /**
   * Save current form state as a draft
   * Called automatically every 30 seconds if form is dirty
   * Also called manually on step navigation
   */
  async function handleAutoSave() {
    setIsSaving(true);
    const formData = form.getValues();
    const result = await saveDraft(
      jobId,
      formData,
      resumeUrl,
      coverLetterUrl,
      extractedText
    );

    if (result.success) {
      setLastSaved(new Date());
      form.reset(formData, { keepValues: true }); // Mark as not dirty
    } else {
      toast.error('Failed to auto-save draft');
    }
    setIsSaving(false);
  }

  /**
   * Navigate to the next step
   * Saves draft before proceeding
   */
  async function nextStep() {
    await handleAutoSave();
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  }

  /**
   * Navigate to the previous step
   * Saves draft before proceeding
   */
  async function prevStep() {
    await handleAutoSave();
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  }

  /**
   * Jump to a specific step
   * Used by the progress indicator
   *
   * @param step - Step number (1-totalSteps)
   */
  function goToStep(step: number) {
    if (step >= 1 && step <= totalSteps) {
      setCurrentStep(step);
    }
  }

  return {
    currentStep,
    form,
    isLoading,
    isSaving,
    lastSaved,
    resumeUrl,
    setResumeUrl,
    coverLetterUrl,
    setCoverLetterUrl,
    extractedText,
    setExtractedText,
    nextStep,
    prevStep,
    goToStep,
    handleAutoSave,
  };
}
