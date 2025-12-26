'use client';

import { UseFormReturn, Controller } from 'react-hook-form';
import { ApplicationFormData } from '../../types/application.types';
import { Input } from '@/components/ui';

type Props = {
  form: UseFormReturn<Partial<ApplicationFormData>>;
};

/**
 * Format phone number to (XXX) XXX-XXXX format
 */
function formatPhoneNumber(value: string): string {
  // Remove all non-numeric characters
  const numbers = value.replace(/\D/g, '');

  // Format as (XXX) XXX-XXXX
  if (numbers.length === 0) return '';
  if (numbers.length <= 3) return `(${numbers}`;
  if (numbers.length <= 6) return `(${numbers.slice(0, 3)}) ${numbers.slice(3)}`;
  return `(${numbers.slice(0, 3)}) ${numbers.slice(3, 6)}-${numbers.slice(6, 10)}`;
}

/**
 * Get minimum date (tomorrow) in local timezone
 */
function getMinDate(): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  // Use local date format to avoid timezone issues
  const year = tomorrow.getFullYear();
  const month = String(tomorrow.getMonth() + 1).padStart(2, '0');
  const day = String(tomorrow.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get maximum date (1 year from now) in local timezone
 */
function getMaxDate(): string {
  const oneYearFromNow = new Date();
  oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
  const year = oneYearFromNow.getFullYear();
  const month = String(oneYearFromNow.getMonth() + 1).padStart(2, '0');
  const day = String(oneYearFromNow.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function Step3Contact({ form }: Props) {
  const {
    control,
    formState: { errors },
    setValue,
  } = form;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Contact & Availability</h2>
        <p className="text-gray-600">
          Provide your contact information and when you're available to start work.
        </p>
      </div>

      {/* Phone Number */}
      <div>
        <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-1">
          Phone Number <span className="text-red-500">*</span>
        </label>
        <Controller
          name="phoneNumber"
          control={control}
          render={({ field }) => (
            <Input
              {...field}
              id="phoneNumber"
              type="tel"
              placeholder="(555) 123-4567"
              maxLength={14}
              onChange={(e) => {
                const formatted = formatPhoneNumber(e.target.value);
                field.onChange(formatted);
                setValue('phoneNumber', formatted, { shouldValidate: true });
              }}
              className={errors.phoneNumber ? 'border-red-500' : ''}
            />
          )}
        />
        {errors.phoneNumber && (
          <p className="mt-1 text-sm text-red-600">{errors.phoneNumber.message}</p>
        )}
        <p className="mt-1 text-sm text-gray-500">
          We'll use this to contact you about your application
        </p>
      </div>

      {/* Available Start Date */}
      <div>
        <label
          htmlFor="availableStartDate"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Available Start Date <span className="text-red-500">*</span>
        </label>
        <Controller
          name="availableStartDate"
          control={control}
          render={({ field }) => (
            <Input
              {...field}
              id="availableStartDate"
              type="date"
              min={getMinDate()}
              max={getMaxDate()}
              className={errors.availableStartDate ? 'border-red-500' : ''}
            />
          )}
        />
        {errors.availableStartDate && (
          <p className="mt-1 text-sm text-red-600">{errors.availableStartDate.message}</p>
        )}
        <p className="mt-1 text-sm text-gray-500">
          What's the earliest date you could begin working?
        </p>
      </div>

      {/* Quick Options for Start Date */}
      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
        <h3 className="text-sm font-medium text-gray-900 mb-3">Quick Select</h3>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              const tomorrow = new Date();
              tomorrow.setDate(tomorrow.getDate() + 1);
              const year = tomorrow.getFullYear();
              const month = String(tomorrow.getMonth() + 1).padStart(2, '0');
              const day = String(tomorrow.getDate()).padStart(2, '0');
              setValue('availableStartDate', `${year}-${month}-${day}`, {
                shouldValidate: true,
              });
            }}
            className="px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Immediately (Tomorrow)
          </button>
          <button
            type="button"
            onClick={() => {
              const oneWeek = new Date();
              oneWeek.setDate(oneWeek.getDate() + 7);
              const year = oneWeek.getFullYear();
              const month = String(oneWeek.getMonth() + 1).padStart(2, '0');
              const day = String(oneWeek.getDate()).padStart(2, '0');
              setValue('availableStartDate', `${year}-${month}-${day}`, {
                shouldValidate: true,
              });
            }}
            className="px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            1 Week
          </button>
          <button
            type="button"
            onClick={() => {
              const twoWeeks = new Date();
              twoWeeks.setDate(twoWeeks.getDate() + 14);
              const year = twoWeeks.getFullYear();
              const month = String(twoWeeks.getMonth() + 1).padStart(2, '0');
              const day = String(twoWeeks.getDate()).padStart(2, '0');
              setValue('availableStartDate', `${year}-${month}-${day}`, {
                shouldValidate: true,
              });
            }}
            className="px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            2 Weeks
          </button>
          <button
            type="button"
            onClick={() => {
              const oneMonth = new Date();
              oneMonth.setDate(oneMonth.getDate() + 30);
              const year = oneMonth.getFullYear();
              const month = String(oneMonth.getMonth() + 1).padStart(2, '0');
              const day = String(oneMonth.getDate()).padStart(2, '0');
              setValue('availableStartDate', `${year}-${month}-${day}`, {
                shouldValidate: true,
              });
            }}
            className="px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            1 Month
          </button>
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
            <h3 className="text-sm font-medium text-blue-800">Your contact information</h3>
            <p className="mt-1 text-sm text-blue-700">
              This information will only be shared with the employer if they choose to contact you
              about this position. Your phone number will not be publicly visible.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
