'use client';

import { useState, useEffect } from 'react';
import { Button, Input, Select } from '@/components/ui';
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
  });

  const [selectedCerts, setSelectedCerts] = useState<string[]>([]);

  // Pay rate state for conditional logic
  const [hourlyRate, setHourlyRate] = useState('');
  const [payPeriod, setPayPeriod] = useState('weekly');
  const [contractAmount, setContractAmount] = useState('');
  const [contractType, setContractType] = useState('Per Contract');

  // Determine if job type is hourly (Full-Time, Part-Time, Temporary) or contract (Contract, 1099)
  const isHourlyJob = ['Full-Time', 'Part-Time', 'Temporary'].includes(formData.job_type);
  const isContractJob = ['Contract', '1099'].includes(formData.job_type);

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

  function toggleCert(cert: string) {
    setSelectedCerts((prev) =>
      prev.includes(cert) ? prev.filter((c) => c !== cert) : [...prev, cert]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const jobData: JobData = {
      ...formData,
      required_certs: selectedCerts.length > 0 ? selectedCerts : undefined,
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

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <Select
          label="Trade"
          options={TRADES.map((trade) => ({ value: trade, label: trade }))}
          value={formData.trade}
          onChange={(e) => updateFormData({ trade: e.target.value, sub_trade: '' })}
          required
          disabled={isLoading}
        />

        {formData.trade && TRADE_SUBCATEGORIES[formData.trade] && (
          <Select
            label="Specialty (Optional)"
            options={TRADE_SUBCATEGORIES[formData.trade].map((subTrade) => ({
              value: subTrade,
              label: subTrade,
            }))}
            value={formData.sub_trade || ''}
            onChange={(e) => updateFormData({ sub_trade: e.target.value })}
            disabled={isLoading}
          />
        )}

        <Select
          label="Job Type"
          options={JOB_TYPES.map((type) => ({ value: type, label: type }))}
          value={formData.job_type}
          onChange={(e) => updateFormData({ job_type: e.target.value })}
          required
          disabled={isLoading}
        />

        <Input
          label="Location"
          type="text"
          placeholder="City, State"
          value={formData.location}
          onChange={(e) => updateFormData({ location: e.target.value })}
          required
          disabled={isLoading}
        />
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
