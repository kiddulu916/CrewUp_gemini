'use client';

import { Select, Card, CardContent } from '@/components/ui';
import { TRADES, TRADE_SUBCATEGORIES, JOB_TYPES } from '@/lib/constants';

type JobFiltersProps = {
  filters: {
    trade: string;
    subTrade: string;
    jobType: string;
  };
  onFilterChange: (filters: { trade: string; subTrade: string; jobType: string }) => void;
};

export function JobFilters({ filters, onFilterChange }: JobFiltersProps) {
  const availableSubTrades = filters.trade ? TRADE_SUBCATEGORIES[filters.trade] || [] : [];

  const handleTradeChange = (trade: string) => {
    onFilterChange({ ...filters, trade, subTrade: '' });
  };

  const handleSubTradeChange = (subTrade: string) => {
    onFilterChange({ ...filters, subTrade });
  };

  const handleJobTypeChange = (jobType: string) => {
    onFilterChange({ ...filters, jobType });
  };

  const handleClearFilters = () => {
    onFilterChange({ trade: '', subTrade: '', jobType: '' });
  };

  const hasActiveFilters = filters.trade || filters.subTrade || filters.jobType;

  return (
    <Card className="shadow-md">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Filter Jobs</h3>
          {hasActiveFilters && (
            <button
              onClick={handleClearFilters}
              className="text-sm text-krewup-blue hover:text-krewup-orange font-medium transition-colors"
            >
              Clear All
            </button>
          )}
        </div>

        <div className="space-y-4">
          {/* Trade Filter */}
          <div>
            <label htmlFor="filter-trade" className="block text-sm font-medium text-gray-700 mb-1.5">
              Trade
            </label>
            <Select
              id="filter-trade"
              value={filters.trade}
              onChange={(e) => handleTradeChange(e.target.value)}
              options={[
                { value: '', label: 'All Trades' },
                ...TRADES.map((trade) => ({ value: trade, label: trade })),
              ]}
            />
          </div>

          {/* Sub-Trade Filter */}
          {availableSubTrades.length > 0 && (
            <div>
              <label htmlFor="filter-subtrade" className="block text-sm font-medium text-gray-700 mb-1.5">
                Specialty
              </label>
              <Select
                id="filter-subtrade"
                value={filters.subTrade}
                onChange={(e) => handleSubTradeChange(e.target.value)}
                options={[
                  { value: '', label: 'All Specialties' },
                  ...availableSubTrades.map((subTrade) => ({ value: subTrade, label: subTrade })),
                ]}
              />
            </div>
          )}

          {/* Job Type Filter */}
          <div>
            <label htmlFor="filter-jobtype" className="block text-sm font-medium text-gray-700 mb-1.5">
              Job Type
            </label>
            <Select
              id="filter-jobtype"
              value={filters.jobType}
              onChange={(e) => handleJobTypeChange(e.target.value)}
              options={[
                { value: '', label: 'All Types' },
                ...JOB_TYPES.map((type) => ({ value: type, label: type })),
              ]}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
