'use client';

import React from 'react';

/**
 * Represents the filter values for user segmentation.
 *
 * @typedef {Object} SegmentValue
 * @property {('worker' | 'employer' | null)} [role] - The user's role filter
 * @property {('free' | 'pro' | null)} [subscription] - The subscription tier filter
 * @property {(string | null)} [location] - The location filter (city or state)
 * @property {('general_contractor' | 'subcontractor' | 'property_owner' | null)} [employerType] - The employer type filter
 */
export type SegmentValue = {
  role?: 'worker' | 'employer' | null;
  subscription?: 'free' | 'pro' | null;
  location?: string | null;
  employerType?: 'general_contractor' | 'subcontractor' | 'property_owner' | null;
};

type Props = {
  value: SegmentValue;
  onChange: (value: SegmentValue) => void;
  showRole?: boolean;
  showSubscription?: boolean;
  showLocation?: boolean;
  showEmployerType?: boolean;
};

/**
 * SegmentFilter - A comprehensive filter component for user segmentation
 *
 * Provides filtering capabilities for user segments based on role, subscription tier,
 * location, and employer type. Supports independent filter selection and preservation
 * of existing filters when modifying individual values.
 *
 * @component
 * @example
 * ```tsx
 * const [filters, setFilters] = useState<SegmentValue>({});
 *
 * <SegmentFilter
 *   value={filters}
 *   onChange={setFilters}
 * />
 * ```
 *
 * @param {Props} props - Component props
 * @param {SegmentValue} props.value - The current filter values
 * @param {(value: SegmentValue) => void} props.onChange - Callback fired when any filter changes
 * @param {boolean} [props.showRole=true] - Whether to show the role filter
 * @param {boolean} [props.showSubscription=true] - Whether to show the subscription filter
 * @param {boolean} [props.showLocation=true] - Whether to show the location filter
 * @param {boolean} [props.showEmployerType=true] - Whether to show the employer type filter
 *
 * @returns {JSX.Element} A filter panel with role, subscription, location, and employer type filters
 */
export function SegmentFilter({
  value,
  onChange,
  showRole = true,
  showSubscription = true,
  showLocation = true,
  showEmployerType = true,
}: Props) {
  const handleRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const role = e.target.value || null;
    onChange({
      ...value,
      role: role as SegmentValue['role'],
    });
  };

  const handleSubscriptionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const subscription = e.target.value || null;
    onChange({
      ...value,
      subscription: subscription as SegmentValue['subscription'],
    });
  };

  const handleLocationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({
      ...value,
      location: e.target.value || null,
    });
  };

  const handleEmployerTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const employerType = e.target.value || null;
    onChange({
      ...value,
      employerType: employerType as SegmentValue['employerType'],
    });
  };

  const clearFilters = () => {
    onChange({});
  };

  const hasFilters = Object.values(value).some((v) => v !== null && v !== undefined);

  return (
    <div className="bg-white p-4 rounded-lg border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-900">Filters</h3>
        {hasFilters && (
          <button
            onClick={clearFilters}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            Clear all
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {showRole && (
          <div>
            <label
              htmlFor="role-filter"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              User Role
            </label>
            <select
              id="role-filter"
              value={value.role || ''}
              onChange={handleRoleChange}
              className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Roles</option>
              <option value="worker">Worker</option>
              <option value="employer">Employer</option>
            </select>
          </div>
        )}

        {showSubscription && (
          <div>
            <label
              htmlFor="subscription-filter"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Subscription
            </label>
            <select
              id="subscription-filter"
              value={value.subscription || ''}
              onChange={handleSubscriptionChange}
              className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Tiers</option>
              <option value="free">Free</option>
              <option value="pro">Pro</option>
            </select>
          </div>
        )}

        {showLocation && (
          <div>
            <label
              htmlFor="location-filter"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Location
            </label>
            <input
              id="location-filter"
              type="text"
              placeholder="Enter city or state..."
              value={value.location || ''}
              onChange={handleLocationChange}
              className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        )}

        {showEmployerType && (
          <div>
            <label
              htmlFor="employer-type-filter"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Employer Type
            </label>
            <select
              id="employer-type-filter"
              value={value.employerType || ''}
              onChange={handleEmployerTypeChange}
              className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Types</option>
              <option value="general_contractor">General Contractor</option>
              <option value="subcontractor">Subcontractor</option>
              <option value="property_owner">Property Owner</option>
            </select>
          </div>
        )}
      </div>
    </div>
  );
}
