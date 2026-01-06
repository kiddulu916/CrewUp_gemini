'use client';

import { useBoostStatus } from '../hooks/use-boost';
import { Card } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { BoostBadge } from './boost-badge';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Rocket, AlertTriangle, CheckCircle, Star } from 'lucide-react';

/**
 * BoostManager component
 * 
 * Displays the user's profile boost status and information.
 * 
 * * Profile boost is continuous for the entire Pro subscription duration
 * * Workers with Pro get automatic, always-on boost - no activation needed
 * * Boost is automatically enabled when subscribing to Pro and removed on cancellation
 */
export function BoostManager() {
  const { data: boostStatus, isLoading } = useBoostStatus();

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex justify-center">
          <LoadingSpinner size="md" />
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            Profile Boost
            {boostStatus?.isActive && <BoostBadge isActive={true} />}
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Get featured at the top of employer searches
          </p>
        </div>
      </div>

      {!boostStatus?.isPro ? (
        // * User is not a Pro subscriber
        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-500" />
            Profile Boost is a Pro feature
          </p>
          <p className="text-sm text-gray-600 mb-4">
            Upgrade to Pro to get continuous profile boosting! Your profile will appear at the top of employer searches for as long as you&apos;re a Pro member.
          </p>
          <Link href="/pricing">
            <Button size="sm" className="bg-gradient-to-r from-krewup-orange to-yellow-500 hover:from-krewup-orange hover:to-yellow-600">
              Upgrade to Pro
            </Button>
          </Link>
        </div>
      ) : boostStatus?.isActive ? (
        // * User has Pro and boost is active (continuous)
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Rocket className="h-6 w-6 text-blue-600" />
              <p className="text-sm font-semibold text-blue-900">Your profile is boosted!</p>
            </div>
            <p className="text-sm text-gray-700 mb-2">
              Your profile appears at the top of all employer searches.
            </p>
            <div className="flex items-center gap-2 text-sm mt-3">
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                <CheckCircle className="w-3 h-3" />
                Active while you&apos;re a Pro member
              </span>
            </div>
          </div>

          <div className="text-sm text-gray-500">
            <p>
              Your profile boost is continuous and will remain active as long as you maintain your Pro subscription. 
              No need to reactivate!
            </p>
          </div>
        </div>
      ) : (
        // * User has Pro but boost isn't active (shouldn't normally happen)
        <div className="space-y-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-6 w-6 text-yellow-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-yellow-900 mb-1">
                  Boost not active
                </p>
                <p className="text-sm text-gray-600">
                  Your profile boost should be automatically activated with your Pro subscription. 
                  If you&apos;re seeing this message, please contact support.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
