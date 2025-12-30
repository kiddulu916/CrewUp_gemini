'use client';

import { useState } from 'react';
import { Button, Input, Select } from '@/components/ui';
import { addEducation, type EducationData } from '../actions/education-actions';
import { useRouter } from 'next/navigation';

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
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const currentYear = new Date().getFullYear();

  const [formData, setFormData] = useState<EducationData>({
    institution_name: '',
    degree_type: '',
    field_of_study: '',
    graduation_year: undefined,
    is_currently_enrolled: false,
  });

  function updateFormData(updates: Partial<EducationData>) {
    setFormData((prev) => ({ ...prev, ...updates }));
  }

  async function handleSubmit() {
    setError('');
    setIsLoading(true);

    const result = await addEducation(formData);

    if (result.success) {
      router.refresh();
      if (onSuccess) {
        onSuccess();
      } else {
        // Reset form
        setFormData({
          institution_name: '',
          degree_type: '',
          field_of_study: '',
          graduation_year: undefined,
          is_currently_enrolled: false,
        });
      }
    } else {
      setError(result.error || 'Failed to add education entry');
    }

    setIsLoading(false);
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <Select
        label="Degree Type"
        options={DEGREE_TYPES.map((type) => ({ value: type, label: type }))}
        value={formData.degree_type}
        onChange={(e) => updateFormData({ degree_type: e.target.value })}
        required
        disabled={isLoading}
      />

      <Input
        label="Institution Name"
        type="text"
        placeholder="e.g., Lincoln Technical Institute"
        value={formData.institution_name}
        onChange={(e) => updateFormData({ institution_name: e.target.value })}
        required
        disabled={isLoading}
      />

      <Input
        label="Field of Study (Optional)"
        type="text"
        placeholder="e.g., HVAC Technology"
        value={formData.field_of_study}
        onChange={(e) => updateFormData({ field_of_study: e.target.value })}
        disabled={isLoading}
      />

      <Input
        label="Graduation Year (Optional)"
        type="number"
        min="1950"
        max={currentYear + 10}
        value={formData.graduation_year || ''}
        onChange={(e) => updateFormData({ graduation_year: e.target.value ? parseInt(e.target.value) : undefined })}
        disabled={isLoading}
      />

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="is_currently_enrolled"
          checked={formData.is_currently_enrolled}
          onChange={(e) => updateFormData({ is_currently_enrolled: e.target.checked })}
          disabled={isLoading}
          className="rounded border-gray-300 text-krewup-blue focus:ring-krewup-blue"
        />
        <label htmlFor="is_currently_enrolled" className="text-sm text-gray-700">
          Currently enrolled
        </label>
      </div>

      <div className="flex gap-3 pt-4">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
          >
            Cancel
          </Button>
        )}
        <Button type="button" onClick={handleSubmit} isLoading={isLoading}>
          Add Education
        </Button>
      </div>
    </div>
  );
}
