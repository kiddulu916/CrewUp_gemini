'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApplicationWizard } from '../../hooks/use-application-wizard';
import { ProgressIndicator } from './progress-indicator';
import { AutoSaveIndicator } from './auto-save-indicator';
import { Step1Documents } from './step-1-documents';
import { Step2PersonalInfo } from './step-2-personal-info';
import { Step3Contact } from './step-3-contact';
import { Step4WorkAuth } from './step-4-work-auth';
import { Step5WorkHistory } from './step-5-work-history';
import { Step6Education } from './step-6-education';
import { Step7Skills } from './step-7-skills';
import { Step8References } from './step-8-references';
import { Button } from '@/components/ui';
import { LoadingSpinner } from '@/components/ui';
import { submitApplication } from '../../actions/application-actions';
import { useToast } from '@/components/providers/toast-provider';

/**
 * Application Wizard Container Component
 *
 * Main container for the 8-step job application wizard.
 * Handles state management, auto-save, and step navigation.
 *
 * Features:
 * - Sticky header with job title and progress
 * - Auto-save indicator showing last save time
 * - Step-by-step form navigation
 * - Fixed bottom navigation buttons
 *
 * Step Components:
 * - Step 1: Documents (resume, cover letter upload)
 * - Step 2: Personal Information (name, address)
 * - Step 3: Contact & Availability (phone, start date)
 * - Step 4: Work Authorization (licenses, transportation)
 * - Step 5: Work History (previous employers)
 * - Step 6: Education (schools, degrees)
 * - Step 7: Skills & Certifications (trade skills, certs)
 * - Step 8: References & Review (references, final review)
 *
 * @param jobId - The job ID for the application
 * @param jobTitle - The job title to display in header
 */

type Props = {
  jobId: string;
  jobTitle: string;
};

export function ApplicationWizardContainer({ jobId, jobTitle }: Props) {
  const router = useRouter();
  const toast = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
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
  } = useApplicationWizard(jobId);

  async function handleSubmit() {
    // Validate all form data
    const isValid = await form.trigger();

    if (!isValid) {
      toast.error('Please complete all required fields before submitting');
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = form.getValues();

      const result = await submitApplication(
        jobId,
        formData as any, // Type assertion for complex nested form data
        resumeUrl,
        coverLetterUrl,
        extractedText
      );

      if (result.success) {
        toast.success('Application submitted successfully!');
        // Redirect to applications page or success page
        router.push('/dashboard/applications?submitted=true');
      } else {
        toast.error(result.error || 'Failed to submit application');
      }
    } catch (error) {
      console.error('Submission error:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <LoadingSpinner />
          <p className="mt-4 text-gray-600">Loading your draft...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header - Sticky */}
      <div className="bg-white border-b sticky top-0 z-10 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-900">Apply for {jobTitle}</h1>
          <ProgressIndicator currentStep={currentStep} totalSteps={8} />
          <AutoSaveIndicator isSaving={isSaving} lastSaved={lastSaved} />
        </div>
      </div>

      {/* Step Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow p-6">
          {currentStep === 1 && (
            <Step1Documents
              form={form}
              jobId={jobId}
              resumeUrl={resumeUrl}
              setResumeUrl={setResumeUrl}
              coverLetterUrl={coverLetterUrl}
              setCoverLetterUrl={setCoverLetterUrl}
              extractedText={extractedText}
              setExtractedText={setExtractedText}
            />
          )}

          {currentStep === 2 && <Step2PersonalInfo form={form} />}

          {currentStep === 3 && <Step3Contact form={form} />}

          {currentStep === 4 && <Step4WorkAuth form={form} />}

          {currentStep === 5 && <Step5WorkHistory form={form} />}

          {currentStep === 6 && <Step6Education form={form} />}

          {currentStep === 7 && <Step7Skills form={form} />}

          {currentStep === 8 && <Step8References form={form} />}
        </div>
      </div>

      {/* Navigation - Fixed at bottom */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <Button
              type="button"
              variant="outline"
              onClick={prevStep}
              disabled={currentStep === 1 || isSubmitting}
            >
              Back
            </Button>

            <div className="text-sm text-gray-600">
              {currentStep === 8 ? 'Ready to submit?' : `Step ${currentStep} of 8`}
            </div>

            {currentStep === 8 ? (
              <Button
                type="button"
                variant="secondary"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="min-w-[140px]"
              >
                {isSubmitting ? (
                  <>
                    <LoadingSpinner className="w-4 h-4 mr-2" />
                    Submitting...
                  </>
                ) : (
                  'Submit Application'
                )}
              </Button>
            ) : (
              <Button
                type="button"
                variant="secondary"
                onClick={nextStep}
              >
                Next
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
