'use client';

import { useEffect } from 'react';

import { trackEvent } from '@/observability';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    trackEvent('render-error');
  }, [error]);

  return (
    <main style={{ padding: '4rem 1.5rem', maxWidth: '40rem', margin: '0 auto' }}>
      <h1>Something went wrong</h1>
      <p>
        The page could not be rendered. Nothing you typed was sent anywhere, and the failure has
        been recorded.
      </p>
      <button type="button" onClick={reset}>
        Try again
      </button>
    </main>
  );
}
