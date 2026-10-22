import { AppLayout } from '@/components/AppLayout';

export default function ConditionsLoading() {
  return (
    <AppLayout>
      <section aria-label="Current conditions" className="condition-page">
        <h1 className="condition-page-title">Current conditions</h1>
        <p aria-live="polite" className="condition-page-meta">
          Loading current conditions…
        </p>
      </section>
    </AppLayout>
  );
}
