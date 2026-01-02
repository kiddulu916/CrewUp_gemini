import { forwardRef, InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  helperText?: string;
}

/**
 * Checkbox Component
 *
 * A simple checkbox input with optional label and helper text.
 *
 * @example
 * ```tsx
 * <Checkbox label="I own this tool" />
 * <Checkbox checked={true} onChange={(e) => console.log(e.target.checked)} />
 * ```
 */
export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, helperText, id, ...props }, ref) => {
    const inputId = id || `checkbox-${Math.random().toString(36).substring(7)}`;

    if (!label) {
      // Simple checkbox without label
      return (
        <input
          ref={ref}
          type="checkbox"
          id={inputId}
          className={cn(
            'h-4 w-4 rounded border-gray-300 text-krewup-blue focus:ring-2 focus:ring-krewup-blue focus:ring-offset-2 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50',
            className
          )}
          {...props}
        />
      );
    }

    // Checkbox with label
    return (
      <div className="flex items-start">
        <div className="flex items-center h-5">
          <input
            ref={ref}
            type="checkbox"
            id={inputId}
            className={cn(
              'h-4 w-4 rounded border-gray-300 text-krewup-blue focus:ring-2 focus:ring-krewup-blue focus:ring-offset-2 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50',
              className
            )}
            {...props}
          />
        </div>
        <div className="ml-3">
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-gray-700 cursor-pointer select-none"
          >
            {label}
          </label>
          {helperText && (
            <p className="text-sm text-gray-500 mt-0.5">{helperText}</p>
          )}
        </div>
      </div>
    );
  }
);

Checkbox.displayName = 'Checkbox';
