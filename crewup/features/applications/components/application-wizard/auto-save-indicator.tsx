'use client';

import { formatDistanceToNow } from 'date-fns';

/**
 * Auto-Save Indicator Component
 *
 * Displays the current save status and last saved time.
 * Shows "Saving..." when auto-save is in progress.
 * Shows "Saved X minutes ago" when idle.
 *
 * TODO: Add animated save icon
 * TODO: Add error state for failed saves
 * TODO: Add manual save button
 *
 * @param isSaving - Whether a save operation is in progress
 * @param lastSaved - Date of last successful save
 */

type Props = {
  isSaving: boolean;
  lastSaved: Date | null;
};

export function AutoSaveIndicator({ isSaving, lastSaved }: Props) {
  if (isSaving) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-600 mt-2">
        <svg
          className="h-4 w-4 animate-spin"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
        <span>Saving...</span>
      </div>
    );
  }

  if (lastSaved) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500 mt-2">
        <svg
          className="h-4 w-4 text-green-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 13l4 4L19 7"
          />
        </svg>
        <span>
          Saved{' '}
          {formatDistanceToNow(lastSaved, {
            addSuffix: true,
          })}
        </span>
      </div>
    );
  }

  return null;
}
