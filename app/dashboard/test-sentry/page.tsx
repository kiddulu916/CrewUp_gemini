'use client';

import { Button } from '@/components/ui';

export default function TestSentryPage() {
  const throwError = () => {
    throw new Error('Test Sentry Error - This is intentional!');
  };

  const throwAsyncError = async () => {
    await new Promise((resolve) => setTimeout(resolve, 100));
    throw new Error('Test Async Sentry Error - This is intentional!');
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Sentry Error Testing</h1>
        <p className="text-gray-600 mt-2">
          Use these buttons to test that Sentry is properly configured and capturing errors.
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 space-y-4">
        <div>
          <h2 className="text-xl font-semibold mb-2">Test Error Capture</h2>
          <p className="text-sm text-gray-600 mb-4">
            Click the button below to trigger a test error. Check your Sentry dashboard to
            verify the error was captured with user context.
          </p>
          <Button onClick={throwError} variant="danger">
            Throw Test Error
          </Button>
        </div>

        <div className="pt-4 border-t">
          <h2 className="text-xl font-semibold mb-2">Test Async Error</h2>
          <p className="text-sm text-gray-600 mb-4">
            Click the button below to trigger an async test error.
          </p>
          <Button onClick={throwAsyncError} variant="danger">
            Throw Async Test Error
          </Button>
        </div>

        <div className="pt-4 border-t">
          <h2 className="text-xl font-semibold mb-2">Instructions</h2>
          <ol className="list-decimal list-inside text-sm text-gray-600 space-y-2">
            <li>Make sure you have replaced the placeholder Sentry DSN in .env.local with your actual DSN</li>
            <li>Click one of the error buttons above</li>
            <li>Check your Sentry dashboard at https://sentry.io</li>
            <li>Verify the error appears with user context (user ID and email)</li>
            <li>Delete this test page before deploying to production</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
