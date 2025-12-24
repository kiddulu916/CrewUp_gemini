'use client';

import { UseFormReturn, Controller } from 'react-hook-form';
import { ApplicationFormData } from '../../types/application.types';

type Props = {
  form: UseFormReturn<Partial<ApplicationFormData>>;
};

export function Step4WorkAuth({ form }: Props) {
  const {
    control,
    formState: { errors },
    watch,
  } = form;

  const hasDriversLicense = watch('hasDriversLicense');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Work Authorization</h2>
        <p className="text-gray-600">
          Confirm your authorization to work and transportation requirements for this position.
        </p>
      </div>

      {/* Authorized to Work */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <Controller
          name="authorizedToWork"
          control={control}
          render={({ field }) => (
            <label className="flex items-start cursor-pointer">
              <input
                type="checkbox"
                checked={field.value || false}
                onChange={(e) => field.onChange(e.target.checked)}
                className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <div className="ml-3">
                <span className="text-sm font-medium text-gray-900">
                  I am authorized to work in the United States{' '}
                  <span className="text-red-500">*</span>
                </span>
                <p className="text-sm text-gray-500 mt-1">
                  You must be legally authorized to work in the U.S. to apply for this position
                </p>
              </div>
            </label>
          )}
        />
        {errors.authorizedToWork && (
          <p className="mt-2 text-sm text-red-600">{errors.authorizedToWork.message}</p>
        )}
      </div>

      {/* Driver's License */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <Controller
          name="hasDriversLicense"
          control={control}
          render={({ field }) => (
            <label className="flex items-start cursor-pointer">
              <input
                type="checkbox"
                checked={field.value || false}
                onChange={(e) => field.onChange(e.target.checked)}
                className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <div className="ml-3">
                <span className="text-sm font-medium text-gray-900">
                  I have a valid driver's license
                </span>
                <p className="text-sm text-gray-500 mt-1">
                  Check this box if you possess a current, valid driver's license
                </p>
              </div>
            </label>
          )}
        />
        {errors.hasDriversLicense && (
          <p className="mt-2 text-sm text-red-600">{errors.hasDriversLicense.message}</p>
        )}

        {/* License Class - Conditional */}
        {hasDriversLicense && (
          <div className="mt-4 ml-7">
            <label
              htmlFor="licenseClass"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              License Class (Optional)
            </label>
            <Controller
              name="licenseClass"
              control={control}
              render={({ field }) => (
                <select
                  {...field}
                  id="licenseClass"
                  className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Class (if applicable)</option>
                  <option value="A">Class A - Combination vehicles (tractor-trailers)</option>
                  <option value="B">Class B - Heavy straight vehicles (buses, trucks)</option>
                  <option value="C">Class C - Regular passenger vehicles</option>
                </select>
              )}
            />
            <p className="mt-1 text-sm text-gray-500">
              Select if you have a commercial driver's license (CDL)
            </p>
          </div>
        )}
      </div>

      {/* Reliable Transportation */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <Controller
          name="hasReliableTransportation"
          control={control}
          render={({ field }) => (
            <label className="flex items-start cursor-pointer">
              <input
                type="checkbox"
                checked={field.value || false}
                onChange={(e) => field.onChange(e.target.checked)}
                className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <div className="ml-3">
                <span className="text-sm font-medium text-gray-900">
                  I have reliable transportation to the job site{' '}
                  <span className="text-red-500">*</span>
                </span>
                <p className="text-sm text-gray-500 mt-1">
                  Confirm that you can reliably commute to the work location on time. This may
                  include personal vehicle, public transportation, carpool, etc.
                </p>
              </div>
            </label>
          )}
        />
        {errors.hasReliableTransportation && (
          <p className="mt-2 text-sm text-red-600">{errors.hasReliableTransportation.message}</p>
        )}
      </div>

      {/* Info Box */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg
              className="h-5 w-5 text-amber-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-amber-800">Important</h3>
            <p className="mt-1 text-sm text-amber-700">
              Misrepresenting your work authorization or qualifications may result in immediate
              disqualification or termination. All information provided will be verified during the
              hiring process.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
