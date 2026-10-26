'use client';

import { AppLayout } from '@/components/AppLayout';

interface ConditionsErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ConditionsError({ error, reset }: ConditionsErrorProps) {
  return (
    <AppLayout>
      <section aria-label="Current conditions" className="condition-page">
        <h1 className="condition-page-title">Current conditions unavailable</h1>
        <p className="condition-page-meta">
          {error.message || 'The latest observation could not be loaded.'}
        </p>
        <button className="app-button" onClick={reset} type="button">
          Try again
        </button>
      </section>
    </AppLayout>
  );
}
