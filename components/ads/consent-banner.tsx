'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  needsConsent,
  acceptAllConsent,
  acceptNecessaryConsent,
  detectRegion,
} from '@/lib/ads/consent';
import { adConfig } from '@/lib/ads/config';
import { Cookie, Shield, X } from 'lucide-react';

/**
 * ConsentBanner Component
 * 
 * GDPR/CCPA compliant consent banner for ad tracking.
 * Appears for users who haven't consented or need to re-consent.
 */
export function ConsentBanner() {
  const [showBanner, setShowBanner] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    // Only check consent if ads are enabled
    if (!adConfig.enabled) return;
    
    // Check if user needs to consent
    if (needsConsent()) {
      // Small delay to avoid flash
      const timer = setTimeout(() => setShowBanner(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAcceptAll = () => {
    acceptAllConsent();
    setShowBanner(false);
  };

  const handleAcceptNecessary = () => {
    acceptNecessaryConsent();
    setShowBanner(false);
  };

  if (!showBanner) return null;

  const region = detectRegion();
  const isEuOrCalifornia = region === 'eu' || region === 'california';

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-gradient-to-t from-black/20 to-transparent pointer-events-none">
      <Card className="max-w-2xl mx-auto shadow-xl pointer-events-auto">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 p-2 bg-blue-100 rounded-full">
              <Cookie className="h-6 w-6 text-blue-600" />
            </div>
            
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-gray-900">
                We value your privacy
              </h3>
              
              <p className="mt-2 text-sm text-gray-600">
                We use cookies and similar technologies to show you relevant ads and improve your experience.
                {isEuOrCalifornia && (
                  <span className="block mt-1">
                    As you're in {region === 'eu' ? 'the EU' : 'California'}, we need your explicit consent.
                  </span>
                )}
              </p>

              {showDetails && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg text-sm space-y-3">
                  <div className="flex items-start gap-2">
                    <Shield className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-gray-900">Essential cookies</p>
                      <p className="text-gray-600">Required for the site to function. Always active.</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-2">
                    <Cookie className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-gray-900">Advertising cookies</p>
                      <p className="text-gray-600">Used to show you relevant ads based on your interests.</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-2">
                    <Cookie className="h-4 w-4 text-purple-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-gray-900">Analytics cookies</p>
                      <p className="text-gray-600">Help us understand how you use our site.</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <Button
                  onClick={handleAcceptAll}
                  className="bg-krewup-blue hover:bg-blue-700"
                >
                  Accept All
                </Button>
                
                <Button
                  variant="outline"
                  onClick={handleAcceptNecessary}
                >
                  Necessary Only
                </Button>
                
                <button
                  onClick={() => setShowDetails(!showDetails)}
                  className="text-sm text-blue-600 hover:text-blue-800 underline"
                >
                  {showDetails ? 'Hide details' : 'Learn more'}
                </button>
              </div>

              <p className="mt-3 text-xs text-gray-500">
                Pro subscribers enjoy an ad-free experience.{' '}
                <a href="/pricing" className="text-blue-600 hover:underline">
                  Upgrade to Pro
                </a>
              </p>
            </div>

            <button
              onClick={handleAcceptNecessary}
              className="p-1 hover:bg-gray-100 rounded-full transition-colors"
              aria-label="Close"
            >
              <X className="h-5 w-5 text-gray-400" />
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

