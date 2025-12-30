'use client';

import { useState, useEffect } from 'react';
import { Button, Input, Select, Card, CardContent } from '@/components/ui';
import { TRADES, TRADE_SUBCATEGORIES, EMPLOYER_TYPES } from '@/lib/constants';
import { completeOnboarding, type OnboardingData } from '../actions/onboarding-actions';
import { uploadCertificationPhoto } from '@/features/profiles/actions/certification-actions';

type Props = {
  initialName?: string;
  initialEmail?: string;
};

export function OnboardingForm({ initialName = '', initialEmail = '' }: Props) {
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [locationStatus, setLocationStatus] = useState<'loading' | 'success' | 'error' | null>(null);

  const [formData, setFormData] = useState<OnboardingData>({
    name: initialName,
    role: 'worker',
    trade: '',
    location: '',
    phone: '',
    email: initialEmail,
  });

  // License state for contractors
  const [licenseFile, setLicenseFile] = useState<File | null>(null);
  const [licensePreview, setLicensePreview] = useState<string | null>(null);
  const [isUploadingLicense, setIsUploadingLicense] = useState(false);
  const [licenseData, setLicenseData] = useState({
    license_type: '',
    license_number: '',
    issuing_authority: '',
    issuing_state: '',
    issue_date: '',
    expires_at: '',
  });

  // Capture device location on component mount
  useEffect(() => {
    captureLocation();
  }, []);

  async function captureLocation() {
    setLocationStatus('loading');

    if (!navigator.geolocation) {
      console.warn('[captureLocation] Geolocation not supported by browser');
      setLocationStatus('error');
      return;
    }

    console.log('[captureLocation] Requesting high-accuracy GPS location...');

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        console.log('[captureLocation] GPS success!', {
          lat: latitude,
          lng: longitude,
          accuracy: `${accuracy}m`
        });

        try {
          // Reverse geocode to get address
          const address = await reverseGeocode(latitude, longitude);

          updateFormData({
            location: address,
            coords: { lat: latitude, lng: longitude }
          });

          setLocationStatus('success');
        } catch (err) {
          console.error('[captureLocation] Reverse geocoding failed:', err);
          // Still save coords even if reverse geocoding fails
          updateFormData({
            location: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
            coords: { lat: latitude, lng: longitude }
          });
          setLocationStatus('success');
        }
      },
      (error) => {
        console.error('[captureLocation] Geolocation error:', {
          code: error.code,
          message: error.message,
          PERMISSION_DENIED: error.code === 1,
          POSITION_UNAVAILABLE: error.code === 2,
          TIMEOUT: error.code === 3
        });

        // Don't use fallback - let user know location is required
        setLocationStatus('error');

        if (error.code === 1) {
          // Permission denied - could ask user to enable
          console.warn('[captureLocation] User denied location permission');
        } else if (error.code === 3) {
          // Timeout - GPS took too long
          console.warn('[captureLocation] GPS timeout - try again or check device settings');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 30000, // Increased to 30 seconds for GPS lock
        maximumAge: 0 // Don't use cached location
      }
    );
  }

  async function reverseGeocode(lat: number, lng: number): Promise<string> {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
      console.error('[reverseGeocode] API key not configured');
      throw new Error('Google Maps API key not configured');
    }

    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`;
    console.log('[reverseGeocode] Requesting:', url.replace(apiKey, 'API_KEY_HIDDEN'));

    const response = await fetch(url);

    if (!response.ok) {
      console.error('[reverseGeocode] HTTP error:', response.status, response.statusText);
      throw new Error(`Geocoding request failed: ${response.status}`);
    }

    const data = await response.json();
    console.log('[reverseGeocode] API response:', {
      status: data.status,
      resultsCount: data.results?.length || 0,
      errorMessage: data.error_message
    });

    if (data.status !== 'OK') {
      // Handle specific API error statuses
      if (data.status === 'REQUEST_DENIED') {
        throw new Error(`API access denied: ${data.error_message || 'Check API key and enabled APIs'}`);
      } else if (data.status === 'ZERO_RESULTS') {
        throw new Error('No address found for these coordinates');
      } else if (data.status === 'OVER_QUERY_LIMIT') {
        throw new Error('API quota exceeded');
      } else {
        throw new Error(`Geocoding failed: ${data.status} - ${data.error_message || 'Unknown error'}`);
      }
    }

    if (!data.results || data.results.length === 0) {
      throw new Error('No address found');
    }

    // Return the formatted address
    const address = data.results[0].formatted_address;
    console.log('[reverseGeocode] Success! Address:', address);
    return address;
  }

  function updateFormData(updates: Partial<OnboardingData>) {
    setFormData((prev) => ({ ...prev, ...updates }));
  }

  function formatPhoneNumber(value: string): string {
    // Remove all non-numeric characters
    const phoneNumber = value.replace(/\D/g, '');

    // Limit to 10 digits
    const limited = phoneNumber.slice(0, 10);

    // Format as (XXX)XXX-XXXX
    if (limited.length === 0) {
      return '';
    } else if (limited.length <= 3) {
      return `(${limited}`;
    } else if (limited.length <= 6) {
      return `(${limited.slice(0, 3)})${limited.slice(3)}`;
    } else {
      return `(${limited.slice(0, 3)})${limited.slice(3, 6)}-${limited.slice(6)}`;
    }
  }

  function handlePhoneChange(e: React.ChangeEvent<HTMLInputElement>) {
    const formatted = formatPhoneNumber(e.target.value);
    updateFormData({ phone: formatted });
  }

  async function handleSubmit() {
    setError('');
    setIsLoading(true);

    try {
      // If contractor, upload license first
      let licensePhotoUrl = null;
      if (formData.employer_type === 'contractor' && licenseFile) {
        setIsUploadingLicense(true);

        // Use existing uploadCertificationPhoto action
        const uploadResult = await uploadCertificationPhoto(licenseFile);
        setIsUploadingLicense(false);

        if (!uploadResult.success) {
          const errorMsg = uploadResult.error || 'Failed to upload license photo';
          setError(errorMsg);
          setIsLoading(false);
          return;
        }

        licensePhotoUrl = uploadResult.data.url;
      }

      // Complete onboarding with license data
      const result = await completeOnboarding({
        ...formData,
        licenseData:
          formData.employer_type === 'contractor' && licensePhotoUrl
            ? {
                ...licenseData,
                photo_url: licensePhotoUrl,
              }
            : undefined,
      });

      if (!result.success) {
        setError(result.error || 'Failed to complete onboarding');
        setIsLoading(false);
        return;
      }

      // Success! Redirect to dashboard
      window.location.href = '/dashboard/feed';
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
      setIsLoading(false);
    }
  }

  // Step 1: Name, Phone, Email
  if (step === 1) {
    return (
      <Card className="w-full max-w-md shadow-2xl border-2 border-krewup-light-blue">
        <CardContent className="p-6 space-y-6">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-krewup-blue to-krewup-orange shadow-lg">
              <span className="text-3xl">👋</span>
            </div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-krewup-blue to-krewup-orange bg-clip-text text-transparent">Welcome to KrewUp!</h2>
            <p className="mt-2 text-sm text-gray-600">Let's set up your profile</p>
          </div>

          <div className="space-y-4">
            {/* Location Status Indicator */}
            {locationStatus && (
              <div className={`flex items-center justify-between gap-2 rounded-lg p-3 text-sm ${
                locationStatus === 'loading' ? 'bg-blue-50 text-blue-700' :
                locationStatus === 'success' ? 'bg-green-50 text-green-700' :
                'bg-red-50 text-red-700'
              }`}>
                <div className="flex items-center gap-2">
                  {locationStatus === 'loading' && (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-700 border-t-transparent"></div>
                      <span>Capturing your location... (this may take up to 30 seconds)</span>
                    </>
                  )}
                  {locationStatus === 'success' && (
                    <>
                      <span>📍</span>
                      <span>Location captured: {formData.location || 'Processing...'}</span>
                    </>
                  )}
                  {locationStatus === 'error' && (
                    <>
                      <span>❌</span>
                      <span>Location access failed. Please enable location permissions and try again.</span>
                    </>
                  )}
                </div>
                {locationStatus === 'error' && (
                  <button
                    type="button"
                    onClick={captureLocation}
                    className="px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-100 rounded border border-red-300"
                  >
                    Retry
                  </button>
                )}
              </div>
            )}

            <Input
              label="Full Name"
              type="text"
              placeholder="John Doe"
              value={formData.name}
              onChange={(e) => updateFormData({ name: e.target.value })}
              required
            />

            <Input
              label="Phone Number"
              type="tel"
              placeholder="(555) 123-4567"
              value={formData.phone}
              onChange={handlePhoneChange}
              required
            />

            <Input
              label="Email"
              type="email"
              placeholder="john@example.com"
              value={formData.email}
              onChange={(e) => updateFormData({ email: e.target.value })}
              required
            />

            <Button
              className="w-full"
              onClick={() => setStep(2)}
              disabled={!formData.name || !formData.phone || !formData.email || formData.name.length < 2}
            >
              Continue
            </Button>
          </div>

          <div className="flex justify-center gap-2">
            <div className="h-2 w-2 rounded-full bg-krewup-blue" />
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
      <Card className="w-full max-w-md shadow-2xl border-2 border-krewup-light-blue">
        <CardContent className="p-6 space-y-6">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-krewup-blue to-krewup-orange shadow-lg">
              <span className="text-3xl">🎯</span>
            </div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-krewup-blue to-krewup-orange bg-clip-text text-transparent">What brings you here?</h2>
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
                formData.role === 'worker' ? 'border-krewup-blue bg-gradient-to-r from-blue-50 to-blue-100 shadow-lg' : 'border-gray-300 hover:border-krewup-blue'
              }`}
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-krewup-blue to-krewup-light-blue text-white shadow-lg">
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
                formData.role === 'employer' ? 'border-krewup-orange bg-gradient-to-r from-orange-50 to-orange-100 shadow-lg' : 'border-gray-300 hover:border-krewup-orange'
              }`}
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-krewup-orange to-krewup-light-orange text-white shadow-lg">
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
            <div className="h-2 w-2 rounded-full bg-krewup-blue" />
            <div className="h-2 w-2 rounded-full bg-gray-300" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Step 3: Trade/Employer Type Selection
  if (step === 3) {
    return (
      <Card className="w-full max-w-md shadow-2xl border-2 border-krewup-light-blue">
        <CardContent className="p-6 space-y-6">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-krewup-blue to-krewup-orange shadow-lg">
              <span className="text-3xl">{formData.role === 'worker' ? '🔧' : '🏢'}</span>
            </div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-krewup-blue to-krewup-orange bg-clip-text text-transparent">
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
                    className="flex min-h-[100px] w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-krewup-blue focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"
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

                <Input
                  label="Company/Business Name"
                  type="text"
                  placeholder="ABC Construction LLC"
                  value={formData.company_name || ''}
                  onChange={(e) => updateFormData({ company_name: e.target.value })}
                  helperText="Your business name (will be shown on job postings)"
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
                    Bio (Optional)
                  </label>
                  <textarea
                    className="flex min-h-[100px] w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-krewup-blue focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="Tell workers about your company and what you're looking for..."
                    value={formData.bio || ''}
                    onChange={(e) => updateFormData({ bio: e.target.value })}
                  />
                  <p className="mt-1.5 text-sm text-gray-500">
                    Briefly describe your company and hiring needs
                  </p>
                </div>

                {/* Contractor License Upload Section */}
                {formData.employer_type === 'contractor' && (
                  <div className="mt-6 p-4 border-2 border-blue-300 bg-blue-50 rounded-lg">
                    <h3 className="font-semibold text-blue-900 mb-1">
                      Contractor License Required
                    </h3>
                    <p className="text-sm text-blue-800 mb-4">
                      To ensure platform trust and safety, you must upload your contractor license.
                      You won't be able to post jobs until your license is verified (usually within 24-48 hours).
                    </p>

                    <div className="space-y-4 bg-white p-4 rounded-lg">
                      <Input
                        label="License Type"
                        type="text"
                        placeholder="e.g., General Contractor License"
                        value={licenseData.license_type}
                        onChange={(e) =>
                          setLicenseData({ ...licenseData, license_type: e.target.value })
                        }
                        required
                        helperText="Your contractor license classification"
                      />

                      <Input
                        label="License Number"
                        type="text"
                        placeholder="e.g., 123456"
                        value={licenseData.license_number}
                        onChange={(e) =>
                          setLicenseData({ ...licenseData, license_number: e.target.value })
                        }
                        required
                        helperText="Your state-issued license number"
                      />

                      <Input
                        label="Issuing Authority"
                        type="text"
                        placeholder="e.g., California Contractors State License Board"
                        value={licenseData.issuing_authority}
                        onChange={(e) =>
                          setLicenseData({ ...licenseData, issuing_authority: e.target.value })
                        }
                        required
                        helperText="The organization that issued your license"
                      />

                      <Input
                        label="Issuing State"
                        type="text"
                        placeholder="e.g., California"
                        value={licenseData.issuing_state}
                        onChange={(e) =>
                          setLicenseData({ ...licenseData, issuing_state: e.target.value })
                        }
                        required
                        helperText="State that issued your license"
                      />

                      <Input
                        label="Date Issued"
                        type="date"
                        value={licenseData.issue_date}
                        onChange={(e) =>
                          setLicenseData({ ...licenseData, issue_date: e.target.value })
                        }
                        required
                        helperText="When your license was issued"
                      />

                      <Input
                        label="Expiration Date"
                        type="date"
                        value={licenseData.expires_at}
                        onChange={(e) =>
                          setLicenseData({ ...licenseData, expires_at: e.target.value })
                        }
                        required
                        helperText="When your license expires"
                      />

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          License Photo <span className="text-red-500">*</span>
                        </label>
                        <p className="text-xs text-gray-600 mb-3">
                          Upload a clear photo of your contractor license (JPEG, PNG, WebP, or PDF - Max 5MB)
                        </p>

                        {!licensePreview ? (
                          <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                              <svg
                                className="w-8 h-8 mb-2 text-gray-400"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                                />
                              </svg>
                              <p className="mb-1 text-sm text-gray-500">
                                <span className="font-semibold">Click to upload</span> or drag and drop
                              </p>
                              <p className="text-xs text-gray-500">Image or PDF (MAX. 5MB)</p>
                            </div>
                            <input
                              type="file"
                              className="hidden"
                              accept="image/jpeg,image/jpg,image/png,image/webp,application/pdf"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  setLicenseFile(file);
                                  const reader = new FileReader();
                                  reader.onloadend = () => {
                                    setLicensePreview(reader.result as string);
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }}
                              required
                            />
                          </label>
                        ) : (
                          <div className="space-y-3">
                            {licenseFile?.type === 'application/pdf' ? (
                              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                                <svg className="w-10 h-10 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" />
                                </svg>
                                <div className="flex-1">
                                  <p className="text-sm font-medium text-gray-900">{licenseFile.name}</p>
                                  <p className="text-xs text-gray-500">
                                    {(licenseFile.size / 1024 / 1024).toFixed(2)} MB
                                  </p>
                                </div>
                              </div>
                            ) : (
                              <img
                                src={licensePreview}
                                alt="License preview"
                                className="w-full max-h-64 object-contain rounded-lg border border-gray-200"
                              />
                            )}
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => {
                                setLicenseFile(null);
                                setLicensePreview(null);
                              }}
                              className="w-full"
                            >
                              Remove Photo
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-3">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep(2)} disabled={isLoading} className="flex-1">
                Back
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={
                  isLoading ||
                  (formData.role === 'worker'
                    ? !formData.trade
                    : !formData.employer_type ||
                      !formData.company_name ||
                      !formData.trade ||
                      (formData.employer_type === 'contractor' &&
                        (!licenseData.license_type ||
                          !licenseData.license_number ||
                          !licenseData.issuing_authority ||
                          !licenseData.issuing_state ||
                          !licenseData.issue_date ||
                          !licenseData.expires_at ||
                          !licenseFile)))
                }
                isLoading={isLoading || isUploadingLicense}
                className="flex-1"
              >
                {isUploadingLicense ? 'Uploading License...' : 'Complete Setup'}
              </Button>
            </div>
          </div>

          <div className="flex justify-center gap-2">
            <div className="h-2 w-2 rounded-full bg-gray-300" />
            <div className="h-2 w-2 rounded-full bg-gray-300" />
            <div className="h-2 w-2 rounded-full bg-krewup-blue" />
          </div>
        </CardContent>
      </Card>
    );
  }
}
