// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

const { nodeProfilingIntegration } = require("@sentry/profiling-node");

Sentry.init({
  dsn: "https://ad6e07c9bc730e345b8354905beba907@o4509613448757248.ingest.us.sentry.io/4510613324365824",
  integrations: [
    nodeProfilingIntegration(),
  ],
  tracesSampleRate: 1,
  // Set sampling rate for profiling - this is evaluated only once per SDK.init call
  profileSessionSampleRate: 1.0,
  // Trace lifecycle automatically enables profiling during active traces
  profileLifecycle: 'trace',

  // Enable logs to be sent to Sentry
  enableLogs: true,

  // Enable sending user PII (Personally Identifiable Information)
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/options/#sendDefaultPii
  sendDefaultPii: true,
});

Sentry.startSpan({
  name: "My Span",
}, () => {
  // The code executed here will be profiled
});

Sentry.metrics.count('user_action', 1);
Sentry.metrics.distribution('api_response_time', 150);
