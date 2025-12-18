'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Input, Select } from '@/components/ui';
import { TRADES, TRADE_SUBCATEGORIES, EMPLOYER_TYPES } from '@/lib/constants';
import { updateProfile, type ProfileUpdateData } from '../actions/profile-actions';

type Props = {
  profile: any;
};

export function ProfileEditForm({ profile }: Props) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState<ProfileUpdateData>({
    name: profile.name || '',
    trade: profile.trade || '',
    sub_trade: profile.sub_trade || '',
    location: profile.location || '',
    phone: profile.phone || '',
    bio: profile.bio || '',
    employer_type: profile.employer_type || undefined,
  });

  function updateFormData(updates: Partial<ProfileUpdateData>) {
    setFormData((prev) => ({ ...prev, ...updates }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const result = await updateProfile(formData);

    if (!result.success) {
      setError(result.error || 'Failed to update profile');
      setIsLoading(false);
    }
    // If successful, user will be redirected by the action
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <Input
          label="Full Name"
          type="text"
          value={formData.name}
          onChange={(e) => updateFormData({ name: e.target.value })}
          required
          disabled={isLoading}
        />

        <Input
          label="Phone Number"
          type="tel"
          placeholder="(555) 123-4567"
          value={formData.phone}
          onChange={(e) => updateFormData({ phone: e.target.value })}
          disabled={isLoading}
        />

        <Select
          label="Trade"
          options={TRADES.map((trade) => ({ value: trade, label: trade }))}
          value={formData.trade}
          onChange={(e) => updateFormData({ trade: e.target.value, sub_trade: '' })}
          required
          disabled={isLoading}
        />

        {formData.trade && TRADE_SUBCATEGORIES[formData.trade] && (
          <Select
            label="Specialty (Optional)"
            options={TRADE_SUBCATEGORIES[formData.trade].map((subTrade) => ({
              value: subTrade,
              label: subTrade,
            }))}
            value={formData.sub_trade || ''}
            onChange={(e) => updateFormData({ sub_trade: e.target.value })}
            disabled={isLoading}
          />
        )}

        {profile.role === 'employer' && (
          <Select
            label="Employer Type"
            options={EMPLOYER_TYPES.map((type) => ({
              value: type,
              label: type.charAt(0).toUpperCase() + type.slice(1)
            }))}
            value={formData.employer_type || ''}
            onChange={(e) =>
              updateFormData({ employer_type: e.target.value as 'contractor' | 'recruiter' })
            }
            required
            disabled={isLoading}
          />
        )}

        <Input
          label="Location"
          type="text"
          placeholder="City, State"
          value={formData.location}
          onChange={(e) => updateFormData({ location: e.target.value })}
          helperText="Your location helps match you with nearby opportunities"
          required
          disabled={isLoading}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Bio
        </label>
        <textarea
          className="flex min-h-[120px] w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-crewup-blue focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"
          placeholder="Tell employers about your experience and skills..."
          value={formData.bio}
          onChange={(e) => updateFormData({ bio: e.target.value })}
          disabled={isLoading}
        />
        <p className="mt-1.5 text-sm text-gray-500">
          Briefly describe your experience, skills, and what you're looking for
        </p>
      </div>

      <div className="flex gap-3 pt-4 border-t border-gray-200">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isLoading}
        >
          Cancel
        </Button>
        <Button type="submit" isLoading={isLoading}>
          Save Changes
        </Button>
      </div>
    </form>
  );
}
