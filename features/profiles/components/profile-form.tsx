'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Input, Textarea, Select, Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { LocationAutocomplete, CollapsibleSection } from '@/components/common';
import { useUpdateProfile } from '../hooks/use-update-profile';
import { useUserLocation } from '@/hooks/use-user-location';
import { useToast } from '@/components/providers/toast-provider';
import { TRADES, TRADE_SUBCATEGORIES, EMPLOYER_TYPES } from '@/lib/constants';
import { profileSchema, type ProfileSchema } from '../utils/validation';
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

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors, isSubmitting: isFormSubmitting },
  } = useForm<ProfileSchema>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: initialData.name || '',
      phone: initialData.phone || '',
      location: initialData.location || '',
      coords: initialData.coords || null,
      trade: initialData.trade || '',
      sub_trade: initialData.sub_trade || '',
      bio: initialData.bio || '',
      employer_type: initialData.employer_type || '',
      company_name: initialData.company_name || '',
    },
  });

  const [error, setError] = useState<string | null>(null);
  const [selectedProfilePicture, setSelectedProfilePicture] = useState<File | null>(null);

  // State for showing/hiding forms
  const [showCertificationForm, setShowCertificationForm] = useState(false);
  const [showExperienceForm, setShowExperienceForm] = useState(false);
  const [showEducationForm, setShowEducationForm] = useState(false);

  const watchTrade = watch('trade');
  const watchCoords = watch('coords');
  const watchBio = watch('bio') || '';

  // Update coords when location is fetched
  useEffect(() => {
    if (locationState.location && !watchCoords) {
      const coords = locationState.location;
      setValue('coords', coords);
      // If location text is empty, fill with coords as fallback
      const currentLocation = watch('location');
      if (!currentLocation) {
        setValue('location', `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`);
      }
    }
  }, [locationState.location, watchCoords, setValue, watch]);

  const onSubmit = async (data: ProfileSchema) => {
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
        name: data.name,
        phone: data.phone || null,
        location: data.location,
        coords: data.coords,
        trade: data.trade,
        sub_trade: data.sub_trade || null,
        bio: data.bio || null,
        profile_image_url: profileImageUrl,
        ...(initialData.role === 'employer' && {
          employer_type: data.employer_type || null,
          company_name: data.company_name || null,
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

  const availableSubTrades = watchTrade ? TRADE_SUBCATEGORIES[watchTrade] || [] : [];

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
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
                disabled={updateProfile.isPending || isFormSubmitting}
              />
            </div>

            {/* Name and Email - Right Side */}
            <div className="flex-1 space-y-4">
              <div>
                <Input
                  label="Full Name"
                  {...register('name')}
                  placeholder="John Doe"
                  required
                  maxLength={100}
                  error={errors.name?.message}
                  disabled={isFormSubmitting}
                />
              </div>

              <div>
                <Input
                  label="Email"
                  type="email"
                  value={initialData.email}
                  disabled
                  className="bg-gray-100 cursor-not-allowed"
                  helperText="Email cannot be changed"
                />
              </div>
            </div>
          </div>

          {/* Phone Number - Full Width */}
          <div>
            <Controller
              control={control}
              name="phone"
              render={({ field }) => (
                <Input
                  {...field}
                  label="Phone Number"
                  type="tel"
                  placeholder="(555) 123-4567"
                  onChange={(e) => {
                    const formatted = formatPhoneNumber(e.target.value);
                    field.onChange(formatted);
                  }}
                  error={errors.phone?.message}
                  disabled={isFormSubmitting}
                />
              )}
            />
          </div>

          {/* Bio - Full Width */}
          <div>
            <Textarea
              label="Bio"
              {...register('bio')}
              placeholder="Tell others about yourself..."
              rows={4}
              maxLength={500}
              error={errors.bio?.message}
              disabled={isFormSubmitting}
              helperText={`${watchBio.length}/500 characters`}
            />
          </div>
        </div>
      </CollapsibleSection>

      {/* Trade Information */}
      <CollapsibleSection title="Trade Information" defaultOpen={true}>
        <div className="space-y-4">
          <div>
            <Controller
              control={control}
              name="trade"
              render={({ field }) => (
                <Select
                  {...field}
                  label="Primary Trade"
                  options={TRADES.map((trade) => ({ value: trade, label: trade }))}
                  required
                  error={errors.trade?.message}
                  disabled={isFormSubmitting}
                  onChange={(e) => {
                    field.onChange(e.target.value);
                    setValue('sub_trade', '');
                  }}
                />
              )}
            />
          </div>

          {availableSubTrades.length > 0 && (
            <div>
              <Select
                label="Specialty"
                {...register('sub_trade')}
                options={[
                  { value: '', label: 'No specialty' },
                  ...availableSubTrades.map((subTrade) => ({ value: subTrade, label: subTrade })),
                ]}
                error={errors.sub_trade?.message}
                disabled={isFormSubmitting}
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
              <Input
                label="Company/Business Name"
                {...register('company_name')}
                placeholder="ABC Construction LLC"
                required
                maxLength={100}
                error={errors.company_name?.message}
                disabled={isFormSubmitting}
                helperText="Your business name (will be shown on job postings)"
              />
            </div>

            <div>
              <Select
                label="Employer Type"
                {...register('employer_type')}
                options={[
                  { value: '', label: 'Select type' },
                  ...EMPLOYER_TYPES.map((type) => ({
                    value: type,
                    label: type.charAt(0).toUpperCase() + type.slice(1),
                  })),
                ]}
                error={errors.employer_type?.message}
                disabled={isFormSubmitting}
              />
            </div>

            {/* Contractor Licenses (Contractors Only) */}
            {watch('employer_type') === 'contractor' && (
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
                    employerType={watch('employer_type')}
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
          <Controller
            control={control}
            name="location"
            render={({ field }) => (
              <LocationAutocomplete
                label="Address / City"
                value={field.value}
                onChange={(data) => {
                  field.onChange(data.address);
                  setValue('coords', data.coords);
                }}
                helperText="Start typing to see address suggestions"
                required
                placeholder="Chicago, IL"
                error={errors.location?.message}
                disabled={isFormSubmitting}
              />
            )}
          />

          {watchCoords && typeof watchCoords.lat === 'number' && typeof watchCoords.lng === 'number' && (
            <p className="text-xs text-green-600">
              ✓ Location coordinates saved ({watchCoords.lat.toFixed(4)}, {watchCoords.lng.toFixed(4)})
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
                employerType={watch('employer_type')}
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
          isLoading={updateProfile.isPending || isFormSubmitting}
          className="w-full"
        >
          {updateProfile.isPending || isFormSubmitting ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </form>
  );
}
