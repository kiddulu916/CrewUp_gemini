'use client';

import { useState } from 'react';
import { createCheckoutSession, createPortalSession } from '../actions/subscription-actions';

export function useCheckout() {
  const [isLoading, setIsLoading] = useState(false);

  const checkout = async (priceId: string) => {
    setIsLoading(true);
    try {
      const result = await createCheckoutSession(priceId);
      if (!result.success) {
        throw new Error(result.error);
      }
      if (result.url) {
        window.location.href = result.url;
      }
    } catch (error) {
      console.error('Checkout error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const openPortal = async () => {
    setIsLoading(true);
    try {
      const result = await createPortalSession();
      if (!result.success) {
        throw new Error(result.error);
      }
      if (result.url) {
        window.location.href = result.url;
      }
    } catch (error) {
      console.error('Portal error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return { checkout, openPortal, isLoading };
}
