'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Input, Textarea, Select, Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { useUpdateProfile } from '../hooks/use-update-profile';
import { useUserLocation } from '@/hooks/use-user-location';
import { TRADES, TRADE_SUBCATEGORIES, EMPLOYER_TYPES } from '@/lib/constants';

type ProfileFormProps = {
  initialData: {
    id: string;
    name: string;
    email: string;
    phone?: string | null;
    location?: string | null;
    coords?: { lat: number; lng: number } | null;
    trade: string;
    sub_trade?: string | null;
    bio?: string | null;
    role: string;
    employer_type?: string | null;
  };
};

export function ProfileForm({ initialData }: ProfileFormProps) {
  const router = useRouter();
  const updateProfile = useUpdateProfile();
  const locationState = useUserLocation();

  const [formData, setFormData] = useState({
    name: initialData.name || '',
    phone: initialData.phone || '',
    location: initialData.location || '',
    coords: initialData.coords || null,
    trade: initialData.trade || '',
    sub_trade: initialData.sub_trade || '',
    bio: initialData.bio || '',
    employer_type: initialData.employer_type || '',
  });

  const [error, setError] = useState<string | null>(null);

  // Update coords when location is fetched
  useEffect(() => {
    if (locationState.location && !formData.coords) {
      setFormData(prev => ({ ...prev, coords: locationState.location }));
    }
  }, [locationState.location, formData.coords]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      await updateProfile.mutateAsync({
        name: formData.name,
        phone: formData.phone || null,
        location: formData.location,
        coords: formData.coords,
        trade: formData.trade,
        sub_trade: formData.sub_trade || null,
        bio: formData.bio,
        ...(initialData.role === 'employer' && {
          employer_type: formData.employer_type || null,
        }),
      });

      router.push('/dashboard/profile');
    } catch (err: any) {
      setError(err.message || 'Failed to update profile');
    }
  };

  const handleGetLocation = () => {
    locationState.requestLocation();
  };

  const availableSubTrades = formData.trade ? TRADE_SUBCATEGORIES[formData.trade] || [] : [];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Full Name <span className="text-red-500">*</span>
            </label>
            <Input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="John Doe"
              required
              maxLength={100}
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <Input
              id="email"
              type="email"
              value={initialData.email}
              disabled
              className="bg-gray-100 cursor-not-allowed"
            />
            <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
          </div>

          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number
            </label>
            <Input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="(555) 123-4567"
            />
          </div>

          <div>
            <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-1">
              Bio
            </label>
            <Textarea
              id="bio"
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              placeholder="Tell others about yourself..."
              rows={4}
              maxLength={500}
            />
            <p className="text-xs text-gray-500 mt-1">
              {formData.bio.length}/500 characters
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Trade Information */}
      <Card>
        <CardHeader>
          <CardTitle>Trade Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label htmlFor="trade" className="block text-sm font-medium text-gray-700 mb-1.5">
              Primary Trade <span className="text-red-500">*</span>
            </label>
            <Select
              id="trade"
              value={formData.trade}
              onChange={(e) =>
                setFormData({ ...formData, trade: e.target.value, sub_trade: '' })
              }
              options={TRADES.map((trade) => ({ value: trade, label: trade }))}
              required
            />
          </div>

          {availableSubTrades.length > 0 && (
            <div>
              <label htmlFor="sub_trade" className="block text-sm font-medium text-gray-700 mb-1.5">
                Specialty
              </label>
              <Select
                id="sub_trade"
                value={formData.sub_trade}
                onChange={(e) => setFormData({ ...formData, sub_trade: e.target.value })}
                options={[
                  { value: '', label: 'No specialty' },
                  ...availableSubTrades.map((subTrade) => ({ value: subTrade, label: subTrade })),
                ]}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Employer Type (Employers Only) */}
      {initialData.role === 'employer' && (
        <Card>
          <CardHeader>
            <CardTitle>Employer Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div>
              <label htmlFor="employer_type" className="block text-sm font-medium text-gray-700 mb-1.5">
                Employer Type
              </label>
              <Select
                id="employer_type"
                value={formData.employer_type}
                onChange={(e) => setFormData({ ...formData, employer_type: e.target.value })}
                options={[
                  { value: '', label: 'Select type' },
                  ...EMPLOYER_TYPES.map((type) => ({
                    value: type,
                    label: type.charAt(0).toUpperCase() + type.slice(1),
                  })),
                ]}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Location */}
      <Card>
        <CardHeader>
          <CardTitle>Location</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
              Address / City
            </label>
            <Input
              id="location"
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="Chicago, IL"
              maxLength={200}
            />
          </div>

          <div>
            <Button
              type="button"
              variant="outline"
              onClick={handleGetLocation}
              isLoading={locationState.loading}
              className="w-full"
            >
              {locationState.loading ? 'Getting location...' : 'Get My Current Location'}
            </Button>
            {locationState.error && (
              <p className="text-xs text-amber-600 mt-1">{locationState.error}</p>
            )}
            {formData.coords && (
              <p className="text-xs text-green-600 mt-1">
                Location coordinates saved ({formData.coords.lat.toFixed(4)}, {formData.coords.lng.toFixed(4)})
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Error Message */}
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push('/dashboard/profile')}
          className="w-full"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="primary"
          isLoading={updateProfile.isPending}
          className="w-full"
        >
          {updateProfile.isPending ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </form>
  );
}
