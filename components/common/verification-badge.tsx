'use client';

import React from 'react';

export type VerificationStatus = 'pending' | 'verified' | 'rejected';

type Props = {
  status: VerificationStatus;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
};

export function VerificationBadge({ status, className = '', size = 'md' }: Props) {
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5',
  };

  const statusConfig = {
    pending: {
      icon: '⏳',
      text: 'Pending Verification',
      className: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    },
    verified: {
      icon: '✓',
      text: 'Verified',
      className: 'bg-green-100 text-green-800 border-green-300',
    },
    rejected: {
      icon: '✗',
      text: 'Rejected',
      className: 'bg-red-100 text-red-800 border-red-300',
    },
  };

  const config = statusConfig[status];

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full border ${config.className} ${sizeClasses[size]} ${className}`}
    >
      <span className="text-base leading-none">{config.icon}</span>
      <span>{config.text}</span>
    </span>
  );
}
