'use client';

import { useState } from 'react';
import { Button, Input, Select, Card, CardContent } from '@/components/ui';
import { LocationAutocomplete } from '@/components/common';
import { TRADES, TRADE_SUBCATEGORIES, EMPLOYER_TYPES } from '@/lib/constants';
import { completeOnboarding, type OnboardingData } from '../actions/onboarding-actions';

type Props = {
  initialName?: string;
};

export function OnboardingForm({ initialName = '' }: Props) {
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState<OnboardingData>({
    name: initialName,
    role: 'worker',
    trade: '',
    location: '',
  });

  function updateFormData(updates: Partial<OnboardingData>) {
    setFormData((prev) => ({ ...prev, ...updates }));
  }

  async function handleSubmit() {
    setError('');
    setIsLoading(true);

    const result = await completeOnboarding(formData);

    if (!result.success) {
      setError(result.error || 'Failed to complete onboarding');
      setIsLoading(false);
    }
    // If successful, user will be redirected by the action
  }

  // Step 1: Name
  if (step === 1) {
    return (
      <Card className="w-full max-w-md shadow-2xl border-2 border-crewup-light-blue">
        <CardContent className="p-6 space-y-6">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-crewup-blue to-crewup-orange shadow-lg">
              <span className="text-3xl">👋</span>
            </div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-crewup-blue to-crewup-orange bg-clip-text text-transparent">Welcome to CrewUp!</h2>
            <p className="mt-2 text-sm text-gray-600">Let's set up your profile</p>
          </div>

          <div className="space-y-4">
            <Input
              label="What's your full name?"
              type="text"
              placeholder="John Doe"
              value={formData.name}
              onChange={(e) => updateFormData({ name: e.target.value })}
              required
            />

            <Button
              className="w-full"
              onClick={() => setStep(2)}
              disabled={!formData.name || formData.name.length < 2}
            >
              Continue
            </Button>
          </div>

          <div className="flex justify-center gap-2">
            <div className="h-2 w-2 rounded-full bg-crewup-blue" />
            <div className="h-2 w-2 rounded-full bg-gray-300" />
            <div className="h-2 w-2 rounded-full bg-gray-300" />
            <div className="h-2 w-2 rounded-full bg-gray-300" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Step 2: Role Selection
  if (step === 2) {
    return (
      <Card className="w-full max-w-md shadow-2xl border-2 border-crewup-light-blue">
        <CardContent className="p-6 space-y-6">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-crewup-blue to-crewup-orange shadow-lg">
              <span className="text-3xl">🎯</span>
            </div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-crewup-blue to-crewup-orange bg-clip-text text-transparent">What brings you here?</h2>
            <p className="mt-2 text-sm text-gray-600">Choose your role</p>
          </div>

          <div className="grid gap-4">
            <button
              type="button"
              onClick={() => {
                updateFormData({ role: 'worker' });
                setStep(3);
              }}
              className={`flex items-start gap-4 rounded-xl border-3 p-5 text-left transition-all duration-300 hover:scale-105 hover:shadow-xl ${
                formData.role === 'worker' ? 'border-crewup-blue bg-gradient-to-r from-blue-50 to-blue-100 shadow-lg' : 'border-gray-300 hover:border-crewup-blue'
              }`}
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-crewup-blue to-crewup-light-blue text-white shadow-lg">
                <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">I'm a Worker</h3>
                <p className="mt-1 text-sm text-gray-600">
                  Find jobs, showcase skills, and connect with employers
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                updateFormData({ role: 'employer' });
                setStep(3);
              }}
              className={`flex items-start gap-4 rounded-xl border-3 p-5 text-left transition-all duration-300 hover:scale-105 hover:shadow-xl ${
                formData.role === 'employer' ? 'border-crewup-orange bg-gradient-to-r from-orange-50 to-orange-100 shadow-lg' : 'border-gray-300 hover:border-crewup-orange'
              }`}
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-crewup-orange to-crewup-light-orange text-white shadow-lg">
                <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">I'm an Employer</h3>
                <p className="mt-1 text-sm text-gray-600">
                  Post jobs, find skilled workers, and build your team
                </p>
              </div>
            </button>
          </div>

          <Button variant="outline" onClick={() => setStep(1)} className="w-full">
            Back
          </Button>

          <div className="flex justify-center gap-2">
            <div className="h-2 w-2 rounded-full bg-gray-300" />
            <div className="h-2 w-2 rounded-full bg-crewup-blue" />
            <div className="h-2 w-2 rounded-full bg-gray-300" />
            <div className="h-2 w-2 rounded-full bg-gray-300" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Step 3: Trade/Employer Type Selection
  if (step === 3) {
    return (
      <Card className="w-full max-w-md shadow-2xl border-2 border-crewup-light-blue">
        <CardContent className="p-6 space-y-6">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-crewup-blue to-crewup-orange shadow-lg">
              <span className="text-3xl">{formData.role === 'worker' ? '🔧' : '🏢'}</span>
            </div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-crewup-blue to-crewup-orange bg-clip-text text-transparent">
              {formData.role === 'worker' ? "What's your trade?" : 'Tell us about your business'}
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              {formData.role === 'worker'
                ? 'Select your primary trade'
                : 'Help workers understand what you do'}
            </p>
          </div>

          <div className="space-y-4">
            {formData.role === 'worker' ? (
              <>
                <Select
                  label="Trade"
                  options={TRADES.map((trade) => ({ value: trade, label: trade }))}
                  value={formData.trade}
                  onChange={(e) => updateFormData({ trade: e.target.value, sub_trade: '' })}
                  required
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
                  />
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Bio (Optional)
                  </label>
                  <textarea
                    className="flex min-h-[100px] w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-crewup-blue focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="Tell employers about your experience and skills..."
                    value={formData.bio || ''}
                    onChange={(e) => updateFormData({ bio: e.target.value })}
                  />
                  <p className="mt-1.5 text-sm text-gray-500">
                    Briefly describe your experience and what you're looking for
                  </p>
                </div>
              </>
            ) : (
              <>
                <Select
                  label="Employer Type"
                  options={EMPLOYER_TYPES.map((type) => ({
                    value: type,
                    label: type.charAt(0).toUpperCase() + type.slice(1)
                  }))}
                  value={formData.employer_type || ''}
                  onChange={(e) =>
                    updateFormData({
                      employer_type: e.target.value as 'contractor' | 'recruiter',
                    })
                  }
                  required
                />

                <Select
                  label="Trade Specialty"
                  options={TRADES.map((trade) => ({ value: trade, label: trade }))}
                  value={formData.trade}
                  onChange={(e) => updateFormData({ trade: e.target.value, sub_trade: '' })}
                  helperText="What type of workers do you hire?"
                  required
                />

                {formData.trade && TRADE_SUBCATEGORIES[formData.trade] && (
                  <Select
                    label="Sub-Specialty (Optional)"
                    options={TRADE_SUBCATEGORIES[formData.trade].map((subTrade) => ({
                      value: subTrade,
                      label: subTrade,
                    }))}
                    value={formData.sub_trade || ''}
                    onChange={(e) => updateFormData({ sub_trade: e.target.value })}
                  />
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Bio
                  </label>
                  <textarea
                    className="flex min-h-[100px] w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-crewup-blue focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="Tell workers about your company and what you're looking for..."
                    value={formData.bio || ''}
                    onChange={(e) => updateFormData({ bio: e.target.value })}
                  />
                  <p className="mt-1.5 text-sm text-gray-500">
                    Briefly describe your company and hiring needs
                  </p>
                </div>
              </>
            )}

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep(2)} className="flex-1">
                Back
              </Button>
              <Button
                onClick={() => setStep(4)}
                disabled={
                  formData.role === 'worker'
                    ? !formData.trade
                    : !formData.employer_type || !formData.trade
                }
                className="flex-1"
              >
                Continue
              </Button>
            </div>
          </div>

          <div className="flex justify-center gap-2">
            <div className="h-2 w-2 rounded-full bg-gray-300" />
            <div className="h-2 w-2 rounded-full bg-gray-300" />
            <div className="h-2 w-2 rounded-full bg-crewup-blue" />
            <div className="h-2 w-2 rounded-full bg-gray-300" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Step 4: Location
  return (
    <Card className="w-full max-w-md shadow-2xl border-2 border-crewup-light-blue">
      <CardContent className="p-6 space-y-6">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-crewup-blue to-crewup-orange shadow-lg">
            <span className="text-3xl">📍</span>
          </div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-crewup-blue to-crewup-orange bg-clip-text text-transparent">Where are you located?</h2>
          <p className="mt-2 text-sm text-gray-600">
            Help us connect you with nearby opportunities
          </p>
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-3">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <div className="space-y-4">
          <LocationAutocomplete
            label="City, State"
            placeholder="Chicago, IL"
            value={formData.location}
            onChange={(data) => updateFormData({ location: data.address, coords: data.coords })}
            helperText="We'll use this to show you relevant local jobs"
            required
          />

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep(3)} disabled={isLoading} className="flex-1">
              Back
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!formData.location || isLoading}
              isLoading={isLoading}
              className="flex-1"
            >
              Complete Setup
            </Button>
          </div>
        </div>

        <div className="flex justify-center gap-2">
          <div className="h-2 w-2 rounded-full bg-gray-300" />
          <div className="h-2 w-2 rounded-full bg-gray-300" />
          <div className="h-2 w-2 rounded-full bg-gray-300" />
          <div className="h-2 w-2 rounded-full bg-crewup-blue" />
        </div>
      </CardContent>
    </Card>
  );
}
