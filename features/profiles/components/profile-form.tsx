'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Input, Textarea, Select, Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { LocationAutocomplete, CollapsibleSection } from '@/components/common';
import { useUpdateProfile } from '../hooks/use-update-profile';
import { useUserLocation } from '@/hooks/use-user-location';
import { useToast } from '@/components/providers/toast-provider';
import { TRADES, TRADE_SUBCATEGORIES, EMPLOYER_TYPES } from '@/lib/constants';
import { CertificationForm } from './certification-form';
import { CertificationItem } from './certification-item';
import { ExperienceForm } from './experience-form';
import { ExperienceItem } from './experience-item';
import { EducationForm } from './education-form';
import { EducationItem } from './education-item';
import { ProfileAvatarUpload } from './profile-avatar-upload';
import { uploadProfilePicture } from '../actions/profile-picture-actions';

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
    company_name?: string | null;
    profile_image_url?: string | null;
  };
  certifications?: any[];
  workExperience?: any[];
  education?: any[];
};

export function ProfileForm({ initialData, certifications = [], workExperience = [], education = [] }: ProfileFormProps) {
  const router = useRouter();
  const updateProfile = useUpdateProfile();
  const locationState = useUserLocation();
  const toast = useToast();

  const [formData, setFormData] = useState({
    name: initialData.name || '',
    phone: initialData.phone || '',
    location: initialData.location || '',
    coords: initialData.coords || null,
    trade: initialData.trade || '',
    sub_trade: initialData.sub_trade || '',
    bio: initialData.bio || '',
    employer_type: initialData.employer_type || '',
    company_name: initialData.company_name || '',
  });

  const [error, setError] = useState<string | null>(null);
  const [selectedProfilePicture, setSelectedProfilePicture] = useState<File | null>(null);

  // State for showing/hiding forms
  const [showCertificationForm, setShowCertificationForm] = useState(false);
  const [showExperienceForm, setShowExperienceForm] = useState(false);
  const [showEducationForm, setShowEducationForm] = useState(false);

  // Update coords when location is fetched
  useEffect(() => {
    if (locationState.location && !formData.coords) {
      const coords = locationState.location;
      setFormData(prev => ({
        ...prev,
        coords: coords,
        // If location text is empty, fill with coords as fallback
        location: prev.location || `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`
      }));
    }
  }, [locationState.location, formData.coords]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      // Upload profile picture first if selected
      let profileImageUrl = initialData.profile_image_url;
      if (selectedProfilePicture) {
        const uploadResult = await uploadProfilePicture(selectedProfilePicture);
        if (!uploadResult.success) {
          setError(uploadResult.error || 'Failed to upload profile picture');
          toast.error(uploadResult.error || 'Failed to upload profile picture');
          return;
        }
        profileImageUrl = uploadResult.url;
      }

      await updateProfile.mutateAsync({
        name: formData.name,
        phone: formData.phone || null,
        location: formData.location,
        coords: formData.coords,
        trade: formData.trade,
        sub_trade: formData.sub_trade || null,
        bio: formData.bio,
        profile_image_url: profileImageUrl,
        ...(initialData.role === 'employer' && {
          employer_type: formData.employer_type || null,
          company_name: formData.company_name || null,
        }),
      });

      toast.success('Profile updated successfully!');
      router.push('/dashboard/profile');
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to update profile';
      setError(errorMsg);
      toast.error(errorMsg);
    }
  };

  const handleGetLocation = () => {
    locationState.requestLocation();
  };

  const formatPhoneNumber = (value: string): string => {
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
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setFormData({ ...formData, phone: formatted });
  };

  const availableSubTrades = formData.trade ? TRADE_SUBCATEGORIES[formData.trade] || [] : [];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Information */}
      <CollapsibleSection title="Basic Information" defaultOpen={true}>
        <div className="space-y-4">
          {/* Top Row: Profile Picture + Name/Email */}
          <div className="flex gap-6">
            {/* Profile Picture Upload - Left Side */}
            <div className="flex-shrink-0">
              <ProfileAvatarUpload
                currentImageUrl={initialData.profile_image_url || null}
                userName={initialData.name}
                userId={initialData.id}
                onImageSelected={(file) => setSelectedProfilePicture(file)}
                disabled={updateProfile.isPending}
              />
            </div>

            {/* Name and Email - Right Side */}
            <div className="flex-1 space-y-4">
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
            </div>
          </div>

          {/* Phone Number - Full Width */}
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number
            </label>
            <Input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={handlePhoneChange}
              placeholder="(555) 123-4567"
            />
          </div>

          {/* Bio - Full Width */}
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
        </div>
      </CollapsibleSection>

      {/* Trade Information */}
      <CollapsibleSection title="Trade Information" defaultOpen={true}>
        <div className="space-y-4">
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
        </div>
      </CollapsibleSection>

      {/* Employer Type (Employers Only) */}
      {initialData.role === 'employer' && (
        <CollapsibleSection title="Employer Information" defaultOpen={true}>
          <div className="space-y-4">
            <div>
              <label htmlFor="company_name" className="block text-sm font-medium text-gray-700 mb-1">
                Company/Business Name <span className="text-red-500">*</span>
              </label>
              <Input
                id="company_name"
                type="text"
                value={formData.company_name}
                onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                placeholder="ABC Construction LLC"
                required
                maxLength={100}
              />
              <p className="text-xs text-gray-500 mt-1">
                Your business name (will be shown on job postings)
              </p>
            </div>

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

            {/* Contractor Licenses (Contractors Only) */}
            {formData.employer_type === 'contractor' && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">Contractor Licenses</h4>
                    <p className="text-xs text-gray-500 mt-1">
                      Add your contractor licenses with verification documents
                    </p>
                  </div>
                  {!showCertificationForm && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowCertificationForm(true)}
                    >
                      Add License
                    </Button>
                  )}
                </div>

                {showCertificationForm && (
                  <CertificationForm
                    role={initialData.role}
                    employerType={formData.employer_type}
                    onSuccess={() => {
                      setShowCertificationForm(false);
                      router.refresh();
                    }}
                    onCancel={() => setShowCertificationForm(false)}
                  />
                )}

                {certifications && certifications.length > 0 ? (
                  <div className="space-y-3">
                    {certifications.map((cert: any) => (
                      <CertificationItem key={cert.id} cert={cert} />
                    ))}
                  </div>
                ) : (
                  !showCertificationForm && (
                    <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
                      <p>No licenses added yet</p>
                      <p className="text-sm mt-1">
                        Add your contractor licenses to verify your credentials
                      </p>
                    </div>
                  )
                )}
              </div>
            )}
          </div>
        </CollapsibleSection>
      )}

      {/* Location */}
      <CollapsibleSection title="Location" defaultOpen={true}>
        <div className="space-y-4">
          <LocationAutocomplete
            label="Address / City"
            value={formData.location}
            onChange={(data) => {
              setFormData({
                ...formData,
                location: data.address,
                coords: data.coords,
              });
            }}
            helperText="Start typing to see address suggestions"
            required
            placeholder="Chicago, IL"
          />

          {formData.coords && typeof formData.coords.lat === 'number' && typeof formData.coords.lng === 'number' && (
            <p className="text-xs text-green-600">
              ✓ Location coordinates saved ({formData.coords.lat.toFixed(4)}, {formData.coords.lng.toFixed(4)})
            </p>
          )}
        </div>
      </CollapsibleSection>

      {/* Certifications (Workers Only) */}
      {initialData.role === 'worker' && (
        <CollapsibleSection
          title="Certifications"
          defaultOpen={false}
          actions={
            !showCertificationForm && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowCertificationForm(true)}
              >
                Add Certification
              </Button>
            )
          }
        >
          <div className="space-y-4">
            {showCertificationForm && (
              <CertificationForm
                role={initialData.role}
                employerType={formData.employer_type}
                onSuccess={() => {
                  setShowCertificationForm(false);
                  router.refresh();
                }}
                onCancel={() => setShowCertificationForm(false)}
              />
            )}

            {certifications && certifications.length > 0 ? (
              <div className="space-y-3">
                {certifications.map((cert: any) => (
                  <CertificationItem key={cert.id} cert={cert} />
                ))}
              </div>
            ) : (
              !showCertificationForm && (
                <div className="text-center py-8 text-gray-500">
                  <p>No certifications added yet</p>
                  <p className="text-sm mt-1">
                    Add certifications to stand out to employers
                  </p>
                </div>
              )
            )}
          </div>
        </CollapsibleSection>
      )}

      {/* Work Experience (Workers Only) */}
      {initialData.role === 'worker' && (
        <CollapsibleSection
          title="Work Experience"
          defaultOpen={false}
          actions={
            !showExperienceForm && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowExperienceForm(true)}
              >
                Add Experience
              </Button>
            )
          }
        >
          <div className="space-y-4">
            {showExperienceForm && (
              <ExperienceForm
                onSuccess={() => {
                  setShowExperienceForm(false);
                  router.refresh();
                }}
                onCancel={() => setShowExperienceForm(false)}
              />
            )}

            {workExperience && workExperience.length > 0 ? (
              <div className="space-y-4">
                {workExperience.map((exp: any) => (
                  <ExperienceItem key={exp.id} exp={exp} />
                ))}
              </div>
            ) : (
              !showExperienceForm && (
                <div className="text-center py-8 text-gray-500">
                  <p>No work experience added yet</p>
                  <p className="text-sm mt-1">
                    Add your experience to showcase your skills
                  </p>
                </div>
              )
            )}
          </div>
        </CollapsibleSection>
      )}

      {/* Education (Workers Only) */}
      {initialData.role === 'worker' && (
        <CollapsibleSection
          title="Education"
          defaultOpen={false}
          actions={
            !showEducationForm && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowEducationForm(true)}
              >
                Add Education
              </Button>
            )
          }
        >
          <div className="space-y-4">
            {showEducationForm && (
              <EducationForm
                onSuccess={() => {
                  setShowEducationForm(false);
                  router.refresh();
                }}
                onCancel={() => setShowEducationForm(false)}
              />
            )}

            {education && education.length > 0 ? (
              <div className="space-y-3">
                {education.map((edu: any) => (
                  <EducationItem key={edu.id} education={edu} />
                ))}
              </div>
            ) : (
              !showEducationForm && (
                <div className="text-center py-8 text-gray-500">
                  <p>No education added yet</p>
                  <p className="text-sm mt-1">
                    Add your education to enhance your profile
                  </p>
                </div>
              )
            )}
          </div>
        </CollapsibleSection>
      )}

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
