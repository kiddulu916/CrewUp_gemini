import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: 1.0,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,

  replaysOnErrorSampleRate: 1.0,

  // This sets the sample rate to be 10%. You may want this to be 100% while
  // in development and sample at a lower rate in production
  replaysSessionSampleRate: 0.1,

  // You can remove this option if you're not planning to use the Sentry Session Replay feature:
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.browserProfilingIntegration(),
    Sentry.replayIntegration({
      // Additional Replay configuration goes in here, for example:
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],

  beforeSend(event, hint) {
    // * Add user context from Supabase auth
    if (typeof window !== 'undefined') {
      try {
        // * Dynamically find the Supabase auth token key (format: sb-{projectId}-auth-token)
        const supabaseAuthKey = Object.keys(localStorage).find((key) =>
          key.match(/^sb-[a-z0-9]+-auth-token$/)
        );

        if (supabaseAuthKey) {
          const authData = localStorage.getItem(supabaseAuthKey);
          if (authData) {
            const parsed = JSON.parse(authData);
            if (parsed?.user) {
              event.user = {
                id: parsed.user.id,
                email: parsed.user.email,
              };
            }
          }
        }
      } catch (error) {
        // ! Silently fail if we can't get user context
        console.warn('Failed to add user context to Sentry event:', error);
      }
    }
    return event;
  },
});

Sentry.metrics.count('user_action', 1);
Sentry.metrics.distribution('api_response_time', 150);
