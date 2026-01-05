'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Input, Select } from '@/components/ui';
import { addEducation } from '../actions/education-actions';
import { useRouter } from 'next/navigation';
import { educationSchema, type EducationSchema } from '../utils/validation';

const DEGREE_TYPES = [
  'High School Diploma',
  'GED',
  'Trade School Certificate',
  'Associate Degree',
  'Bachelor\'s Degree',
  'Master\'s Degree',
  'Doctoral Degree',
  'Professional Certificate',
  'Apprenticeship Completion',
  'Other',
];

type Props = {
  onSuccess?: () => void;
  onCancel?: () => void;
};

export function EducationForm({ onSuccess, onCancel }: Props) {
  const router = useRouter();
  const [error, setError] = useState('');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EducationSchema>({
    resolver: zodResolver(educationSchema),
    defaultValues: {
      institution_name: '',
      degree_type: '',
      field_of_study: '',
      graduation_year: undefined,
      is_currently_enrolled: false,
    },
  });

  async function onSubmit(data: EducationSchema) {
    setError('');

    const result = await addEducation(data);

    if (result.success) {
      router.refresh();
      if (onSuccess) {
        onSuccess();
      } else {
        reset();
      }
    } else {
      setError(result.error || 'Failed to add education entry');
    }
  }

  const currentYear = new Date().getFullYear();

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <Select
        label="Degree Type"
        options={DEGREE_TYPES.map((type) => ({ value: type, label: type }))}
        {...register('degree_type')}
        required
        error={errors.degree_type?.message}
        disabled={isSubmitting}
      />

      <Input
        label="Institution Name"
        type="text"
        placeholder="e.g., Lincoln Technical Institute"
        {...register('institution_name')}
        required
        error={errors.institution_name?.message}
        disabled={isSubmitting}
      />

      <Input
        label="Field of Study (Optional)"
        type="text"
        placeholder="e.g., HVAC Technology"
        {...register('field_of_study')}
        error={errors.field_of_study?.message}
        disabled={isSubmitting}
      />

      <Input
        label="Graduation Year (Optional)"
        type="number"
        min="1950"
        max={currentYear + 10}
        {...register('graduation_year', { valueAsNumber: true })}
        error={errors.graduation_year?.message}
        disabled={isSubmitting}
      />

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="is_currently_enrolled"
          {...register('is_currently_enrolled')}
          disabled={isSubmitting}
          className="rounded border-gray-300 text-krewup-blue focus:ring-krewup-blue"
        />
        <label htmlFor="is_currently_enrolled" className="text-sm text-gray-700">
          Currently enrolled
        </label>
      </div>

      <div className="flex gap-3 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel || (() => router.back())}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button type="submit" isLoading={isSubmitting}>
          Add Education
        </Button>
      </div>
    </form>
  );
}
