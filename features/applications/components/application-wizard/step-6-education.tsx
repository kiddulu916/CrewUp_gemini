'use client';

import { useState } from 'react';
import { UseFormReturn, Controller, useFieldArray } from 'react-hook-form';
import { ApplicationFormData } from '../../types/application.types';
import { Input } from '@/components/ui';

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

const AcademicCapIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 14l9-5-9-5-9 5 9 5z"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222"
    />
  </svg>
);

const DEGREE_TYPES = [
  'High School Diploma',
  'GED',
  'Trade School Certificate',
  'Associate Degree',
  'Bachelor\'s Degree',
  'Master\'s Degree',
  'Doctoral Degree',
  'Professional Certificate',
  'Apprenticeship Completion',
  'Other',
];

export function Step6Education({ form }: Props) {
  const {
    control,
    formState: { errors },
    watch,
  } = form;

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'education',
  });

  const [expandedIndex, setExpandedIndex] = useState<number>(0);

  const currentYear = new Date().getFullYear();

  function addEducationEntry() {
    append({
      id: crypto.randomUUID(),
      institutionName: '',
      degreeType: '',
      fieldOfStudy: '',
      graduationYear: currentYear,
      isCurrentlyEnrolled: false,
    });
    setExpandedIndex(fields.length);
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Education</h2>
        <p className="text-gray-600">
          List your educational background, including high school, trade schools, certifications,
          and degrees. At least one entry is required.
        </p>
      </div>

      {/* Education Entries */}
      <div className="space-y-4">
        {fields.length === 0 && (
          <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
            <AcademicCapIcon className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-2 text-sm text-gray-600">No education added yet</p>
            <p className="text-xs text-gray-500 mt-1">Click "Add Education" to get started</p>
          </div>
        )}

        {fields.map((field, index) => {
          const isExpanded = expandedIndex === index;
          const isCurrentlyEnrolled = watch(`education.${index}.isCurrentlyEnrolled`);
          const institutionName = watch(`education.${index}.institutionName`);
          const degreeType = watch(`education.${index}.degreeType`);

          return (
            <div
              key={field.id}
              className="bg-white border border-gray-300 rounded-lg overflow-hidden"
            >
              {/* Header */}
              <div
                className="flex items-center justify-between p-4 bg-gray-50 cursor-pointer hover:bg-gray-100"
                onClick={() => setExpandedIndex(isExpanded ? -1 : index)}
              >
                <div className="flex items-center space-x-3">
                  <AcademicCapIcon className="h-5 w-5 text-gray-600" />
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">
                      {degreeType || `Education ${index + 1}`}
                    </h3>
                    {institutionName && (
                      <p className="text-xs text-gray-500">{institutionName}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {isCurrentlyEnrolled && (
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                      Current
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      remove(index);
                    }}
                    className="text-red-600 hover:text-red-800 p-1"
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Expanded Form */}
              {isExpanded && (
                <div className="p-4 space-y-4">
                  {/* Institution Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      School/Institution Name <span className="text-red-500">*</span>
                    </label>
                    <Controller
                      name={`education.${index}.institutionName`}
                      control={control}
                      render={({ field }) => (
                        <Input
                          {...field}
                          type="text"
                          placeholder="Lincoln High School"
                          className={
                            errors.education?.[index]?.institutionName ? 'border-red-500' : ''
                          }
                        />
                      )}
                    />
                    {errors.education?.[index]?.institutionName && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.education[index]?.institutionName?.message}
                      </p>
                    )}
                  </div>

                  {/* Degree Type */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Degree/Certificate Type <span className="text-red-500">*</span>
                    </label>
                    <Controller
                      name={`education.${index}.degreeType`}
                      control={control}
                      render={({ field }) => (
                        <select
                          {...field}
                          className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                            errors.education?.[index]?.degreeType
                              ? 'border-red-500'
                              : 'border-gray-300'
                          }`}
                        >
                          <option value="">Select Degree/Certificate</option>
                          {DEGREE_TYPES.map((type) => (
                            <option key={type} value={type}>
                              {type}
                            </option>
                          ))}
                        </select>
                      )}
                    />
                    {errors.education?.[index]?.degreeType && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.education[index]?.degreeType?.message}
                      </p>
                    )}
                  </div>

                  {/* Field of Study */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Field of Study/Major <span className="text-red-500">*</span>
                    </label>
                    <Controller
                      name={`education.${index}.fieldOfStudy`}
                      control={control}
                      render={({ field }) => (
                        <Input
                          {...field}
                          type="text"
                          placeholder="Carpentry, General Studies, etc."
                          className={
                            errors.education?.[index]?.fieldOfStudy ? 'border-red-500' : ''
                          }
                        />
                      )}
                    />
                    {errors.education?.[index]?.fieldOfStudy && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.education[index]?.fieldOfStudy?.message}
                      </p>
                    )}
                  </div>

                  {/* Graduation Year */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Graduation Year <span className="text-red-500">*</span>
                    </label>
                    <Controller
                      name={`education.${index}.graduationYear`}
                      control={control}
                      render={({ field }) => (
                        <Input
                          {...field}
                          type="number"
                          min={1950}
                          max={currentYear + 10}
                          disabled={isCurrentlyEnrolled}
                          onChange={(e) => field.onChange(parseInt(e.target.value, 10))}
                          className={
                            errors.education?.[index]?.graduationYear ? 'border-red-500' : ''
                          }
                        />
                      )}
                    />
                    {errors.education?.[index]?.graduationYear && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.education[index]?.graduationYear?.message}
                      </p>
                    )}
                  </div>

                  {/* Currently Enrolled Checkbox */}
                  <div>
                    <Controller
                      name={`education.${index}.isCurrentlyEnrolled`}
                      control={control}
                      render={({ field }) => (
                        <label className="flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={field.value || false}
                            onChange={(e) => field.onChange(e.target.checked)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <span className="ml-2 text-sm text-gray-700">
                            I am currently enrolled here
                          </span>
                        </label>
                      )}
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add Button */}
      <button
        type="button"
        onClick={addEducationEntry}
        className="w-full flex items-center justify-center space-x-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-700 hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
      >
        <PlusIcon className="h-5 w-5" />
        <span className="font-medium">Add Education</span>
      </button>

      {/* Validation Error for Array */}
      {errors.education && typeof errors.education === 'object' && 'message' in errors.education && (
        <p className="text-sm text-red-600">{errors.education.message as string}</p>
      )}

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
            <h3 className="text-sm font-medium text-blue-800">Education tips</h3>
            <ul className="mt-1 text-sm text-blue-700 list-disc list-inside space-y-1">
              <li>Include all relevant education, even if incomplete</li>
              <li>Trade school certificates and apprenticeships count as education</li>
              <li>List OSHA training or safety certifications in the next step</li>
              <li>If you have a GED, list it instead of high school</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
