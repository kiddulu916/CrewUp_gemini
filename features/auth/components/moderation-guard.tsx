'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { checkUserModerationStatus } from '../actions/moderation-check';
import { createClient } from '@/lib/supabase/client';

const SUPPORT_EMAIL = 'support@krewup.net';

/**
 * Periodically checks if the current user has been banned or suspended
 * Logs them out and shows appropriate message if moderated
 */
export function ModerationGuard() {
  const router = useRouter();

  useEffect(() => {
    const checkModeration = async () => {
      const status = await checkUserModerationStatus();

      if (!status.allowed) {
        // Log out the user
        const supabase = createClient();
        await supabase.auth.signOut();

        // Build error message
        let message = '';
        if (status.moderationType === 'banned') {
          message = `Your account has been permanently banned.\n\nReason: ${status.reason}\n\nIf you believe this is a mistake, please contact ${SUPPORT_EMAIL} to appeal.`;
        } else if (status.moderationType === 'suspended') {
          const expiresDate = status.expiresAt
            ? new Date(status.expiresAt).toLocaleString()
            : 'unknown';
          message = `Your account has been temporarily suspended until ${expiresDate}.\n\nReason: ${status.reason}\n\nIf you believe this is a mistake, please contact ${SUPPORT_EMAIL} to appeal.`;
        }

        // Show alert and redirect to login
        alert(message);
        router.push('/login');
      }
    };

    // Check immediately
    checkModeration();

    // Check every 5 minutes
    const interval = setInterval(checkModeration, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [router]);

  return null;
}
