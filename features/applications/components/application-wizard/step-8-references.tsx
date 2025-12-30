'use client';

import { useState } from 'react';
import { UseFormReturn, Controller, useFieldArray } from 'react-hook-form';
import { ApplicationFormData } from '../../types/application.types';
import { Input, Textarea } from '@/components/ui';

type Props = {
  form: UseFormReturn<Partial<ApplicationFormData>>;
};

// SVG Icons
const PlusIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);

const TrashIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
    />
  </svg>
);

const UserGroupIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
    />
  </svg>
);

/**
 * Format phone number to (XXX) XXX-XXXX format
 */
function formatPhoneNumber(value: string): string {
  const numbers = value.replace(/\D/g, '');
  if (numbers.length === 0) return '';
  if (numbers.length <= 3) return `(${numbers}`;
  if (numbers.length <= 6) return `(${numbers.slice(0, 3)}) ${numbers.slice(3)}`;
  return `(${numbers.slice(0, 3)}) ${numbers.slice(3, 6)}-${numbers.slice(6, 10)}`;
}

const HOW_HEARD_OPTIONS = [
  'Indeed',
  'LinkedIn',
  'Company Website',
  'Referral from Current Employee',
  'Referral from Friend/Family',
  'Job Fair',
  'Trade School/Training Program',
  'Online Job Board',
  'Social Media',
  'Walk-in/Direct Contact',
  'Recruiter',
  'Other',
];

export function Step8References({ form }: Props) {
  const {
    control,
    formState: { errors },
    watch,
    setValue,
  } = form;

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'references',
  });

  const [expandedRefIndex, setExpandedRefIndex] = useState<number>(-1);

  function addReference() {
    append({
      id: crypto.randomUUID(),
      name: '',
      company: '',
      phone: '',
      email: '',
      relationship: '',
    });
    setExpandedRefIndex(fields.length);
  }

  const whyInterested = watch('whyInterested') || '';

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          References & Final Information
        </h2>
        <p className="text-gray-600">
          Provide professional references and complete your application. Almost done!
        </p>
      </div>

      {/* References Section */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">
            Professional References (Optional)
          </h3>
          <p className="text-sm text-gray-600">
            You may provide professional references (previous supervisors, coworkers, or clients)
          </p>
        </div>

        {fields.length === 0 && (
          <div className="text-center py-6 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
            <UserGroupIcon className="mx-auto h-10 w-10 text-gray-400" />
            <p className="mt-2 text-sm text-gray-600">No references added yet</p>
            <p className="text-xs text-gray-500 mt-1">References are optional but recommended</p>
          </div>
        )}

        {fields.map((field, index) => {
          const isExpanded = expandedRefIndex === index;
          const refName = watch(`references.${index}.name`);
          const refCompany = watch(`references.${index}.company`);

          return (
            <div
              key={field.id}
              className="bg-white border border-gray-300 rounded-lg overflow-hidden"
            >
              {/* Header */}
              <div
                className="flex items-center justify-between p-3 bg-gray-50 cursor-pointer hover:bg-gray-100"
                onClick={() => setExpandedRefIndex(isExpanded ? -1 : index)}
              >
                <div className="flex items-center space-x-2">
                  <UserGroupIcon className="h-5 w-5 text-gray-600" />
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">
                      {refName || `Reference ${index + 1}`}
                    </h4>
                    {refCompany && <p className="text-xs text-gray-500">{refCompany}</p>}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    remove(index);
                  }}
                  className="text-red-600 hover:text-red-800 p-1"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>

              {/* Expanded Form */}
              {isExpanded && (
                <div className="p-3 space-y-3">
                  {/* Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <Controller
                      name={`references.${index}.name`}
                      control={control}
                      render={({ field }) => (
                        <Input
                          {...field}
                          type="text"
                          placeholder="John Smith"
                          className={errors.references?.[index]?.name ? 'border-red-500' : ''}
                        />
                      )}
                    />
                    {errors.references?.[index]?.name && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.references[index]?.name?.message}
                      </p>
                    )}
                  </div>

                  {/* Company */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Company/Organization <span className="text-red-500">*</span>
                    </label>
                    <Controller
                      name={`references.${index}.company`}
                      control={control}
                      render={({ field }) => (
                        <Input
                          {...field}
                          type="text"
                          placeholder="ABC Construction"
                          className={errors.references?.[index]?.company ? 'border-red-500' : ''}
                        />
                      )}
                    />
                    {errors.references?.[index]?.company && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.references[index]?.company?.message}
                      </p>
                    )}
                  </div>

                  {/* Relationship */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Relationship <span className="text-red-500">*</span>
                    </label>
                    <Controller
                      name={`references.${index}.relationship`}
                      control={control}
                      render={({ field }) => (
                        <Input
                          {...field}
                          type="text"
                          placeholder="Former Supervisor, Coworker, etc."
                          className={
                            errors.references?.[index]?.relationship ? 'border-red-500' : ''
                          }
                        />
                      )}
                    />
                    {errors.references?.[index]?.relationship && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.references[index]?.relationship?.message}
                      </p>
                    )}
                  </div>

                  {/* Phone & Email */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Phone <span className="text-red-500">*</span>
                      </label>
                      <Controller
                        name={`references.${index}.phone`}
                        control={control}
                        render={({ field }) => (
                          <Input
                            {...field}
                            type="tel"
                            placeholder="(555) 123-4567"
                            maxLength={14}
                            onChange={(e) => {
                              const formatted = formatPhoneNumber(e.target.value);
                              field.onChange(formatted);
                              setValue(`references.${index}.phone`, formatted, {
                                shouldValidate: true,
                              });
                            }}
                            className={errors.references?.[index]?.phone ? 'border-red-500' : ''}
                          />
                        )}
                      />
                      {errors.references?.[index]?.phone && (
                        <p className="mt-1 text-sm text-red-600">
                          {errors.references[index]?.phone?.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email <span className="text-red-500">*</span>
                      </label>
                      <Controller
                        name={`references.${index}.email`}
                        control={control}
                        render={({ field }) => (
                          <Input
                            {...field}
                            type="email"
                            placeholder="john@example.com"
                            className={errors.references?.[index]?.email ? 'border-red-500' : ''}
                          />
                        )}
                      />
                      {errors.references?.[index]?.email && (
                        <p className="mt-1 text-sm text-red-600">
                          {errors.references[index]?.email?.message}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Add Reference Button */}
        <button
          type="button"
          onClick={addReference}
          className="w-full flex items-center justify-center space-x-2 px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-700 hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
        >
          <PlusIcon className="h-5 w-5" />
          <span className="font-medium">Add Reference</span>
        </button>

        {/* Validation Error for Array */}
        {errors.references && typeof errors.references === 'object' && 'message' in errors.references && (
          <p className="text-sm text-red-600">{errors.references.message as string}</p>
        )}
      </div>

      {/* Why Interested */}
      <div>
        <label htmlFor="whyInterested" className="block text-sm font-medium text-gray-700 mb-1">
          Why are you interested in this position? <span className="text-red-500">*</span>
        </label>
        <Controller
          name="whyInterested"
          control={control}
          render={({ field }) => (
            <Textarea
              {...field}
              id="whyInterested"
              rows={4}
              placeholder="Describe why you're interested in this position and what makes you a good fit..."
              className={errors.whyInterested ? 'border-red-500' : ''}
            />
          )}
        />
        <div className="flex justify-between items-center mt-1">
          <div>
            {errors.whyInterested && (
              <p className="text-sm text-red-600">{errors.whyInterested.message}</p>
            )}
          </div>
          <p className="text-xs text-gray-500">
            {whyInterested.length}/50 characters (minimum 50)
          </p>
        </div>
      </div>

      {/* Salary Expectations */}
      <div>
        <label htmlFor="salaryExpectations" className="block text-sm font-medium text-gray-700 mb-1">
          Salary Expectations <span className="text-red-500">*</span>
        </label>
        <Controller
          name="salaryExpectations"
          control={control}
          render={({ field }) => (
            <Input
              {...field}
              id="salaryExpectations"
              type="text"
              placeholder="$25/hour, $50,000/year, Negotiable, etc."
              className={errors.salaryExpectations ? 'border-red-500' : ''}
            />
          )}
        />
        {errors.salaryExpectations && (
          <p className="mt-1 text-sm text-red-600">{errors.salaryExpectations.message}</p>
        )}
      </div>

      {/* How Heard About Job */}
      <div>
        <label htmlFor="howHeardAboutJob" className="block text-sm font-medium text-gray-700 mb-1">
          How did you hear about this job? <span className="text-red-500">*</span>
        </label>
        <Controller
          name="howHeardAboutJob"
          control={control}
          render={({ field }) => (
            <select
              {...field}
              id="howHeardAboutJob"
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.howHeardAboutJob ? 'border-red-500' : 'border-gray-300'
              }`}
            >
              <option value="">Select an option</option>
              {HOW_HEARD_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          )}
        />
        {errors.howHeardAboutJob && (
          <p className="mt-1 text-sm text-red-600">{errors.howHeardAboutJob.message}</p>
        )}
      </div>

      {/* Emergency Contact */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Emergency Contact</h3>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Name <span className="text-red-500">*</span>
          </label>
          <Controller
            name="emergencyContact.name"
            control={control}
            render={({ field }) => (
              <Input
                {...field}
                type="text"
                placeholder="Jane Doe"
                className={errors.emergencyContact?.name ? 'border-red-500' : ''}
              />
            )}
          />
          {errors.emergencyContact?.name && (
            <p className="mt-1 text-sm text-red-600">{errors.emergencyContact.name.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Relationship <span className="text-red-500">*</span>
          </label>
          <Controller
            name="emergencyContact.relationship"
            control={control}
            render={({ field }) => (
              <Input
                {...field}
                type="text"
                placeholder="Spouse, Parent, Sibling, etc."
                className={errors.emergencyContact?.relationship ? 'border-red-500' : ''}
              />
            )}
          />
          {errors.emergencyContact?.relationship && (
            <p className="mt-1 text-sm text-red-600">
              {errors.emergencyContact.relationship.message}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Phone <span className="text-red-500">*</span>
          </label>
          <Controller
            name="emergencyContact.phone"
            control={control}
            render={({ field }) => (
              <Input
                {...field}
                type="tel"
                placeholder="(555) 123-4567"
                maxLength={14}
                onChange={(e) => {
                  const formatted = formatPhoneNumber(e.target.value);
                  field.onChange(formatted);
                  setValue('emergencyContact.phone', formatted, { shouldValidate: true });
                }}
                className={errors.emergencyContact?.phone ? 'border-red-500' : ''}
              />
            )}
          />
          {errors.emergencyContact?.phone && (
            <p className="mt-1 text-sm text-red-600">{errors.emergencyContact.phone.message}</p>
          )}
        </div>
      </div>

      {/* Consents */}
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-3">
        <h3 className="text-lg font-medium text-gray-900">Required Acknowledgments</h3>

        <div>
          <Controller
            name="consents.physicalRequirements"
            control={control}
            render={({ field }) => (
              <label className="flex items-start cursor-pointer">
                <input
                  type="checkbox"
                  checked={field.value || false}
                  onChange={(e) => field.onChange(e.target.checked)}
                  className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="ml-3 text-sm text-gray-900">
                  I acknowledge that this position may require physical labor including lifting,
                  standing for extended periods, working outdoors, and operating tools/equipment.{' '}
                  <span className="text-red-500">*</span>
                </span>
              </label>
            )}
          />
          {errors.consents?.physicalRequirements && (
            <p className="ml-7 mt-1 text-sm text-red-600">
              {errors.consents.physicalRequirements.message}
            </p>
          )}
        </div>

        <div>
          <Controller
            name="consents.backgroundCheck"
            control={control}
            render={({ field }) => (
              <label className="flex items-start cursor-pointer">
                <input
                  type="checkbox"
                  checked={field.value || false}
                  onChange={(e) => field.onChange(e.target.checked)}
                  className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="ml-3 text-sm text-gray-900">
                  I consent to a background check as part of the employment verification process.{' '}
                  <span className="text-red-500">*</span>
                </span>
              </label>
            )}
          />
          {errors.consents?.backgroundCheck && (
            <p className="ml-7 mt-1 text-sm text-red-600">
              {errors.consents.backgroundCheck.message}
            </p>
          )}
        </div>

        <div>
          <Controller
            name="consents.drugTest"
            control={control}
            render={({ field }) => (
              <label className="flex items-start cursor-pointer">
                <input
                  type="checkbox"
                  checked={field.value || false}
                  onChange={(e) => field.onChange(e.target.checked)}
                  className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="ml-3 text-sm text-gray-900">
                  I consent to pre-employment drug testing as required by the employer.{' '}
                  <span className="text-red-500">*</span>
                </span>
              </label>
            )}
          />
          {errors.consents?.drugTest && (
            <p className="ml-7 mt-1 text-sm text-red-600">{errors.consents.drugTest.message}</p>
          )}
        </div>
      </div>

      {/* Final Info Box */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg
              className="h-5 w-5 text-green-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-green-800">Almost done!</h3>
            <p className="mt-1 text-sm text-green-700">
              Review your information and click "Submit Application" on the next screen. Your
              application will be sent to the employer immediately.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
