'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import type { ApplicationFormData } from '../types/application.types';
import { loadDraft, saveDraft } from '../actions/draft-actions';
import { useToast } from '@/components/providers/toast-provider';

/**
 * Custom hook for managing application wizard state
 *
 * Features:
 * - Multi-step form management with React Hook Form
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
 * @returns Wizard state and control functions
 */
export function useApplicationWizard(jobId: string) {
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
      workHistory: [],
      education: [],
      certifications: [],
      references: [],
      tradeSkills: [],
    },
  });

  // Load draft on mount
  useEffect(() => {
    async function loadExistingDraft() {
      const result = await loadDraft(jobId);
      if (result.success && result.draft) {
        // Populate form with draft data
        form.reset(result.draft.form_data);
        setResumeUrl(result.draft.resume_url || undefined);
        setCoverLetterUrl(result.draft.cover_letter_url || undefined);
        setExtractedText(result.draft.resume_extracted_text || undefined);
        setLastSaved(new Date(result.draft.last_saved_at));
      }
      setIsLoading(false);
    }
    loadExistingDraft();
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
    if (currentStep < 8) {
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
   * @param step - Step number (1-8)
   */
  function goToStep(step: number) {
    if (step >= 1 && step <= 8) {
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
