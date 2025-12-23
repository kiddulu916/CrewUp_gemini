import { ReactNode } from 'react';
import Link from 'next/link';
import { Button } from './button';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?:
    | {
        label: string;
        onClick: () => void;
        href?: never;
      }
    | {
        label: string;
        href: string;
        onClick?: never;
      };
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className
}: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-12 px-4 text-center', className)}>
      {icon && (
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 text-gray-400">
          {icon}
        </div>
      )}

      <h3 className="mb-2 text-lg font-semibold text-gray-900">{title}</h3>

      {description && (
        <p className="mb-6 max-w-sm text-sm text-gray-600">{description}</p>
      )}

      {action && (
        action.href ? (
          <Link href={action.href}>
            <Button>{action.label}</Button>
          </Link>
        ) : (
          <Button onClick={action.onClick}>{action.label}</Button>
        )
      )}
    </div>
  );
}

/**
 * Pre-built empty states for common scenarios
 */

export function EmptyJobs({ userRole }: { userRole?: 'worker' | 'employer' }) {
  const isEmployer = userRole === 'employer';

  return (
    <EmptyState
      icon={
        <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
          />
        </svg>
      }
      title={isEmployer ? "No jobs posted yet" : "No jobs available"}
      description={
        isEmployer
          ? "Start posting jobs to find skilled workers for your projects"
          : "Check back soon for new job opportunities in your area"
      }
      action={
        isEmployer
          ? {
              label: "Post a job",
              href: "/dashboard/jobs/new"
            }
          : undefined
      }
    />
  );
}

export function EmptyApplications({ userRole }: { userRole?: 'worker' | 'employer' }) {
  const isEmployer = userRole === 'employer';

  return (
    <EmptyState
      icon={
        <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      }
      title={isEmployer ? "No applications yet" : "No applications submitted"}
      description={
        isEmployer
          ? "Applications will appear here when workers apply to your jobs"
          : "Browse available jobs and apply to get started"
      }
      action={
        !isEmployer
          ? {
              label: "Browse jobs",
              href: "/dashboard/jobs"
            }
          : undefined
      }
    />
  );
}

export function EmptyMessages() {
  return (
    <EmptyState
      icon={
        <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>
      }
      title="No messages yet"
      description="Start a conversation by messaging someone from their profile or job posting"
    />
  );
}

export function EmptyCertifications() {
  return (
    <EmptyState
      icon={
        <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
          />
        </svg>
      }
      title="No certifications added"
      description="Add your professional certifications to stand out to employers"
    />
  );
}

export function EmptyExperience() {
  return (
    <EmptyState
      icon={
        <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
          />
        </svg>
      }
      title="No work experience added"
      description="Showcase your professional experience to increase your chances of getting hired"
    />
  );
}
