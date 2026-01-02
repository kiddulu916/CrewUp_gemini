'use client';

import { useState, ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface AccordionItemProps {
  id: string;
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
}

export interface AccordionProps {
  items: AccordionItemProps[];
  allowMultiple?: boolean;
  className?: string;
}

/**
 * Accordion Component
 *
 * A simple accordion component for showing/hiding content sections.
 *
 * @example
 * ```tsx
 * <Accordion
 *   items={[
 *     { id: '1', title: 'Section 1', children: <div>Content</div> },
 *     { id: '2', title: 'Section 2', children: <div>More content</div>, defaultOpen: true }
 *   ]}
 *   allowMultiple={true}
 * />
 * ```
 */
export function Accordion({ items, allowMultiple = false, className }: AccordionProps) {
  const [openItems, setOpenItems] = useState<Set<string>>(() => {
    const initialOpen = new Set<string>();
    items.forEach((item) => {
      if (item.defaultOpen) {
        initialOpen.add(item.id);
      }
    });
    return initialOpen;
  });

  const toggleItem = (id: string) => {
    setOpenItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        if (!allowMultiple) {
          newSet.clear();
        }
        newSet.add(id);
      }
      return newSet;
    });
  };

  return (
    <div className={cn('divide-y divide-gray-200 border border-gray-200 rounded-lg', className)}>
      {items.map((item) => {
        const isOpen = openItems.has(item.id);
        return (
          <div key={item.id}>
            <button
              type="button"
              onClick={() => toggleItem(item.id)}
              className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition-colors"
              aria-expanded={isOpen}
            >
              <span className="font-medium text-gray-900">{item.title}</span>
              <svg
                className={cn(
                  'h-5 w-5 text-gray-500 transition-transform duration-200',
                  isOpen && 'rotate-180'
                )}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>
            {isOpen && (
              <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
                {item.children}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/**
 * Simple single accordion item (for cases where you don't need a group)
 */
export function AccordionItem({
  title,
  children,
  defaultOpen = false,
  className,
}: {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={cn('border border-gray-200 rounded-lg', className)}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition-colors rounded-lg"
        aria-expanded={isOpen}
      >
        <span className="font-medium text-gray-900">{title}</span>
        <svg
          className={cn(
            'h-5 w-5 text-gray-500 transition-transform duration-200',
            isOpen && 'rotate-180'
          )}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>
      {isOpen && (
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 rounded-b-lg">
          {children}
        </div>
      )}
    </div>
  );
}
