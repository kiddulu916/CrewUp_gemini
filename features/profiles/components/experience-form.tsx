'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Input, Textarea, Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { useToast } from '@/components/providers/toast-provider';
import { addExperience } from '../actions/experience-actions';

export function ExperienceForm() {
  const router = useRouter();
  const toast = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    job_title: '',
    company_name: '',
    start_date: '',
    end_date: '',
    is_current: false,
    description: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const result = await addExperience({
        job_title: formData.job_title,
        company_name: formData.company_name,
        start_date: formData.start_date,
        end_date: formData.is_current ? null : formData.end_date,
        is_current: formData.is_current,
        description: formData.description || undefined,
      });

      if (!result.success) {
        const errorMsg = result.error || 'Failed to add work experience';
        setError(errorMsg);
        toast.error(errorMsg);
        setIsLoading(false);
        return;
      }

      toast.success('Work experience added successfully!');
      router.push('/dashboard/profile');
      router.refresh();
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to add work experience';
      setError(errorMsg);
      toast.error(errorMsg);
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Work Experience Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label htmlFor="job_title" className="block text-sm font-medium text-gray-700 mb-1">
              Job Title <span className="text-red-500">*</span>
            </label>
            <Input
              id="job_title"
              type="text"
              value={formData.job_title}
              onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}
              placeholder="e.g., Senior Carpenter"
              required
              maxLength={100}
            />
          </div>

          <div>
            <label htmlFor="company_name" className="block text-sm font-medium text-gray-700 mb-1">
              Company Name <span className="text-red-500">*</span>
            </label>
            <Input
              id="company_name"
              type="text"
              value={formData.company_name}
              onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
              placeholder="e.g., ABC Construction"
              required
              maxLength={100}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="start_date" className="block text-sm font-medium text-gray-700 mb-1">
                Start Date <span className="text-red-500">*</span>
              </label>
              <Input
                id="start_date"
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                required
              />
            </div>

            <div>
              <label htmlFor="end_date" className="block text-sm font-medium text-gray-700 mb-1">
                End Date {!formData.is_current && <span className="text-red-500">*</span>}
              </label>
              <Input
                id="end_date"
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                disabled={formData.is_current}
                required={!formData.is_current}
                min={formData.start_date || undefined}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_current"
              checked={formData.is_current}
              onChange={(e) =>
                setFormData({ ...formData, is_current: e.target.checked, end_date: '' })
              }
              className="h-4 w-4 rounded border-gray-300 text-krewup-blue focus:ring-krewup-blue"
            />
            <label htmlFor="is_current" className="text-sm font-medium text-gray-700">
              I currently work here
            </label>
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe your responsibilities and achievements..."
              rows={4}
              maxLength={500}
            />
            <p className="text-xs text-gray-500 mt-1">
              {formData.description.length}/500 characters
            </p>
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
          onClick={() => router.push('/dashboard/profile')}
          className="w-full"
        >
          Cancel
        </Button>
        <Button type="submit" variant="primary" isLoading={isLoading} className="w-full">
          {isLoading ? 'Adding...' : 'Add Experience'}
        </Button>
      </div>
    </form>
  );
}
