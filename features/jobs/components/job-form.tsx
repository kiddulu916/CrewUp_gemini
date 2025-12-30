'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button, Input, Select } from '@/components/ui';
import { LocationAutocomplete } from '@/components/common/location-autocomplete';
import { CustomQuestionsBuilder } from './custom-questions-builder';
import { TRADES, TRADE_SUBCATEGORIES, JOB_TYPES } from '@/lib/constants';
import { CERTIFICATION_CATEGORIES, TRADE_TO_CERT_CATEGORY } from '@/lib/constants/certifications';
import { createJob, type JobData } from '../actions/job-actions';

export function JobForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState<JobData>({
    title: '',
    trade: '',
    job_type: '',
    description: '',
    location: '',
    pay_rate: '',
    time_length: '',
  });

  // Trade selections: array of { trade: string, subTrades: string[] }
  const [tradeSelections, setTradeSelections] = useState<Array<{ trade: string; subTrades: string[] }>>([
    { trade: '', subTrades: [] }
  ]);
  const [selectedCerts, setSelectedCerts] = useState<string[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(['Safety']) // Default "Safety" expanded
  );
  const [subTradeRates, setSubTradeRates] = useState<Record<string, string>>({});
  const [customQuestions, setCustomQuestions] = useState<Array<{ question: string; required: boolean }>>([]);

  // Pay rate state for conditional logic
  const [hourlyRate, setHourlyRate] = useState('');
  const [payPeriod, setPayPeriod] = useState('weekly');
  const [contractAmount, setContractAmount] = useState('');
  const [contractType, setContractType] = useState('Per Contract');

  // Determine if job type is hourly (Full-Time, Part-Time, Temporary) or contract (Contract, 1099)
  const isHourlyJob = ['Full-Time', 'Part-Time', 'Temporary'].includes(formData.job_type);
  const isContractJob = ['Contract', '1099'].includes(formData.job_type);
  const isTemporaryOrContract = ['Temporary', 'Contract', '1099'].includes(formData.job_type);

  // Calculate all selected sub-trades
  const allSubTrades = tradeSelections.flatMap(ts =>
    ts.subTrades.filter(st => st !== '').map(st => ({
      trade: ts.trade,
      subTrade: st
    }))
  );

  // Show per-subtrade rates if 2+ sub-trades selected
  const showPerSubTradeRates = allSubTrades.length >= 2;

  // Auto-update pay_rate when conditional fields change (only for single rate mode)
  useEffect(() => {
    // Skip auto-update when showing per-subtrade rates
    if (showPerSubTradeRates) {
      return;
    }

    if (isHourlyJob && hourlyRate) {
      // Format: "$25/hr (weekly)" or "$25/hr (bi-weekly)" etc.
      updateFormData({ pay_rate: `$${hourlyRate}/hr (${payPeriod})` });
    } else if (isContractJob && contractAmount) {
      // Format: "$5000/contract" or "$500/job"
      const suffix = contractType === 'Per Contract' ? '/contract' : '/job';
      updateFormData({ pay_rate: `$${contractAmount}${suffix}` });
    } else if (!formData.job_type) {
      // Reset pay_rate if job type is not selected
      updateFormData({ pay_rate: '' });
    }
  }, [hourlyRate, payPeriod, contractAmount, contractType, formData.job_type, isHourlyJob, isContractJob, showPerSubTradeRates]);

  function updateFormData(updates: Partial<JobData>) {
    setFormData((prev) => ({ ...prev, ...updates }));
  }

  // Add a new trade selection
  function addTradeSelection() {
    setTradeSelections([...tradeSelections, { trade: '', subTrades: [] }]);
  }

  // Remove a trade selection
  function removeTradeSelection(index: number) {
    setTradeSelections(tradeSelections.filter((_, i) => i !== index));
  }

  // Update trade for a specific selection
  function updateTrade(index: number, trade: string) {
    const updated = [...tradeSelections];
    updated[index] = { trade, subTrades: [] }; // Reset sub-trades when trade changes
    setTradeSelections(updated);

    // Auto-deselect invalid certifications when trade changes
    const selectedTrades = updated.filter(ts => ts.trade !== '').map(ts => ts.trade);
    if (selectedTrades.length > 0) {
      // Get relevant certification categories for new trade selection
      const relevantCategories = Object.entries(CERTIFICATION_CATEGORIES).filter(([category]) =>
        selectedTrades.some(t => TRADE_TO_CERT_CATEGORY[t] === category) ||
        category === 'Safety' // Always include Safety
      );
      const validCerts = relevantCategories.flatMap(([_, certs]) => [...certs]) as string[];

      // Filter selected certs to only keep valid ones
      setSelectedCerts(prev => prev.filter(cert => validCerts.includes(cert as any)));
    }
  }

  // Add a sub-trade to a specific trade selection
  function addSubTrade(index: number) {
    const updated = [...tradeSelections];
    updated[index].subTrades.push('');
    setTradeSelections(updated);
  }

  // Update a specific sub-trade
  function updateSubTrade(tradeIndex: number, subTradeIndex: number, subTrade: string) {
    const updated = [...tradeSelections];
    updated[tradeIndex].subTrades[subTradeIndex] = subTrade;
    setTradeSelections(updated);
  }

  // Remove a specific sub-trade
  function removeSubTrade(tradeIndex: number, subTradeIndex: number) {
    const trade = tradeSelections[tradeIndex].trade;
    const subTrade = tradeSelections[tradeIndex].subTrades[subTradeIndex];

    // Remove from tradeSelections
    const updated = [...tradeSelections];
    updated[tradeIndex].subTrades = updated[tradeIndex].subTrades.filter((_, i) => i !== subTradeIndex);
    setTradeSelections(updated);

    // Clean up rate for this sub-trade
    if (trade && subTrade) {
      const key = `${trade}|${subTrade}`;
      setSubTradeRates(prev => {
        const newRates = { ...prev };
        delete newRates[key];
        return newRates;
      });
    }
  }

  function toggleCert(cert: string) {
    setSelectedCerts((prev) =>
      prev.includes(cert) ? prev.filter((c) => c !== cert) : [...prev, cert]
    );
  }

  function toggleCategory(category: string) {
    const updated = new Set(expandedCategories);
    if (updated.has(category)) {
      updated.delete(category);
    } else {
      updated.add(category);
    }
    setExpandedCategories(updated);
  }

  // Get relevant certification categories based on selected trades
  const selectedTrades = tradeSelections
    .filter(ts => ts.trade !== '')
    .map(ts => ts.trade);

  const relevantCertCategories = useMemo(() => {
    if (selectedTrades.length === 0) {
      // No trades selected, show all categories
      return Object.entries(CERTIFICATION_CATEGORIES);
    }

    // Filter to relevant categories based on selected trades
    const relevant = Object.entries(CERTIFICATION_CATEGORIES).filter(([category]) =>
      selectedTrades.some(trade => TRADE_TO_CERT_CATEGORY[trade] === category)
    );

    // Always include Safety if not already present
    const hasSafety = relevant.some(([cat]) => cat === 'Safety');
    if (!hasSafety) {
      const safetyEntry = ['Safety', CERTIFICATION_CATEGORIES['Safety']] as const;
      relevant.unshift(safetyEntry as any);
    }

    return relevant;
  }, [selectedTrades]);

  function updateSubTradeRate(trade: string, subTrade: string, rate: string) {
    const key = `${trade}|${subTrade}`;
    setSubTradeRates(prev => ({
      ...prev,
      [key]: rate
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    // Validate at least one trade is selected
    const validTrades = tradeSelections.filter(ts => ts.trade !== '');
    if (validTrades.length === 0) {
      setError('Please select at least one trade');
      return;
    }

    setIsLoading(true);

    // Build structured trade selections
    const structuredTradeSelections = validTrades.map(ts => ({
      trade: ts.trade,
      subTrades: ts.subTrades.filter(st => st !== '')
    }));

    // Build pay rate data based on mode
    let payRateData: { pay_rate: string; subtrade_pay_rates?: Record<string, string> | null } = {
      pay_rate: formData.pay_rate,
      subtrade_pay_rates: null,
    };

    if (showPerSubTradeRates) {
      // Per-subtrade rates mode: validate all rates are filled
      const missingRates: string[] = [];
      allSubTrades.forEach(({ trade, subTrade }) => {
        const key = `${trade}|${subTrade}`;
        if (!subTradeRates[key] || subTradeRates[key].trim() === '') {
          missingRates.push(subTrade);
        }
      });

      if (missingRates.length > 0) {
        setError(`Please enter pay rates for: ${missingRates.join(', ')}`);
        setIsLoading(false);
        return;
      }

      // Build subtrade_pay_rates object with raw numbers
      const rates: Record<string, string> = {};
      allSubTrades.forEach(({ trade, subTrade }) => {
        const key = `${trade}|${subTrade}`;
        rates[key] = subTradeRates[key];
      });

      // Build formatted display string
      const suffix = isHourlyJob
        ? `/hr (${payPeriod})`
        : `/${contractType.toLowerCase().replace(' ', '')}`;

      const displayParts = allSubTrades.map(({ subTrade }) => {
        const key = `${allSubTrades.find(st => st.subTrade === subTrade)!.trade}|${subTrade}`;
        return `${subTrade}: $${subTradeRates[key]}${suffix}`;
      });

      payRateData = {
        pay_rate: displayParts.join(', '),
        subtrade_pay_rates: rates,
      };
    }

    const jobData: JobData = {
      ...formData,
      ...payRateData,
      trade_selections: structuredTradeSelections,
      required_certs: selectedCerts.length > 0 ? selectedCerts : undefined,
      custom_questions: customQuestions.length > 0 ? customQuestions : undefined,
      // Keep old fields for backward compatibility
      trade: structuredTradeSelections[0].trade,
      sub_trade: structuredTradeSelections[0].subTrades[0] || undefined,
    };

    const result = await createJob(jobData);

    if (!result.success) {
      setError(result.error || 'Failed to create job');
      setIsLoading(false);
    }
    // If successful, user will be redirected by the action
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <Input
        label="Job Title"
        type="text"
        placeholder="e.g., Experienced Carpenter Needed"
        value={formData.title}
        onChange={(e) => updateFormData({ title: e.target.value })}
        required
        disabled={isLoading}
      />

      {/* Trades Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Trades Needed <span className="text-red-500">*</span>
        </label>
        <p className="text-xs text-gray-500 mb-3">Select trades and specialties needed for this job</p>

        <div className="space-y-4">
          {tradeSelections.map((selection, tradeIndex) => (
            <div key={tradeIndex} className="border border-gray-300 rounded-lg p-4 bg-gray-50">
              {/* Trade Selection */}
              <div className="flex items-end gap-2 mb-3">
                <div className="flex-1">
                  <Select
                    label={`Trade ${tradeIndex + 1}`}
                    options={[
                      { value: '', label: 'Select a trade...' },
                      ...TRADES.map((trade) => ({ value: trade, label: trade }))
                    ]}
                    value={selection.trade}
                    onChange={(e) => updateTrade(tradeIndex, e.target.value)}
                    required={tradeIndex === 0}
                    disabled={isLoading}
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={addTradeSelection}
                  disabled={isLoading}
                  className="mb-0.5"
                >
                  + Trade
                </Button>
                {tradeIndex > 0 && (
                  <Button
                    type="button"
                    variant="danger"
                    onClick={() => removeTradeSelection(tradeIndex)}
                    disabled={isLoading}
                    className="mb-0.5"
                  >
                    ×
                  </Button>
                )}
              </div>

              {/* Sub-Trades for this trade */}
              {selection.trade && TRADE_SUBCATEGORIES[selection.trade] && (
                <div className="ml-4 space-y-2 border-l-2 border-krewup-blue pl-4">
                  <div className="flex items-center gap-2 mb-2">
                    <label className="text-sm font-medium text-gray-600">Specialties</label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => addSubTrade(tradeIndex)}
                      disabled={isLoading}
                    >
                      + Specialty
                    </Button>
                  </div>

                  {selection.subTrades.map((subTrade, subTradeIndex) => (
                    <div key={subTradeIndex} className="flex items-center gap-2">
                      <div className="flex-1">
                        <Select
                          label=""
                          options={[
                            { value: '', label: 'Select specialty...' },
                            ...TRADE_SUBCATEGORIES[selection.trade].map((st) => ({
                              value: st,
                              label: st
                            }))
                          ]}
                          value={subTrade}
                          onChange={(e) => updateSubTrade(tradeIndex, subTradeIndex, e.target.value)}
                          disabled={isLoading}
                        />
                      </div>
                      <Button
                        type="button"
                        variant="danger"
                        size="sm"
                        onClick={() => removeSubTrade(tradeIndex, subTradeIndex)}
                        disabled={isLoading}
                      >
                        ×
                      </Button>
                    </div>
                  ))}

                  {selection.subTrades.length === 0 && (
                    <p className="text-xs text-gray-500 italic">No specialties added yet</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">

        <Select
          label="Job Type"
          options={JOB_TYPES.map((type) => ({ value: type, label: type }))}
          value={formData.job_type}
          onChange={(e) => updateFormData({ job_type: e.target.value })}
          required
          disabled={isLoading}
        />

        <div>
          <LocationAutocomplete
            label="Location"
            value={formData.location}
            onChange={(data) => {
              updateFormData({
                location: data.address,
                coords: data.coords,
              });
            }}
            helperText="Start typing for address suggestions"
            required
            placeholder="City, State"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Job Description
        </label>
        <textarea
          className="flex min-h-[160px] w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-krewup-blue focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"
          placeholder="Describe the job responsibilities, requirements, and any other relevant details..."
          value={formData.description}
          onChange={(e) => updateFormData({ description: e.target.value })}
          required
          disabled={isLoading}
        />
      </div>

      {/* Conditional Pay Rate Section */}
      {!formData.job_type && (
        <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
          <p className="text-sm text-blue-800">
            💡 Select a job type above to configure pay rate options
          </p>
        </div>
      )}

      {/* Per-Subtrade Pay Rates (when 2+ sub-trades) */}
      {showPerSubTradeRates && isHourlyJob && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Pay Rates by Specialty</h3>

          {/* Shared Pay Period */}
          <Select
            label="Pay Period (applies to all sub-trades)"
            options={[
              { value: 'weekly', label: 'Weekly' },
              { value: 'bi-weekly', label: 'Bi-Weekly' },
              { value: 'monthly', label: 'Monthly' },
            ]}
            value={payPeriod}
            onChange={(e) => setPayPeriod(e.target.value)}
            required
            disabled={isLoading}
          />

          {/* Grouped by Trade */}
          {tradeSelections
            .filter((ts) => ts.subTrades.some((st) => st !== ''))
            .map((ts) => (
              <div
                key={ts.trade}
                className="border-2 border-gray-300 rounded-lg p-4 bg-gray-50"
              >
                <h4 className="font-semibold text-gray-900 mb-3">{ts.trade}</h4>
                <div className="space-y-2">
                  {ts.subTrades
                    .filter((st) => st !== '')
                    .map((st) => {
                      const key = `${ts.trade}|${st}`;
                      return (
                        <div key={st} className="flex items-center gap-3">
                          <span className="text-sm text-gray-700 min-w-[200px]">
                            • {st}:
                          </span>
                          <div className="flex items-center gap-1 flex-1">
                            <span className="text-gray-700">$</span>
                            <input
                              type="number"
                              value={subTradeRates[key] || ''}
                              onChange={(e) =>
                                updateSubTradeRate(ts.trade, st, e.target.value)
                              }
                              placeholder="25"
                              required
                              disabled={isLoading}
                              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-krewup-blue"
                            />
                            <span className="text-gray-700 text-sm">/hr</span>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            ))}
        </div>
      )}

      {showPerSubTradeRates && isContractJob && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Pay Rates by Specialty</h3>

          {/* Shared Contract Type */}
          <Select
            label="Payment Type (applies to all sub-trades)"
            options={[
              { value: 'Per Contract', label: 'Per Contract' },
              { value: 'Per Job', label: 'Per Job' },
            ]}
            value={contractType}
            onChange={(e) => setContractType(e.target.value)}
            required
            disabled={isLoading}
          />

          {/* Grouped by Trade */}
          {tradeSelections
            .filter((ts) => ts.subTrades.some((st) => st !== ''))
            .map((ts) => (
              <div
                key={ts.trade}
                className="border-2 border-gray-300 rounded-lg p-4 bg-gray-50"
              >
                <h4 className="font-semibold text-gray-900 mb-3">{ts.trade}</h4>
                <div className="space-y-2">
                  {ts.subTrades
                    .filter((st) => st !== '')
                    .map((st) => {
                      const key = `${ts.trade}|${st}`;
                      return (
                        <div key={st} className="flex items-center gap-3">
                          <span className="text-sm text-gray-700 min-w-[200px]">
                            • {st}:
                          </span>
                          <div className="flex items-center gap-1 flex-1">
                            <span className="text-gray-700">$</span>
                            <input
                              type="number"
                              value={subTradeRates[key] || ''}
                              onChange={(e) =>
                                updateSubTradeRate(ts.trade, st, e.target.value)
                              }
                              placeholder="5000"
                              required
                              disabled={isLoading}
                              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-krewup-blue"
                            />
                            <span className="text-gray-700 text-sm">
                              /{contractType.toLowerCase().replace(' ', '')}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            ))}
        </div>
      )}

      {/* Single Pay Rate (when 0-1 sub-trades) */}
      {!showPerSubTradeRates && isHourlyJob && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <Input
              label="Hourly Rate"
              type="number"
              placeholder="25"
              value={hourlyRate}
              onChange={(e) => setHourlyRate(e.target.value)}
              helperText="Enter rate without $ symbol"
              required
              disabled={isLoading}
            />

            <Select
              label="Pay Period"
              options={[
                { value: 'weekly', label: 'Weekly' },
                { value: 'bi-weekly', label: 'Bi-Weekly' },
                { value: 'monthly', label: 'Monthly' },
              ]}
              value={payPeriod}
              onChange={(e) => setPayPeriod(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>

          {formData.pay_rate && (
            <div className="rounded-lg bg-green-50 border border-green-200 p-3">
              <p className="text-sm text-green-800">
                <strong>Pay Rate:</strong> {formData.pay_rate}
              </p>
            </div>
          )}
        </div>
      )}

      {!showPerSubTradeRates && isContractJob && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <Input
              label="Contract/Job Amount"
              type="number"
              placeholder="5000"
              value={contractAmount}
              onChange={(e) => setContractAmount(e.target.value)}
              helperText="Enter amount without $ symbol"
              required
              disabled={isLoading}
            />

            <Select
              label="Payment Type"
              options={[
                { value: 'Per Contract', label: 'Per Contract' },
                { value: 'Per Job', label: 'Per Job' },
              ]}
              value={contractType}
              onChange={(e) => setContractType(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>

          {formData.pay_rate && (
            <div className="rounded-lg bg-green-50 border border-green-200 p-3">
              <p className="text-sm text-green-800">
                <strong>Pay Rate:</strong> {formData.pay_rate}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Time Length for Temporary/Contract Jobs */}
      {isTemporaryOrContract && (
        <div>
          <Input
            label="Contract Duration (Optional)"
            type="text"
            placeholder="e.g., 3 months, 6 weeks, 1 year"
            value={formData.time_length || ''}
            onChange={(e) => updateFormData({ time_length: e.target.value })}
            helperText="How long will this position last?"
            disabled={isLoading}
          />
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Required Certifications (Optional)
        </label>
        <p className="text-xs text-gray-500 mb-4">
          {selectedTrades.length === 0
            ? 'Select trades above to filter relevant certifications'
            : 'Categories filtered based on selected trades. Safety is always shown.'}
        </p>

        <div className="space-y-2">
          {relevantCertCategories.map(([category, certs]) => (
            <div key={category} className="border border-gray-300 rounded-lg overflow-hidden">
              {/* Category Header - Clickable to expand/collapse */}
              <button
                type="button"
                onClick={() => toggleCategory(category)}
                disabled={isLoading}
                className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
              >
                <span className="font-medium text-gray-900">{category}</span>
                <span className="text-gray-600 text-lg">
                  {expandedCategories.has(category) ? '▼' : '▶'}
                </span>
              </button>

              {/* Certifications Grid - Shown when expanded */}
              {expandedCategories.has(category) && (
                <div className="grid grid-cols-2 gap-2 p-3 bg-white border-t border-gray-200">
                  {certs.map((cert) => (
                    <label
                      key={cert}
                      className="flex items-center gap-2 p-2 rounded hover:bg-gray-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedCerts.includes(cert)}
                        onChange={() => toggleCert(cert)}
                        disabled={isLoading}
                        className="h-4 w-4 rounded border-gray-300 text-krewup-blue focus:ring-krewup-blue"
                      />
                      <span className="text-sm text-gray-700">{cert}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Show selected certifications count */}
        {selectedCerts.length > 0 && (
          <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>{selectedCerts.length}</strong> certification{selectedCerts.length !== 1 ? 's' : ''} selected
            </p>
          </div>
        )}
      </div>

      {/* Custom Screening Questions */}
      <div>
        <h3 className="text-lg font-semibold mb-3">Screening Questions</h3>
        <CustomQuestionsBuilder
          value={customQuestions}
          onChange={setCustomQuestions}
        />
      </div>

      <div className="flex gap-3 pt-4 border-t border-gray-200">
        <Button
          type="button"
          variant="outline"
          onClick={() => window.history.back()}
          disabled={isLoading}
        >
          Cancel
        </Button>
        <Button type="submit" isLoading={isLoading}>
          Post Job
        </Button>
      </div>
    </form>
  );
}
