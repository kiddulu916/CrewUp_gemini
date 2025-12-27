'use client';

import { useState } from 'react';
import { useBoostStatus, useActivateBoost, useDeactivateBoost } from '../hooks/use-boost';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { BoostBadge } from './boost-badge';
import Link from 'next/link';

export function BoostManager() {
  const { data: boostStatus, isLoading } = useBoostStatus();
  const activateBoost = useActivateBoost();
  const deactivateBoost = useDeactivateBoost();
  const [showConfirmDeactivate, setShowConfirmDeactivate] = useState(false);

  const handleActivate = async () => {
    const result = await activateBoost.mutateAsync();

    if (result.success) {
      alert('Profile boost activated for 7 days! Your profile will now appear at the top of employer searches.');
    } else {
      alert(result.error || 'Failed to activate boost');
    }
  };

  const handleDeactivate = async () => {
    if (!showConfirmDeactivate) {
      setShowConfirmDeactivate(true);
      return;
    }

    const result = await deactivateBoost.mutateAsync();

    if (result.success) {
      alert('Profile boost deactivated.');
      setShowConfirmDeactivate(false);
    } else {
      alert(result.error || 'Failed to deactivate boost');
    }
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex justify-center">
          <LoadingSpinner size="md" />
        </div>
      </Card>
    );
  }

  const getDaysRemaining = () => {
    if (!boostStatus?.expiresAt) return 0;
    const now = new Date();
    const expires = new Date(boostStatus.expiresAt);
    const diffInMs = expires.getTime() - now.getTime();
    const diffInDays = Math.ceil(diffInMs / (1000 * 60 * 60 * 24));
    return Math.max(0, diffInDays);
  };

  const getHoursRemaining = () => {
    if (!boostStatus?.expiresAt) return 0;
    const now = new Date();
    const expires = new Date(boostStatus.expiresAt);
    const diffInMs = expires.getTime() - now.getTime();
    const diffInHours = Math.ceil(diffInMs / (1000 * 60 * 60));
    return Math.max(0, diffInHours);
  };

  const daysRemaining = getDaysRemaining();
  const hoursRemaining = getHoursRemaining();

  return (
    <Card className="p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            Profile Boost
            {boostStatus?.isActive && <BoostBadge expiresAt={boostStatus.expiresAt} />}
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Get featured at the top of employer searches
          </p>
        </div>
      </div>

      {!boostStatus?.isPro ? (
        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-sm font-medium text-gray-900 mb-3">
            ⭐ Profile Boost is a Pro feature
          </p>
          <p className="text-sm text-gray-600 mb-4">
            Upgrade to Pro to boost your profile and appear at the top of employer searches for 7 days every month.
          </p>
          <Link href="/pricing">
            <Button size="sm" className="bg-gradient-to-r from-krewup-orange to-yellow-500 hover:from-krewup-orange hover:to-yellow-600">
              Upgrade to Pro
            </Button>
          </Link>
        </div>
      ) : boostStatus?.isActive ? (
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">🚀</span>
              <p className="text-sm font-semibold text-blue-900">Your profile is boosted!</p>
            </div>
            <p className="text-sm text-gray-700 mb-2">
              Your profile appears at the top of all employer searches.
            </p>
            <div className="flex items-center gap-2 text-sm">
              <span className="font-medium text-gray-900">Time remaining:</span>
              {daysRemaining > 0 ? (
                <span className="font-bold text-blue-600">{daysRemaining} day{daysRemaining !== 1 ? 's' : ''}</span>
              ) : (
                <span className="font-bold text-orange-600">{hoursRemaining} hour{hoursRemaining !== 1 ? 's' : ''}</span>
              )}
            </div>
            {boostStatus.expiresAt && (
              <p className="text-xs text-gray-500 mt-2">
                Expires on {new Date(boostStatus.expiresAt).toLocaleDateString()} at{' '}
                {new Date(boostStatus.expiresAt).toLocaleTimeString()}
              </p>
            )}
          </div>

          {showConfirmDeactivate ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm font-medium text-red-900 mb-3">
                Are you sure you want to deactivate your boost early?
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="danger"
                  onClick={handleDeactivate}
                  isLoading={deactivateBoost.isPending}
                >
                  Yes, deactivate
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowConfirmDeactivate(false)}
                  disabled={deactivateBoost.isPending}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={handleDeactivate}
              disabled={deactivateBoost.isPending}
            >
              Deactivate Boost
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="flex items-start gap-3 mb-3">
              <span className="text-2xl">⭐</span>
              <div>
                <p className="text-sm font-semibold text-gray-900 mb-1">
                  Boost your profile for 7 days
                </p>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Appear at the top of all employer searches</li>
                  <li>• Get noticed by more employers</li>
                  <li>• Increase your chances of getting hired</li>
                  <li>• Free for Pro members (can use once every 7 days)</li>
                </ul>
              </div>
            </div>
          </div>

          <Button
            onClick={handleActivate}
            isLoading={activateBoost.isPending}
            className="w-full bg-gradient-to-r from-krewup-blue to-purple-600 hover:from-krewup-blue hover:to-purple-700"
          >
            🚀 Activate Profile Boost
          </Button>
        </div>
      )}
    </Card>
  );
}
