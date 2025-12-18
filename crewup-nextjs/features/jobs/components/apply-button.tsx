'use client';

import { useState } from 'react';
import { Button } from '@/components/ui';
import { applyToJob } from '../actions/application-actions';
import { useRouter } from 'next/navigation';

type Props = {
  jobId: string;
};

export function ApplyButton({ jobId }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [coverLetter, setCoverLetter] = useState('');
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const result = await applyToJob(jobId, coverLetter);

    if (!result.success) {
      setError(result.error || 'Failed to apply');
      setIsLoading(false);
    } else {
      // Success - refresh the page to show applied state
      router.refresh();
    }
  }

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        variant="secondary"
        size="lg"
        className="shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-105"
      >
        Apply Now
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full border-2 border-crewup-light-blue">
        <div className="bg-gradient-to-r from-crewup-blue to-crewup-light-blue p-6 rounded-t-xl">
          <h2 className="text-2xl font-bold text-white">Apply for This Job</h2>
          <p className="text-blue-100 mt-1">Tell the employer why you're a great fit</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Cover Letter (Optional)
            </label>
            <textarea
              className="flex min-h-[150px] w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-crewup-blue focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="Why are you interested in this position? What relevant experience do you have?"
              value={coverLetter}
              onChange={(e) => setCoverLetter(e.target.value)}
              disabled={isLoading}
            />
            <p className="mt-1.5 text-sm text-gray-500">
              Introduce yourself and highlight your relevant skills and experience
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isLoading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="secondary"
              isLoading={isLoading}
              className="flex-1"
            >
              Submit Application
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
