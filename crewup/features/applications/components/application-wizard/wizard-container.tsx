'use client';

import { useApplicationWizard } from '../../hooks/use-application-wizard';
import { ProgressIndicator } from './progress-indicator';
import { AutoSaveIndicator } from './auto-save-indicator';
import { Button } from '@/components/ui';
import { LoadingSpinner } from '@/components/ui';

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
 * Step Components (to be implemented):
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
  const {
    currentStep,
    form,
    isLoading,
    isSaving,
    lastSaved,
    nextStep,
    prevStep,
  } = useApplicationWizard(jobId);

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
          {/* Step Components - Placeholders for now */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-900">Step 1: Documents</h2>
              <p className="text-gray-600">
                Upload your resume and cover letter (optional). We'll extract information to
                help auto-fill the next steps.
              </p>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <p className="text-gray-500">Document upload component coming soon...</p>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-900">Step 2: Personal Information</h2>
              <p className="text-gray-600">
                Provide your full name and address. This may be auto-populated from your resume.
              </p>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <p className="text-gray-500">Personal info form coming soon...</p>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-900">
                Step 3: Contact & Availability
              </h2>
              <p className="text-gray-600">
                Provide your phone number and when you can start working.
              </p>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <p className="text-gray-500">Contact form coming soon...</p>
              </div>
            </div>
          )}

          {currentStep === 4 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-900">Step 4: Work Authorization</h2>
              <p className="text-gray-600">
                Confirm your work authorization, licenses, and transportation.
              </p>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <p className="text-gray-500">Work authorization form coming soon...</p>
              </div>
            </div>
          )}

          {currentStep === 5 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-900">Step 5: Work History</h2>
              <p className="text-gray-600">
                List your previous employers and experience. This may be auto-populated from your
                resume.
              </p>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <p className="text-gray-500">Work history form coming soon...</p>
              </div>
            </div>
          )}

          {currentStep === 6 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-900">Step 6: Education</h2>
              <p className="text-gray-600">
                List your education history including schools, degrees, and certifications.
              </p>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <p className="text-gray-500">Education form coming soon...</p>
              </div>
            </div>
          )}

          {currentStep === 7 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-900">
                Step 7: Skills & Certifications
              </h2>
              <p className="text-gray-600">
                Select your trade skills and list any relevant certifications.
              </p>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <p className="text-gray-500">Skills & certifications form coming soon...</p>
              </div>
            </div>
          )}

          {currentStep === 8 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-900">
                Step 8: References & Final Review
              </h2>
              <p className="text-gray-600">
                Provide references and review your application before submission.
              </p>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <p className="text-gray-500">References & review form coming soon...</p>
              </div>
            </div>
          )}
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
              disabled={currentStep === 1}
            >
              Back
            </Button>

            <div className="text-sm text-gray-600">
              {currentStep === 8 ? 'Ready to submit?' : `Step ${currentStep} of 8`}
            </div>

            <Button
              type="button"
              variant="secondary"
              onClick={nextStep}
              disabled={currentStep === 8}
            >
              {currentStep === 8 ? 'Review & Submit' : 'Next'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
