'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Input, Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { useToast } from '@/components/providers/toast-provider';
import { addCertification, uploadCertificationPhoto } from '../actions/certification-actions';
import {
  ALL_CERTIFICATIONS,
  CERTIFICATION_CATEGORIES,
  ALL_LICENSES,
  LICENSE_CATEGORIES,
} from '@/lib/constants';

type Props = {
  role?: string;
  employerType?: string | null;
  onSuccess?: () => void;
  onCancel?: () => void;
};

export function CertificationForm({ role = 'worker', employerType, onSuccess, onCancel }: Props) {
  const router = useRouter();
  const toast = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  // Determine credential type based on user role
  const isContractor = role === 'employer' && employerType === 'contractor';
  const credentialCategory = isContractor ? 'license' : 'certification';
  const credentialLabel = isContractor ? 'License' : 'Certification';
  const availableCategories = isContractor ? LICENSE_CATEGORIES : CERTIFICATION_CATEGORIES;
  const flatOptions = isContractor ? ALL_LICENSES : ALL_CERTIFICATIONS;

  const [formData, setFormData] = useState({
    selectedCategory: '',
    certification_type: '',
    customCertification: '',
    certification_number: '',
    issued_by: '',
    issue_date: '',
    expires_at: '',
  });

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPhotoFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPhotoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
    setPhotoUrl(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const certType =
        formData.certification_type === 'custom'
          ? formData.customCertification
          : formData.certification_type;

      if (!certType) {
        setError(`Please select or enter a ${credentialLabel.toLowerCase()} type`);
        setIsLoading(false);
        return;
      }

      // Validate required fields
      if (!formData.certification_number) {
        setError('Certification number is required for verification');
        setIsLoading(false);
        return;
      }

      if (!formData.issued_by) {
        setError('Issuing organization is required for verification');
        setIsLoading(false);
        return;
      }

      if (!photoFile && !photoUrl) {
        setError('Certification photo is required for verification');
        setIsLoading(false);
        return;
      }

      // Upload photo if provided
      let uploadedPhotoUrl = photoUrl;
      if (photoFile && !photoUrl) {
        setIsUploading(true);
        const uploadResult = await uploadCertificationPhoto(photoFile);
        setIsUploading(false);

        if (!uploadResult.success) {
          const errorMsg = uploadResult.error || 'Failed to upload photo';
          setError(errorMsg);
          toast.error(errorMsg);
          setIsLoading(false);
          return;
        }

        uploadedPhotoUrl = uploadResult.data.url;
        setPhotoUrl(uploadedPhotoUrl);
      }

      const result = await addCertification({
        credential_category: credentialCategory,
        certification_type: certType,
        certification_number: formData.certification_number, // Required
        issued_by: formData.issued_by, // Required
        issue_date: formData.issue_date || undefined,
        expires_at: formData.expires_at || undefined,
        photo_url: uploadedPhotoUrl!, // Required
      });

      if (!result.success) {
        const errorMsg = result.error || `Failed to add ${credentialLabel.toLowerCase()}`;
        setError(errorMsg);
        toast.error(errorMsg);
        setIsLoading(false);
        return;
      }

      toast.success(`${credentialLabel} added successfully!`);
      if (onSuccess) {
        onSuccess();
      } else {
        router.push('/dashboard/profile');
        router.refresh();
      }
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to add certification';
      setError(errorMsg);
      toast.error(errorMsg);
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{credentialLabel} Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Category selection for organized options */}
          {Object.keys(availableCategories).length > 1 && (
            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                Category
              </label>
              <select
                id="category"
                value={formData.selectedCategory}
                onChange={(e) => {
                  setFormData({
                    ...formData,
                    selectedCategory: e.target.value,
                    certification_type: '', // Reset selection when category changes
                  });
                }}
                className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-krewup-blue focus:border-transparent"
              >
                <option value="">All {credentialLabel}s</option>
                {Object.keys(availableCategories).map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label htmlFor="certification_type" className="block text-sm font-medium text-gray-700 mb-1">
              {credentialLabel} Type <span className="text-red-500">*</span>
            </label>
            <select
              id="certification_type"
              value={formData.certification_type}
              onChange={(e) =>
                setFormData({ ...formData, certification_type: e.target.value })
              }
              className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-krewup-blue focus:border-transparent"
              required
            >
              <option value="">Select a {credentialLabel.toLowerCase()}</option>

              {/* Show filtered options based on selected category */}
              {formData.selectedCategory ? (
                (availableCategories[formData.selectedCategory as keyof typeof availableCategories] as readonly string[] || []).map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))
              ) : (
                /* Show all options if no category selected */
                flatOptions.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))
              )}

              <option value="custom">Other (specify below)</option>
            </select>
          </div>

          {formData.certification_type === 'custom' && (
            <div>
              <label htmlFor="customCertification" className="block text-sm font-medium text-gray-700 mb-1">
                Custom {credentialLabel} Name <span className="text-red-500">*</span>
              </label>
              <Input
                id="customCertification"
                type="text"
                value={formData.customCertification}
                onChange={(e) =>
                  setFormData({ ...formData, customCertification: e.target.value })
                }
                placeholder={`Enter ${credentialLabel.toLowerCase()} name`}
                required
                maxLength={100}
              />
            </div>
          )}

          <div>
            <label htmlFor="certification_number" className="block text-sm font-medium text-gray-700 mb-1">
              {credentialLabel} Number <span className="text-red-500">*</span>
            </label>
            <Input
              id="certification_number"
              type="text"
              value={formData.certification_number}
              onChange={(e) => setFormData({ ...formData, certification_number: e.target.value })}
              placeholder="e.g., 123456789"
              maxLength={100}
              required
            />
            <p className="text-xs text-gray-500 mt-1">Required for verification purposes</p>
          </div>

          <div>
            <label htmlFor="issued_by" className="block text-sm font-medium text-gray-700 mb-1">
              Issuing Organization <span className="text-red-500">*</span>
            </label>
            <Input
              id="issued_by"
              type="text"
              value={formData.issued_by}
              onChange={(e) => setFormData({ ...formData, issued_by: e.target.value })}
              placeholder="e.g., OSHA, Red Cross"
              maxLength={100}
              required
            />
            <p className="text-xs text-gray-500 mt-1">Required for verification purposes</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="issue_date" className="block text-sm font-medium text-gray-700 mb-1">
                Issue Date
              </label>
              <Input
                id="issue_date"
                type="date"
                value={formData.issue_date}
                onChange={(e) => setFormData({ ...formData, issue_date: e.target.value })}
              />
            </div>

            <div>
              <label htmlFor="expires_at" className="block text-sm font-medium text-gray-700 mb-1">
                Expiration Date
              </label>
              <Input
                id="expires_at"
                type="date"
                value={formData.expires_at}
                onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
                min={formData.issue_date || undefined}
              />
              <p className="text-xs text-gray-500 mt-1">Leave blank if never expires</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {credentialLabel} Photo <span className="text-red-500">*</span>
            </label>
            <p className="text-xs text-gray-500 mb-3">
              Upload a photo of your {credentialLabel.toLowerCase()} document (JPEG, PNG, WebP, or PDF - Max 5MB) - Required for verification
            </p>

            {!photoPreview ? (
              <div className="flex items-center justify-center w-full">
                <label
                  htmlFor="photo-upload"
                  className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <svg
                      className="w-8 h-8 mb-3 text-gray-400"
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
                    <p className="mb-2 text-sm text-gray-500">
                      <span className="font-semibold">Click to upload</span> or drag and drop
                    </p>
                    <p className="text-xs text-gray-500">Image or PDF (MAX. 5MB)</p>
                  </div>
                  <input
                    id="photo-upload"
                    type="file"
                    className="hidden"
                    accept="image/jpeg,image/jpg,image/png,image/webp,application/pdf"
                    onChange={handlePhotoChange}
                    disabled={isLoading}
                  />
                </label>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="relative">
                  {photoFile?.type === 'application/pdf' ? (
                    <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <svg
                        className="w-10 h-10 text-red-500"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" />
                      </svg>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{photoFile.name}</p>
                        <p className="text-xs text-gray-500">
                          {(photoFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                  ) : (
                    <img
                      src={photoPreview}
                      alt="Certification preview"
                      className="w-full max-h-64 object-contain rounded-lg border border-gray-200"
                    />
                  )}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleRemovePhoto}
                  disabled={isLoading}
                  className="w-full"
                >
                  Remove Photo
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <div className="flex gap-4">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="w-full"
          >
            Cancel
          </Button>
        )}
        {!onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/dashboard/profile')}
            className="w-full"
          >
            Cancel
          </Button>
        )}
        <Button type="submit" variant="primary" isLoading={isLoading || isUploading} className="w-full">
          {isUploading ? 'Uploading photo...' : isLoading ? 'Adding...' : `Add ${credentialLabel}`}
        </Button>
      </div>
    </form>
  );
}
