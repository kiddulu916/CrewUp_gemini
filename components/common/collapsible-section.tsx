'use client';

import { useState, ReactNode } from 'react';

type Props = {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
  badge?: ReactNode;
  actions?: ReactNode;
};

const ChevronDownIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
);

export function CollapsibleSection({ title, children, defaultOpen = true, badge, actions }: Props) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-gray-50">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex-1 flex items-center justify-between hover:opacity-80 transition-opacity"
        >
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            {badge}
          </div>
          <ChevronDownIcon
            className={`w-5 h-5 text-gray-500 transition-transform ${
              isOpen ? 'transform rotate-180' : ''
            }`}
          />
        </button>
        {actions && (
          <div className="ml-2 flex items-center gap-2">
            {actions}
          </div>
        )}
      </div>

      {/* Content */}
      {isOpen && (
        <div className="p-4 bg-white border-t border-gray-200">
          {children}
        </div>
      )}
    </div>
  );
}
