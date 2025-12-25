'use client';

/**
 * Progress Indicator Component
 *
 * Displays the current step in the application wizard.
 * Shows visual progress through the 8-step application process.
 *
 * TODO: Implement full progress bar with clickable steps
 * TODO: Add step labels and completion status
 * TODO: Make steps clickable to jump between completed sections
 *
 * @param currentStep - Current step number (1-8)
 * @param totalSteps - Total number of steps (8)
 */

type Props = {
  currentStep: number;
  totalSteps: number;
};

export function ProgressIndicator({ currentStep, totalSteps }: Props) {
  const percentage = (currentStep / totalSteps) * 100;

  return (
    <div className="mt-4">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium text-gray-700">
          Step {currentStep} of {totalSteps}
        </span>
        <span className="text-sm text-gray-500">{Math.round(percentage)}% Complete</span>
      </div>
      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-krewup-blue transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
