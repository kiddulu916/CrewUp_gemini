// features/profiles/components/experience-filter.tsx
'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { useIsPro } from '@/features/subscriptions/hooks/use-subscription';
import { searchWorkersByExperience } from '../actions/experience-search-actions';
import { useRouter } from 'next/navigation';
import { TRADES } from '@/lib/constants';

interface ExperienceFilterProps {
  onSearchResults?: (results: any[]) => void;
  onSearchStart?: () => void;
  onFilterChange?: (minYears: number) => void;
  initialMinYears?: number;
  maxYears?: number;
}

export function ExperienceFilter({
  onSearchResults,
  onSearchStart,
  onFilterChange,
  initialMinYears = 0,
  maxYears = 20,
}: ExperienceFilterProps) {
  const isPro = useIsPro();
  const router = useRouter();
  const [minYears, setMinYears] = useState(initialMinYears);
  const [selectedTrade, setSelectedTrade] = useState('');
  const [isSearching, setIsSearching] = useState(false);

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
              Filter candidates by years of experience to find senior talent.
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

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    setMinYears(value);
    if (onFilterChange) onFilterChange(value);
  };

  const handleReset = () => {
    setMinYears(0);
    setSelectedTrade('');
    if (onFilterChange) onFilterChange(0);
    if (onSearchResults) onSearchResults([]);
  };

  const handleSearch = async () => {
    if (!onSearchResults) return;

    setIsSearching(true);
    if (onSearchStart) onSearchStart();

    try {
      const result = await searchWorkersByExperience(
        minYears,
        selectedTrade || null
      );

      if (result.success && result.workers) {
        onSearchResults(result.workers);
      } else {
        console.error('Search error:', result.error);
        onSearchResults([]);
      }
    } catch (error) {
      console.error('Search failed:', error);
      onSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">Filter by Experience</h3>
        {minYears > 0 && (
          <Button size="sm" variant="outline" onClick={handleReset}>
            Reset
          </Button>
        )}
      </div>

      <div className="space-y-4">
        {/* Slider */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium">
              Minimum Experience
            </label>
            <span className="text-lg font-bold text-blue-600">
              {minYears === 0 ? 'Any' : `${minYears}+ years`}
            </span>
          </div>
          <input
            type="range"
            min="0"
            max={maxYears}
            value={minYears}
            onChange={handleSliderChange}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>0 years</span>
            <span>{maxYears} years</span>
          </div>
        </div>

        {/* Quick filters */}
        <div>
          <p className="text-sm font-medium mb-2">Quick Filters:</p>
          <div className="flex flex-wrap gap-2">
            {[0, 2, 5, 10, 15].map((years) => (
              <button
                key={years}
                onClick={() => {
                  setMinYears(years);
                  if (onFilterChange) onFilterChange(years);
                }}
                className={`
                  px-3 py-1.5 text-sm rounded-full border transition-colors
                  ${
                    minYears === years
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-blue-500'
                  }
                `}
              >
                {years === 0 ? 'Any' : `${years}+`} years
              </button>
            ))}
          </div>
        </div>

        {/* Trade Selection */}
        {onSearchResults && (
          <div>
            <Select
              label="Filter by Trade (Optional)"
              options={[
                { value: '', label: 'All Trades' },
                ...TRADES.map((trade) => ({ value: trade, label: trade })),
              ]}
              value={selectedTrade}
              onChange={(e) => setSelectedTrade(e.target.value)}
            />
          </div>
        )}

        {/* Search Button */}
        {onSearchResults && (
          <div className="pt-3 border-t">
            <Button
              onClick={handleSearch}
              disabled={isSearching}
              className="w-full"
            >
              {isSearching ? 'Searching...' : 'Search Workers'}
            </Button>
          </div>
        )}

        {/* Info text */}
        {minYears > 0 && !onSearchResults && (
          <div className="pt-3 border-t">
            <p className="text-xs text-gray-600">
              Showing workers with <strong>at least {minYears} years</strong> of experience
              in their trade. Experience is calculated from their work history.
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}
