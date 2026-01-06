'use client';

import { useWorkExperience } from '../../hooks/use-work-experience';
import { Loader2, Briefcase, Calendar } from 'lucide-react';
import { format } from 'date-fns';

type ExperienceTabProps = {
  userId: string;
};

export function ExperienceTab({ userId }: ExperienceTabProps) {
  const { data: experiences, isLoading, error } = useWorkExperience(userId);

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
        <p className="text-red-600">Failed to load work experience</p>
      </div>
    );
  }

  if (!experiences || experiences.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 py-12">
        <Briefcase className="h-12 w-12 text-gray-400" />
        <p className="mt-2 text-gray-600">No work experience added yet</p>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM yyyy');
    } catch {
      return dateString;
    }
  };

  return (
    <div className="space-y-6">
      {experiences.map((experience, index) => (
        <div
          key={experience.id}
          className="relative rounded-lg border border-gray-200 bg-white p-6"
        >
          {/* Timeline connector */}
          {index < experiences.length - 1 && (
            <div className="absolute left-8 top-16 h-full w-0.5 bg-gray-200" />
          )}

          <div className="flex gap-4">
            <div className="flex-shrink-0">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-krewup-blue to-krewup-light-blue">
                <Briefcase className="h-6 w-6 text-white" />
              </div>
            </div>

            <div className="flex-1">
              <h3 className="text-xl font-semibold text-gray-900">
                {experience.job_title}
              </h3>
              <p className="mt-1 text-lg text-gray-700">{experience.company}</p>

              <div className="mt-2 flex items-center gap-2 text-sm text-gray-600">
                <Calendar className="h-4 w-4" />
                <span>
                  {formatDate(experience.start_date)} -{' '}
                  {experience.is_current
                    ? 'Present'
                    : experience.end_date
                    ? formatDate(experience.end_date)
                    : 'N/A'}
                </span>
                {experience.is_current && (
                  <span className="ml-2 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                    Current
                  </span>
                )}
              </div>

              {experience.description && (
                <p className="mt-4 whitespace-pre-wrap text-gray-700">
                  {experience.description}
                </p>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
