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

const BriefcaseIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
    />
  </svg>
);

export function Step5WorkHistory({ form }: Props) {
  const {
    control,
    formState: { errors },
    watch,
  } = form;

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'workHistory',
  });

  const [expandedIndex, setExpandedIndex] = useState<number>(0);

  function addWorkEntry() {
    append({
      id: crypto.randomUUID(),
      companyName: '',
      jobTitle: '',
      startDate: '',
      endDate: '',
      isCurrent: false,
      responsibilities: '',
      reasonForLeaving: '',
    });
    setExpandedIndex(fields.length);
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Work History</h2>
        <p className="text-gray-600">
          List your previous work experience, starting with your most recent position. At least one
          work entry is required.
        </p>
      </div>

      {/* Work History Entries */}
      <div className="space-y-4">
        {fields.length === 0 && (
          <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
            <BriefcaseIcon className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-2 text-sm text-gray-600">No work history added yet</p>
            <p className="text-xs text-gray-500 mt-1">Click "Add Work Experience" to get started</p>
          </div>
        )}

        {fields.map((field, index) => {
          const isExpanded = expandedIndex === index;
          const isCurrent = watch(`workHistory.${index}.isCurrent`);
          const companyName = watch(`workHistory.${index}.companyName`);
          const jobTitle = watch(`workHistory.${index}.jobTitle`);

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
                  <BriefcaseIcon className="h-5 w-5 text-gray-600" />
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">
                      {jobTitle || `Work Experience ${index + 1}`}
                    </h3>
                    {companyName && (
                      <p className="text-xs text-gray-500">{companyName}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {isCurrent && (
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
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
                  {/* Company Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Company Name <span className="text-red-500">*</span>
                    </label>
                    <Controller
                      name={`workHistory.${index}.companyName`}
                      control={control}
                      render={({ field }) => (
                        <Input
                          {...field}
                          type="text"
                          placeholder="ABC Construction Co."
                          className={
                            errors.workHistory?.[index]?.companyName ? 'border-red-500' : ''
                          }
                        />
                      )}
                    />
                    {errors.workHistory?.[index]?.companyName && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.workHistory[index]?.companyName?.message}
                      </p>
                    )}
                  </div>

                  {/* Job Title */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Job Title <span className="text-red-500">*</span>
                    </label>
                    <Controller
                      name={`workHistory.${index}.jobTitle`}
                      control={control}
                      render={({ field }) => (
                        <Input
                          {...field}
                          type="text"
                          placeholder="Carpenter"
                          className={
                            errors.workHistory?.[index]?.jobTitle ? 'border-red-500' : ''
                          }
                        />
                      )}
                    />
                    {errors.workHistory?.[index]?.jobTitle && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.workHistory[index]?.jobTitle?.message}
                      </p>
                    )}
                  </div>

                  {/* Date Range */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Start Date <span className="text-red-500">*</span>
                      </label>
                      <Controller
                        name={`workHistory.${index}.startDate`}
                        control={control}
                        render={({ field }) => (
                          <Input
                            {...field}
                            type="date"
                            max={new Date().toISOString().split('T')[0]}
                            className={
                              errors.workHistory?.[index]?.startDate ? 'border-red-500' : ''
                            }
                          />
                        )}
                      />
                      {errors.workHistory?.[index]?.startDate && (
                        <p className="mt-1 text-sm text-red-600">
                          {errors.workHistory[index]?.startDate?.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        End Date {!isCurrent && <span className="text-red-500">*</span>}
                      </label>
                      <Controller
                        name={`workHistory.${index}.endDate`}
                        control={control}
                        render={({ field }) => (
                          <Input
                            {...field}
                            type="date"
                            max={new Date().toISOString().split('T')[0]}
                            disabled={isCurrent}
                            className={
                              errors.workHistory?.[index]?.endDate ? 'border-red-500' : ''
                            }
                          />
                        )}
                      />
                      {errors.workHistory?.[index]?.endDate && (
                        <p className="mt-1 text-sm text-red-600">
                          {errors.workHistory[index]?.endDate?.message}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Current Position Checkbox */}
                  <div>
                    <Controller
                      name={`workHistory.${index}.isCurrent`}
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
                            I currently work here
                          </span>
                        </label>
                      )}
                    />
                  </div>

                  {/* Responsibilities */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Responsibilities & Achievements <span className="text-red-500">*</span>
                    </label>
                    <Controller
                      name={`workHistory.${index}.responsibilities`}
                      control={control}
                      render={({ field }) => (
                        <Textarea
                          {...field}
                          rows={4}
                          placeholder="Describe your key responsibilities, achievements, and projects..."
                          className={
                            errors.workHistory?.[index]?.responsibilities ? 'border-red-500' : ''
                          }
                        />
                      )}
                    />
                    {errors.workHistory?.[index]?.responsibilities && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.workHistory[index]?.responsibilities?.message}
                      </p>
                    )}
                  </div>

                  {/* Reason for Leaving (if not current) */}
                  {!isCurrent && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Reason for Leaving (Optional)
                      </label>
                      <Controller
                        name={`workHistory.${index}.reasonForLeaving`}
                        control={control}
                        render={({ field }) => (
                          <Input
                            {...field}
                            type="text"
                            placeholder="e.g., Career advancement, relocation, contract ended"
                          />
                        )}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add Button */}
      <button
        type="button"
        onClick={addWorkEntry}
        className="w-full flex items-center justify-center space-x-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-700 hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
      >
        <PlusIcon className="h-5 w-5" />
        <span className="font-medium">Add Work Experience</span>
      </button>

      {/* Validation Error for Array */}
      {errors.workHistory && typeof errors.workHistory === 'object' && 'message' in errors.workHistory && (
        <p className="text-sm text-red-600">{errors.workHistory.message as string}</p>
      )}

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex">
          <div className="shrink-0">
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
            <h3 className="text-sm font-medium text-blue-800">Tips for work history</h3>
            <ul className="mt-1 text-sm text-blue-700 list-disc list-inside space-y-1">
              <li>Start with your most recent position first</li>
              <li>Include relevant trade experience and projects</li>
              <li>Mention specific skills, tools, and equipment you used</li>
              <li>If you uploaded a resume, some information may be pre-filled</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
