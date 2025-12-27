// features/applications/components/certification-filter.tsx
'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useIsPro } from '@/features/subscriptions/hooks/use-subscription';
import { useRouter } from 'next/navigation';
import { ALL_CERTIFICATIONS } from '@/lib/constants';

interface CertificationFilterProps {
  onFilterChange: (certifications: string[], verifiedOnly: boolean) => void;
  initialCertifications?: string[];
  initialVerifiedOnly?: boolean;
}

export function CertificationFilter({
  onFilterChange,
  initialCertifications = [],
  initialVerifiedOnly = false,
}: CertificationFilterProps) {
  const isPro = useIsPro();
  const router = useRouter();
  const [selectedCerts, setSelectedCerts] = useState<string[]>(initialCertifications);
  const [verifiedOnly, setVerifiedOnly] = useState(initialVerifiedOnly);
  const [customCert, setCustomCert] = useState('');

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
              Filter candidates by verified certifications to find qualified workers faster.
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

  const handleToggleCert = (cert: string) => {
    const updated = selectedCerts.includes(cert)
      ? selectedCerts.filter((c) => c !== cert)
      : [...selectedCerts, cert];
    setSelectedCerts(updated);
    onFilterChange(updated, verifiedOnly);
  };

  const handleAddCustom = () => {
    if (customCert.trim() && !selectedCerts.includes(customCert.trim())) {
      const updated = [...selectedCerts, customCert.trim()];
      setSelectedCerts(updated);
      setCustomCert('');
      onFilterChange(updated, verifiedOnly);
    }
  };

  const handleToggleVerified = () => {
    const updated = !verifiedOnly;
    setVerifiedOnly(updated);
    onFilterChange(selectedCerts, updated);
  };

  const handleClearAll = () => {
    setSelectedCerts([]);
    setVerifiedOnly(false);
    onFilterChange([], false);
  };

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">Filter by Certifications</h3>
        {selectedCerts.length > 0 && (
          <Button size="sm" variant="outline" onClick={handleClearAll}>
            Clear All
          </Button>
        )}
      </div>

      {/* Verified Only Toggle */}
      <div className="mb-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={verifiedOnly}
            onChange={handleToggleVerified}
            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
          />
          <span className="text-sm font-medium">Show only verified certifications</span>
        </label>
        <p className="text-xs text-gray-500 mt-1 ml-6">
          Only show candidates who uploaded certification documents
        </p>
      </div>

      {/* Certifications */}
      <div className="mb-4">
        <p className="text-sm font-medium mb-2">Certifications:</p>
        <div className="flex flex-wrap gap-2">
          {ALL_CERTIFICATIONS.map((cert) => (
            <button
              key={cert}
              onClick={() => handleToggleCert(cert)}
              className={`
                px-3 py-1.5 text-sm rounded-full border transition-colors
                ${
                  selectedCerts.includes(cert)
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-blue-500'
                }
              `}
            >
              {cert}
              {selectedCerts.includes(cert) && (
                <span className="ml-1">×</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Custom Certification */}
      <div>
        <p className="text-sm font-medium mb-2">Add Custom Certification:</p>
        <div className="flex gap-2">
          <input
            type="text"
            value={customCert}
            onChange={(e) => setCustomCert(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddCustom()}
            placeholder="e.g., Confined Space"
            className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <Button size="sm" onClick={handleAddCustom} disabled={!customCert.trim()}>
            Add
          </Button>
        </div>
      </div>

      {/* Active Filters Summary */}
      {selectedCerts.length > 0 && (
        <div className="mt-4 pt-4 border-t">
          <p className="text-xs text-gray-600 mb-2">
            Filtering for candidates with:
          </p>
          <ul className="text-xs text-gray-700 space-y-1">
            {selectedCerts.map((cert) => (
              <li key={cert}>• {cert}</li>
            ))}
          </ul>
          {verifiedOnly && (
            <p className="text-xs text-blue-600 mt-2">
              ✓ With verification documents only
            </p>
          )}
        </div>
      )}
    </Card>
  );
}
