'use client';

import { UseFormReturn, Controller } from 'react-hook-form';
import { ApplicationFormData } from '../../types/application.types';
import { Input } from '@/components/ui';

type Props = {
  form: UseFormReturn<Partial<ApplicationFormData>>;
};

const US_STATES = [
  { code: 'AL', name: 'Alabama' },
  { code: 'AK', name: 'Alaska' },
  { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' },
  { code: 'CA', name: 'California' },
  { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' },
  { code: 'DE', name: 'Delaware' },
  { code: 'FL', name: 'Florida' },
  { code: 'GA', name: 'Georgia' },
  { code: 'HI', name: 'Hawaii' },
  { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' },
  { code: 'IN', name: 'Indiana' },
  { code: 'IA', name: 'Iowa' },
  { code: 'KS', name: 'Kansas' },
  { code: 'KY', name: 'Kentucky' },
  { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' },
  { code: 'MD', name: 'Maryland' },
  { code: 'MA', name: 'Massachusetts' },
  { code: 'MI', name: 'Michigan' },
  { code: 'MN', name: 'Minnesota' },
  { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' },
  { code: 'MT', name: 'Montana' },
  { code: 'NE', name: 'Nebraska' },
  { code: 'NV', name: 'Nevada' },
  { code: 'NH', name: 'New Hampshire' },
  { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' },
  { code: 'NY', name: 'New York' },
  { code: 'NC', name: 'North Carolina' },
  { code: 'ND', name: 'North Dakota' },
  { code: 'OH', name: 'Ohio' },
  { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' },
  { code: 'PA', name: 'Pennsylvania' },
  { code: 'RI', name: 'Rhode Island' },
  { code: 'SC', name: 'South Carolina' },
  { code: 'SD', name: 'South Dakota' },
  { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' },
  { code: 'UT', name: 'Utah' },
  { code: 'VT', name: 'Vermont' },
  { code: 'VA', name: 'Virginia' },
  { code: 'WA', name: 'Washington' },
  { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' },
  { code: 'WY', name: 'Wyoming' },
];

export function Step2PersonalInfo({ form }: Props) {
  const {
    control,
    formState: { errors },
  } = form;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Personal Information</h2>
        <p className="text-gray-600">
          Provide your full legal name and current mailing address.
        </p>
      </div>

      {/* Full Name */}
      <div>
        <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">
          Full Legal Name <span className="text-red-500">*</span>
        </label>
        <Controller
          name="fullName"
          control={control}
          render={({ field }) => (
            <Input
              {...field}
              id="fullName"
              type="text"
              placeholder="John Doe"
              className={errors.fullName ? 'border-red-500' : ''}
            />
          )}
        />
        {errors.fullName && (
          <p className="mt-1 text-sm text-red-600">{errors.fullName.message}</p>
        )}
      </div>

      {/* Address Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Mailing Address</h3>

        {/* Street Address */}
        <div>
          <label htmlFor="address.street" className="block text-sm font-medium text-gray-700 mb-1">
            Street Address <span className="text-red-500">*</span>
          </label>
          <Controller
            name="address.street"
            control={control}
            render={({ field }) => (
              <Input
                {...field}
                id="address.street"
                type="text"
                placeholder="123 Main St, Apt 4B"
                className={errors.address?.street ? 'border-red-500' : ''}
              />
            )}
          />
          {errors.address?.street && (
            <p className="mt-1 text-sm text-red-600">{errors.address.street.message}</p>
          )}
        </div>

        {/* City and State */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="address.city" className="block text-sm font-medium text-gray-700 mb-1">
              City <span className="text-red-500">*</span>
            </label>
            <Controller
              name="address.city"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  id="address.city"
                  type="text"
                  placeholder="Chicago"
                  className={errors.address?.city ? 'border-red-500' : ''}
                />
              )}
            />
            {errors.address?.city && (
              <p className="mt-1 text-sm text-red-600">{errors.address.city.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="address.state" className="block text-sm font-medium text-gray-700 mb-1">
              State <span className="text-red-500">*</span>
            </label>
            <Controller
              name="address.state"
              control={control}
              render={({ field }) => (
                <select
                  {...field}
                  id="address.state"
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.address?.state ? 'border-red-500' : 'border-gray-300'
                  }`}
                >
                  <option value="">Select State</option>
                  {US_STATES.map((state) => (
                    <option key={state.code} value={state.code}>
                      {state.name}
                    </option>
                  ))}
                </select>
              )}
            />
            {errors.address?.state && (
              <p className="mt-1 text-sm text-red-600">{errors.address.state.message}</p>
            )}
          </div>
        </div>

        {/* ZIP Code */}
        <div>
          <label htmlFor="address.zipCode" className="block text-sm font-medium text-gray-700 mb-1">
            ZIP Code <span className="text-red-500">*</span>
          </label>
          <Controller
            name="address.zipCode"
            control={control}
            render={({ field }) => (
              <Input
                {...field}
                id="address.zipCode"
                type="text"
                placeholder="60601"
                maxLength={10}
                className={errors.address?.zipCode ? 'border-red-500' : ''}
              />
            )}
          />
          {errors.address?.zipCode && (
            <p className="mt-1 text-sm text-red-600">{errors.address.zipCode.message}</p>
          )}
          <p className="mt-1 text-sm text-gray-500">Format: 12345 or 12345-6789</p>
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg
              className="h-5 w-5 text-blue-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">Auto-populated from resume</h3>
            <p className="mt-1 text-sm text-blue-700">
              If you uploaded a resume in Step 1, we may have automatically filled in some of these
              fields. Please review and update as needed.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
