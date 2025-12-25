import { TextareaHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  helperText?: string;
  error?: string;
}

/**
 * Textarea Component
 *
 * A multi-line text input component with label and error states.
 *
 * @example
 * ```tsx
 * <Textarea
 *   label="Message"
 *   placeholder="Type your message..."
 *   rows={3}
 * />
 * ```
 */
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, helperText, error, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            {label}
            {props.required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        <textarea
          ref={ref}
          className={cn(
            'flex min-h-[80px] w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400',
            'focus:outline-none focus:ring-2 focus:ring-krewup-blue focus:border-transparent',
            'disabled:cursor-not-allowed disabled:opacity-50',
            'resize-none',
            error && 'border-red-300 focus:ring-red-500',
            className
          )}
          {...props}
        />
        {helperText && !error && (
          <p className="mt-1.5 text-sm text-gray-500">{helperText}</p>
        )}
        {error && (
          <p className="mt-1.5 text-sm text-red-600">{error}</p>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
