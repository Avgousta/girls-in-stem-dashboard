'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body style={{ background: '#0f172a', color: '#f1f5f9', fontFamily: 'sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', margin: 0 }}>
        <div style={{ textAlign: 'center', maxWidth: 480, padding: '2rem' }}>
          <p style={{ fontSize: 48, margin: '0 0 1rem' }}>⚠️</p>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.75rem' }}>Something went wrong</h1>
          <p style={{ color: '#94a3b8', marginBottom: '1.5rem' }}>
            The error has been reported. Please try again.
          </p>
          <button
            onClick={reset}
            style={{ background: '#7C3AED', color: '#fff', border: 'none', borderRadius: 8, padding: '0.6rem 1.5rem', fontWeight: 600, cursor: 'pointer', fontSize: '0.95rem' }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
