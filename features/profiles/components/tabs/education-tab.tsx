'use client';

import { useEducation } from '../../hooks/use-education';
import { Loader2, GraduationCap } from 'lucide-react';

type EducationTabProps = {
  userId: string;
};

export function EducationTab({ userId }: EducationTabProps) {
  const { data: education, isLoading, error } = useEducation(userId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-krewup-blue" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
        <p className="text-red-600">Failed to load education information</p>
      </div>
    );
  }

  if (!education || education.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 py-12">
        <GraduationCap className="h-12 w-12 text-gray-400" />
        <p className="mt-2 text-gray-600">No education history added yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {education.map((edu, index) => (
        <div
          key={edu.id}
          className="relative rounded-lg border border-gray-200 bg-white p-6"
        >
          {/* Timeline connector */}
          {index < education.length - 1 && (
            <div className="absolute left-8 top-16 h-full w-0.5 bg-gray-200" />
          )}

          <div className="flex gap-4">
            <div className="flex-shrink-0">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-krewup-blue to-krewup-light-blue">
                <GraduationCap className="h-6 w-6 text-white" />
              </div>
            </div>

            <div className="flex-1">
              <h3 className="text-xl font-semibold text-gray-900">
                {edu.degree || 'Degree'}
              </h3>
              {edu.field_of_study && (
                <p className="mt-1 text-lg text-gray-700">{edu.field_of_study}</p>
              )}
              <p className="mt-2 text-gray-600">{edu.institution}</p>

              <div className="mt-2 flex items-center gap-2">
                {edu.end_date && (
                  <span className="text-sm text-gray-600">
                    Graduated {new Date(edu.end_date).getFullYear()}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
