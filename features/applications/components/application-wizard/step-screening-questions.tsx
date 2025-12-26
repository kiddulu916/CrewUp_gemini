// features/applications/components/application-wizard/step-screening-questions.tsx
'use client';

import { UseFormReturn } from 'react-hook-form';
import { ScreeningQuestionsForm } from '../screening-questions-form';
import { ApplicationFormData } from '../../types/application.types';
import type { CustomQuestion } from '@/features/jobs/components/custom-questions-builder';

interface StepScreeningQuestionsProps {
  form: UseFormReturn<Partial<ApplicationFormData>>;
  questions: CustomQuestion[];
}

export function StepScreeningQuestions({ form, questions }: StepScreeningQuestionsProps) {
  const answers = form.watch('customAnswers') || {};
  const errors = form.formState.errors.customAnswers as Record<string, any> || {};

  const handleChange = (newAnswers: Record<string, string>) => {
    form.setValue('customAnswers', newAnswers, { shouldValidate: true });
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-2">Screening Questions</h2>
      <p className="text-gray-600 mb-6">
        The employer has asked some specific questions about this position.
      </p>

      <ScreeningQuestionsForm
        questions={questions}
        value={answers}
        onChange={handleChange}
        errors={errors}
      />
    </div>
  );
}
