'use client';

import { useEffect } from 'react';

import { trackEvent } from '@/observability';

export default function GlobalError({
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
    <html lang="en">
      <body style={{ fontFamily: 'system-ui, sans-serif', padding: '4rem 1.5rem' }}>
        <main style={{ maxWidth: '40rem', margin: '0 auto' }}>
          <h1>Something went wrong</h1>
          <p>The page could not be rendered. The failure has been recorded.</p>
          <button type="button" onClick={reset}>
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
