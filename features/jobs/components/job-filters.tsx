'use client';

import { Select, Card, CardContent } from '@/components/ui';
import { TRADES, TRADE_SUBCATEGORIES, JOB_TYPES } from '@/lib/constants';

type JobFiltersProps = {
  filters: {
    trade: string;
    subTrade: string;
    jobType: string;
    maxDistance: string;
    minPay: string;
  };
  onFilterChange: (filters: { 
    trade: string; 
    subTrade: string; 
    jobType: string;
    maxDistance: string;
    minPay: string;
  }) => void;
  hasLocation?: boolean;
};

export function JobFilters({ filters, onFilterChange, hasLocation }: JobFiltersProps) {
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

  const handleDistanceChange = (maxDistance: string) => {
    onFilterChange({ ...filters, maxDistance });
  };

  const handleMinPayChange = (minPay: string) => {
    onFilterChange({ ...filters, minPay });
  };

  const handleClearFilters = () => {
    onFilterChange({ 
      trade: '', 
      subTrade: '', 
      jobType: '', 
      maxDistance: '', 
      minPay: '' 
    });
  };

  const hasActiveFilters = 
    filters.trade || 
    filters.subTrade || 
    filters.jobType || 
    filters.maxDistance || 
    filters.minPay;

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

          {/* Distance Filter */}
          {hasLocation && (
            <div>
              <label htmlFor="filter-distance" className="block text-sm font-medium text-gray-700 mb-1.5">
                Distance
              </label>
              <Select
                id="filter-distance"
                value={filters.maxDistance}
                onChange={(e) => handleDistanceChange(e.target.value)}
                options={[
                  { value: '', label: 'Any Distance' },
                  { value: '5', label: 'Within 5 miles' },
                  { value: '10', label: 'Within 10 miles' },
                  { value: '25', label: 'Within 25 miles' },
                  { value: '50', label: 'Within 50 miles' },
                  { value: '100', label: 'Within 100 miles' },
                ]}
              />
            </div>
          )}

          {/* Pay Rate Filter */}
          <div>
            <label htmlFor="filter-minpay" className="block text-sm font-medium text-gray-700 mb-1.5">
              Minimum Pay
            </label>
            <Select
              id="filter-minpay"
              value={filters.minPay}
              onChange={(e) => handleMinPayChange(e.target.value)}
              options={[
                { value: '', label: 'Any Pay' },
                { value: '20', label: '$20+/hr' },
                { value: '25', label: '$25+/hr' },
                { value: '30', label: '$30+/hr' },
                { value: '40', label: '$40+/hr' },
                { value: '50', label: '$50+/hr' },
              ]}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
