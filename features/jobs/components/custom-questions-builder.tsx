// features/jobs/components/custom-questions-builder.tsx
'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useIsPro } from '@/features/subscriptions/hooks/use-subscription';
import { useRouter } from 'next/navigation';

export type CustomQuestion = {
  question: string;
  required: boolean;
};

interface CustomQuestionsBuilderProps {
  value: CustomQuestion[];
  onChange: (questions: CustomQuestion[]) => void;
  maxQuestions?: number;
}

export function CustomQuestionsBuilder({
  value,
  onChange,
  maxQuestions = 5,
}: CustomQuestionsBuilderProps) {
  const isPro = useIsPro();
  const router = useRouter();
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  // Free user - show upgrade prompt
  if (!isPro) {
    return (
      <Card className="p-4 bg-blue-50 border-blue-200">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-blue-900 mb-1">Pro Feature</h4>
            <p className="text-sm text-blue-800 mb-3">
              Add custom screening questions to pre-qualify candidates before they apply.
            </p>
            <Button
              size="sm"
              onClick={() => router.push('/pricing')}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Upgrade to Pro - $15/month
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  const addQuestion = () => {
    if (value.length >= maxQuestions) return;
    onChange([...value, { question: '', required: false }]);
    setEditingIndex(value.length);
  };

  const updateQuestion = (index: number, updates: Partial<CustomQuestion>) => {
    const newQuestions = [...value];
    newQuestions[index] = { ...newQuestions[index], ...updates };
    onChange(newQuestions);
  };

  const removeQuestion = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
    setEditingIndex(null);
  };

  const moveQuestion = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= value.length) return;

    const newQuestions = [...value];
    [newQuestions[index], newQuestions[newIndex]] = [newQuestions[newIndex], newQuestions[index]];
    onChange(newQuestions);
  };

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold">Custom Screening Questions</h3>
          <p className="text-xs text-gray-500">
            Add up to {maxQuestions} questions to pre-screen applicants
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          onClick={addQuestion}
          disabled={value.length >= maxQuestions}
        >
          + Add Question
        </Button>
      </div>

      {value.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p className="mb-2">No screening questions yet</p>
          <p className="text-sm">Click "Add Question" to create your first question</p>
        </div>
      ) : (
        <div className="space-y-3">
          {value.map((q, index) => (
            <div
              key={index}
              className="p-4 border rounded-lg"
            >
              {editingIndex === index ? (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Question {index + 1}
                    </label>
                    <textarea
                      value={q.question}
                      onChange={(e) => updateQuestion(index, { question: e.target.value })}
                      placeholder="e.g., Do you have experience with commercial roofing?"
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows={2}
                      autoFocus
                    />
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={q.required}
                      onChange={(e) => updateQuestion(index, { required: e.target.checked })}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm">Required question</span>
                  </label>

                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => setEditingIndex(null)}
                      disabled={!q.question.trim()}
                    >
                      Done
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => removeQuestion(index)}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold text-gray-500">
                        Question {index + 1}
                      </span>
                      {q.required && (
                        <span className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded-full">
                          Required
                        </span>
                      )}
                    </div>
                    <p className="text-sm">{q.question}</p>
                  </div>

                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => moveQuestion(index, 'up')}
                      disabled={index === 0}
                      className="p-1 hover:bg-gray-100 rounded disabled:opacity-30"
                      title="Move up"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => moveQuestion(index, 'down')}
                      disabled={index === value.length - 1}
                      className="p-1 hover:bg-gray-100 rounded disabled:opacity-30"
                      title="Move down"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingIndex(index)}
                      className="p-1 hover:bg-gray-100 rounded"
                      title="Edit"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {value.length > 0 && value.length < maxQuestions && (
        <div className="mt-3 text-center">
          <p className="text-xs text-gray-500">
            {maxQuestions - value.length} more {maxQuestions - value.length === 1 ? 'question' : 'questions'} available
          </p>
        </div>
      )}
    </Card>
  );
}
