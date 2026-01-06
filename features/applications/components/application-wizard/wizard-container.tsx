'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useApplicationWizard } from '../../hooks/use-application-wizard';
import { ProgressIndicator } from './progress-indicator';
import { AutoSaveIndicator } from './auto-save-indicator';
import { Step1Documents } from './step-1-documents';
import { Step2PersonalInfo } from './step-2-personal-info';
import { Step3Contact } from './step-3-contact';
import { StepScreeningQuestions } from './step-screening-questions';
import { Step4WorkAuth } from './step-4-work-auth';
import { Step5WorkHistory } from './step-5-work-history';
import { Step6Education } from './step-6-education';
import { Step7Skills } from './step-7-skills';
import { Step8References } from './step-8-references';
import { Button } from '@/components/ui';
import { LoadingSpinner } from '@/components/ui';
import { submitApplication } from '../../actions/application-actions';
import { useToast } from '@/components/providers/toast-provider';
import { createClient } from '@/lib/supabase/client';
import type { CustomQuestion } from '@/features/jobs/components/custom-questions-builder';

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
  const [customQuestions, setCustomQuestions] = useState<CustomQuestion[]>([]);
  const [hasScreeningQuestions, setHasScreeningQuestions] = useState(false);
  const [jobTrades, setJobTrades] = useState<string[]>(['Craft Laborers']);

  // Calculate total steps dynamically
  const totalSteps = hasScreeningQuestions ? 9 : 8;

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
  } = useApplicationWizard(jobId, totalSteps);

  // Debug logging
  console.log('Wizard state:', {
    hasScreeningQuestions,
    totalSteps,
    customQuestionsCount: customQuestions.length,
    currentStep
  });

  // Fetch job details to check for custom questions and get trades
  useEffect(() => {
    async function fetchJobDetails() {
      const supabase = createClient();
      const { data: job } = await supabase
        .from('jobs')
        .select(`
          trade,
          trades,
          trade_selections,
          custom_questions,
          employer:users!employer_id(subscription_status)
        `)
        .eq('id', jobId)
        .single();

      // Extract all trades from the job posting
      let extractedTrades: string[] = [];

      // Priority 1: Check trade_selections (newest format with structured data)
      if (job?.trade_selections && Array.isArray(job.trade_selections) && job.trade_selections.length > 0) {
        extractedTrades = job.trade_selections
          .map((ts: any) => ts.trade)
          .filter((t: string) => t && t.trim() !== '');
      }

      // Priority 2: Check trades array (legacy format)
      if (extractedTrades.length === 0 && job?.trades && Array.isArray(job.trades) && job.trades.length > 0) {
        extractedTrades = job.trades.filter((t: string) => t && t.trim() !== '');
      }

      // Priority 3: Fallback to single trade field
      if (extractedTrades.length === 0 && job?.trade) {
        extractedTrades = [job.trade];
      }

      // Set the trades (will use default if extraction failed)
      if (extractedTrades.length > 0) {
        setJobTrades(extractedTrades);
      }

      // Check if job has custom questions
      // Workers should see questions if they exist (Pro employers created them)
      // The Pro check is only for viewing answers, not for showing questions to applicants
      console.log('Job custom_questions:', job?.custom_questions);
      console.log('Custom questions length:', job?.custom_questions?.length);

      if (job?.custom_questions && job.custom_questions.length > 0) {
        console.log('Setting custom questions:', job.custom_questions);
        setCustomQuestions(job.custom_questions);
        setHasScreeningQuestions(true);
      } else {
        console.log('No custom questions found for this job');
      }
    }

    fetchJobDetails();
  }, [jobId]);

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

  // No need to adjust display step since screening questions are at the end
  const getDisplayStep = (step: number) => step;

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header - Sticky */}
      <div className="bg-white border-b sticky top-0 z-10 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-900">Apply for {jobTitle}</h1>
          <ProgressIndicator currentStep={getDisplayStep(currentStep)} totalSteps={totalSteps} />
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

          {currentStep === 7 && <Step7Skills form={form} jobTrades={jobTrades} />}

          {currentStep === 8 && <Step8References form={form} />}

          {/* Conditional Screening Questions Step - Last step before submission */}
          {hasScreeningQuestions && currentStep === 9 && (
            <StepScreeningQuestions form={form} questions={customQuestions} />
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
              disabled={currentStep === 1 || isSubmitting}
            >
              Back
            </Button>

            <div className="text-sm text-gray-600">
              {currentStep === totalSteps
                ? 'Ready to submit?'
                : `Step ${currentStep} of ${totalSteps}`}
            </div>

            {currentStep === totalSteps ? (
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
