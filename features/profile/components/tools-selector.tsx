'use client';

import { useState, useCallback } from 'react';
import { Checkbox, AccordionItem, Button } from '@/components/ui';
import {
  TOOL_CATEGORIES,
  getCategoryForTrade,
  getOtherCategories,
  type ToolCategory,
} from '../constants/tools';

export interface ToolsSelectorProps {
  /**
   * Whether the user owns any tools
   */
  hasTools: boolean;
  /**
   * Array of tool names the user owns
   */
  toolsOwned: string[];
  /**
   * User's primary trade (used to show relevant category)
   */
  primaryTrade?: string;
  /**
   * Callback when tool selection changes
   */
  onChange: (hasTools: boolean, toolsOwned: string[]) => void;
}

/**
 * ToolsSelector Component
 *
 * Allows workers to select which power tools they own.
 * Shows General/Multi-Trade and user's primary trade category by default,
 * with option to expand and show all other trade categories.
 *
 * @example
 * ```tsx
 * <ToolsSelector
 *   hasTools={true}
 *   toolsOwned={['Drills', 'Circular Saws']}
 *   primaryTrade="Electricians"
 *   onChange={(hasTools, tools) => console.log(hasTools, tools)}
 * />
 * ```
 */
export function ToolsSelector({
  hasTools,
  toolsOwned,
  primaryTrade,
  onChange,
}: ToolsSelectorProps) {
  const [showAllCategories, setShowAllCategories] = useState(false);

  // Determine which categories to show
  const generalCategory = 'general';
  const primaryTradeCategory = getCategoryForTrade(primaryTrade);

  // Always visible categories
  const alwaysVisibleCategories = [generalCategory];
  if (primaryTradeCategory && primaryTradeCategory !== generalCategory) {
    alwaysVisibleCategories.push(primaryTradeCategory);
  }

  // Other categories (shown when expanded)
  const otherCategories = getOtherCategories(alwaysVisibleCategories);

  // Handle tool selection
  const handleToolToggle = useCallback(
    (toolName: string) => {
      const newToolsOwned = toolsOwned.includes(toolName)
        ? toolsOwned.filter((t) => t !== toolName)
        : [...toolsOwned, toolName];

      const newHasTools = newToolsOwned.length > 0;
      onChange(newHasTools, newToolsOwned);
    },
    [toolsOwned, onChange]
  );

  // Render a category section
  const renderCategory = (categoryKey: string, category: ToolCategory) => {
    return (
      <div key={categoryKey} className="space-y-3">
        <h3 className="font-semibold text-gray-900">{category.name}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {category.tools.map((tool) => (
            <Checkbox
              key={tool}
              label={tool}
              checked={toolsOwned.includes(tool)}
              onChange={() => handleToolToggle(tool)}
            />
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-1">
          Power Tools You Own
        </h2>
        <p className="text-sm text-gray-500">
          Select the power tools you own and can bring to job sites. This helps employers
          match you with suitable opportunities.
        </p>
      </div>

      {/* Always visible categories */}
      <div className="space-y-6">
        {alwaysVisibleCategories.map((categoryKey) => {
          const category = TOOL_CATEGORIES[categoryKey];
          if (!category) return null;
          return renderCategory(categoryKey, category);
        })}
      </div>

      {/* Expandable other categories */}
      {otherCategories.length > 0 && (
        <div className="space-y-4">
          {!showAllCategories ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowAllCategories(true)}
              className="w-full"
            >
              + Select tools from other trades
            </Button>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">Other Trade Categories</h3>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAllCategories(false)}
                >
                  Hide
                </Button>
              </div>

              {/* Show other categories in accordions for better organization */}
              <div className="space-y-3">
                {otherCategories.map((categoryKey) => {
                  const category = TOOL_CATEGORIES[categoryKey];
                  if (!category) return null;

                  // Check if any tools in this category are selected
                  const hasSelectedTools = category.tools.some((tool) =>
                    toolsOwned.includes(tool)
                  );

                  return (
                    <AccordionItem
                      key={categoryKey}
                      title={category.name}
                      defaultOpen={hasSelectedTools}
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {category.tools.map((tool) => (
                          <Checkbox
                            key={tool}
                            label={tool}
                            checked={toolsOwned.includes(tool)}
                            onChange={() => handleToolToggle(tool)}
                          />
                        ))}
                      </div>
                    </AccordionItem>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Summary */}
      {toolsOwned.length > 0 && (
        <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
          <p className="text-sm font-medium text-blue-900">
            You have selected {toolsOwned.length} tool{toolsOwned.length !== 1 ? 's' : ''}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {toolsOwned.slice(0, 10).map((tool) => (
              <span
                key={tool}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-white border border-blue-300 text-xs text-blue-900"
              >
                {tool}
                <button
                  type="button"
                  onClick={() => handleToolToggle(tool)}
                  className="hover:text-blue-700"
                  aria-label={`Remove ${tool}`}
                >
                  <svg
                    className="h-3 w-3"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </span>
            ))}
            {toolsOwned.length > 10 && (
              <span className="px-2 py-1 text-xs text-blue-700">
                +{toolsOwned.length - 10} more
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
