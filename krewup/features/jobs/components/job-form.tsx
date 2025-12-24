'use client';

import { useState, useEffect } from 'react';
import { Button, Input, Select } from '@/components/ui';
import { LocationAutocomplete } from '@/components/common/location-autocomplete';
import { TRADES, TRADE_SUBCATEGORIES, JOB_TYPES, CERTIFICATIONS } from '@/lib/constants';
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

  // Pay rate state for conditional logic
  const [hourlyRate, setHourlyRate] = useState('');
  const [payPeriod, setPayPeriod] = useState('weekly');
  const [contractAmount, setContractAmount] = useState('');
  const [contractType, setContractType] = useState('Per Contract');

  // Determine if job type is hourly (Full-Time, Part-Time, Temporary) or contract (Contract, 1099)
  const isHourlyJob = ['Full-Time', 'Part-Time', 'Temporary'].includes(formData.job_type);
  const isContractJob = ['Contract', '1099'].includes(formData.job_type);
  const isTemporaryOrContract = ['Temporary', 'Contract', '1099'].includes(formData.job_type);

  // Auto-update pay_rate when conditional fields change
  useEffect(() => {
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
  }, [hourlyRate, payPeriod, contractAmount, contractType, formData.job_type, isHourlyJob, isContractJob]);

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
    const updated = [...tradeSelections];
    updated[tradeIndex].subTrades = updated[tradeIndex].subTrades.filter((_, i) => i !== subTradeIndex);
    setTradeSelections(updated);
  }

  function toggleCert(cert: string) {
    setSelectedCerts((prev) =>
      prev.includes(cert) ? prev.filter((c) => c !== cert) : [...prev, cert]
    );
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

    const jobData: JobData = {
      ...formData,
      trade_selections: structuredTradeSelections,
      required_certs: selectedCerts.length > 0 ? selectedCerts : undefined,
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
                <div className="ml-4 space-y-2 border-l-2 border-crewup-blue pl-4">
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
          className="flex min-h-[160px] w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-crewup-blue focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"
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

      {isHourlyJob && (
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

      {isContractJob && (
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
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {CERTIFICATIONS.map((cert) => (
            <label
              key={cert}
              className="flex items-center gap-2 rounded-lg border border-gray-200 p-3 cursor-pointer hover:bg-gray-50"
            >
              <input
                type="checkbox"
                checked={selectedCerts.includes(cert)}
                onChange={() => toggleCert(cert)}
                disabled={isLoading}
                className="h-4 w-4 rounded border-gray-300 text-crewup-blue focus:ring-crewup-blue"
              />
              <span className="text-sm text-gray-700">{cert}</span>
            </label>
          ))}
        </div>
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
