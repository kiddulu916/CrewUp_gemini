// features/proximity-alerts/components/proximity-alert-settings.tsx
'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getMyProximityAlert,
  updateProximityAlert,
} from '../actions/proximity-alert-actions';
import { useIsPro } from '@/features/subscriptions/hooks/use-subscription';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { TRADES } from '@/lib/constants';

export function ProximityAlertSettings() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const isPro = useIsPro();

  const [radiusKm, setRadiusKm] = useState(25);
  const [selectedTrades, setSelectedTrades] = useState<string[]>([]);
  const [isActive, setIsActive] = useState(true);

  // Fetch current settings
  const { data: alertData } = useQuery({
    queryKey: ['proximity-alert'],
    queryFn: async () => {
      const result = await getMyProximityAlert();
      if (!result.success) throw new Error(result.error);
      // Return null instead of undefined if no alert exists
      return result.alert || null;
    },
    enabled: isPro,
  });

  // Update local state when data loads
  useEffect(() => {
    if (alertData) {
      setRadiusKm(alertData.radius_km);
      setSelectedTrades(alertData.trades);
      setIsActive(alertData.is_active);
    }
  }, [alertData]);

  // Mutation to update settings
  const updateMutation = useMutation({
    mutationFn: () => updateProximityAlert(radiusKm, selectedTrades, isActive),
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ['proximity-alert'] });
      }
    },
  });

  // Free user - show upgrade prompt
  if (!isPro) {
    return (
      <Card className="p-6 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 mb-4 bg-blue-100 rounded-full">
          <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        <h3 className="text-xl font-bold mb-2">Proximity Alerts</h3>
        <p className="text-gray-600 mb-4">
          Get notified when new jobs are posted within your chosen radius. Never miss nearby opportunities!
        </p>
        <Button onClick={() => router.push('/pricing')}>
          Upgrade to Pro - $15/month
        </Button>
      </Card>
    );
  }

  const handleToggleTrade = (trade: string) => {
    setSelectedTrades((prev) =>
      prev.includes(trade) ? prev.filter((t) => t !== trade) : [...prev, trade]
    );
  };

  const handleSave = () => {
    updateMutation.mutate();
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold">Proximity Alert Settings</h3>
          <p className="text-sm text-gray-600">
            Get notified about new jobs near you
          </p>
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <span className="text-sm font-medium">
            {isActive ? 'Active' : 'Inactive'}
          </span>
          <div className="relative">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </div>
        </label>
      </div>

      <div className="space-y-6">
        {/* Radius Slider */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium">Alert Radius</label>
            <span className="text-lg font-bold text-blue-600">{radiusKm} km</span>
          </div>
          <input
            type="range"
            min="5"
            max="50"
            step="5"
            value={radiusKm}
            onChange={(e) => setRadiusKm(parseInt(e.target.value, 10))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>5 km</span>
            <span>50 km</span>
          </div>
        </div>

        {/* Trade Selection */}
        <div>
          <label className="block text-sm font-medium mb-3">
            Trades to Monitor ({selectedTrades.length} selected)
          </label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {TRADES.map((trade) => (
              <button
                key={trade}
                onClick={() => handleToggleTrade(trade)}
                className={`
                  px-3 py-2 text-sm rounded-lg border transition-colors text-left
                  ${
                    selectedTrades.includes(trade)
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-blue-500'
                  }
                `}
              >
                {trade}
              </button>
            ))}
          </div>
          {selectedTrades.length === 0 && (
            <p className="text-xs text-red-600 mt-2">
              Please select at least one trade
            </p>
          )}
        </div>

        {/* Save Button */}
        <div className="pt-4 border-t">
          <Button
            onClick={handleSave}
            disabled={updateMutation.isPending || selectedTrades.length === 0}
            className="w-full"
          >
            {updateMutation.isPending ? 'Saving...' : 'Save Alert Settings'}
          </Button>
          {updateMutation.isSuccess && (
            <p className="text-sm text-green-600 text-center mt-2">
              Settings saved successfully!
            </p>
          )}
          {updateMutation.isError && (
            <p className="text-sm text-red-600 text-center mt-2">
              Failed to save settings. Please try again.
            </p>
          )}
        </div>

        {/* Info */}
        {isActive && selectedTrades.length > 0 && (
          <div className="bg-blue-50 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>You'll be notified when:</strong> New {selectedTrades.join(', ')} jobs
              are posted within {radiusKm} km of your location. Alerts are checked every 10 minutes.
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}
