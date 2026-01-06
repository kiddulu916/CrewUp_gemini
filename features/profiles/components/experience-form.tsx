'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Input, Textarea, Card, CardContent, CardHeader, CardTitle, Checkbox } from '@/components/ui';
import { useToast } from '@/components/providers/toast-provider';
import { addExperience } from '../actions/experience-actions';
import { experienceSchema, type ExperienceSchema } from '../utils/validation';

type Props = {
  onSuccess?: () => void;
  onCancel?: () => void;
};

export function ExperienceForm({ onSuccess, onCancel }: Props) {
  const router = useRouter();
  const toast = useToast();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ExperienceSchema>({
    resolver: zodResolver(experienceSchema),
    defaultValues: {
      job_title: '',
      company_name: '',
      start_date: '',
      end_date: '',
      is_current: false,
      description: '',
    },
  });

  const isCurrent = watch('is_current');

  const onSubmit = async (data: ExperienceSchema) => {
    setError(null);

    try {
      const result = await addExperience({
        job_title: data.job_title,
        company: data.company_name,
        start_date: data.start_date,
        end_date: data.is_current ? null : data.end_date,
        is_current: data.is_current,
        description: data.description || undefined,
      });

      if (!result.success) {
        const errorMsg = result.error || 'Failed to add work experience';
        setError(errorMsg);
        toast.error(errorMsg);
        return;
      }

      toast.success('Work experience added successfully!');
      if (onSuccess) {
        onSuccess();
      } else {
        router.push('/dashboard/profile');
        router.refresh();
      }
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to add work experience';
      setError(errorMsg);
      toast.error(errorMsg);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Work Experience Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Input
              label="Job Title"
              {...register('job_title')}
              placeholder="e.g., Senior Carpenter"
              required
              maxLength={100}
              error={errors.job_title?.message}
              disabled={isSubmitting}
            />
          </div>

          <div>
            <Input
              label="Company Name"
              {...register('company_name')}
              placeholder="e.g., ABC Construction"
              required
              maxLength={100}
              error={errors.company_name?.message}
              disabled={isSubmitting}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Input
                label="Start Date"
                type="date"
                {...register('start_date')}
                required
                error={errors.start_date?.message}
                disabled={isSubmitting}
              />
            </div>

            <div>
              <Input
                label="End Date"
                type="date"
                {...register('end_date')}
                disabled={isSubmitting || isCurrent}
                error={errors.end_date?.message}
                min={watch('start_date')}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_current"
              {...register('is_current')}
              onChange={(e) => {
                register('is_current').onChange(e);
                if (e.target.checked) setValue('end_date', '');
              }}
              className="h-4 w-4 rounded border-gray-300 text-krewup-blue focus:ring-krewup-blue"
              disabled={isSubmitting}
            />
            <label htmlFor="is_current" className="text-sm font-medium text-gray-700">
              I currently work here
            </label>
          </div>

          <div>
            <Textarea
              label="Description"
              {...register('description')}
              placeholder="Describe your responsibilities and achievements..."
              rows={4}
              maxLength={500}
              error={errors.description?.message}
              disabled={isSubmitting}
              helperText={`${(watch('description') || '').length}/500 characters`}
            />
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <div className="flex gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel || (() => router.push('/dashboard/profile'))}
          className="w-full"
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="primary"
          isLoading={isSubmitting}
          className="w-full"
        >
          {isSubmitting ? 'Adding...' : 'Add Experience'}
        </Button>
      </div>
    </form>
  );
}
