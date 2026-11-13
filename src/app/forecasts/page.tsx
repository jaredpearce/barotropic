'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { listForecastSnapshots, type ForecastSnapshot } from '@/lib/forecast-workspace/db';

export default function ForecastsPage() {
  const [forecasts, setForecasts] = useState<ForecastSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    listForecastSnapshots()
      .then(setForecasts)
      .catch((cause: unknown) => {
        setError(
          cause instanceof Error
            ? `Unable to load forecasts: ${cause.message}`
            : 'Unable to load forecasts.',
        );
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-full bg-gradient-to-br from-sky-50 to-sky-100">
      <header className="border-b border-sky-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-6 sm:px-6 lg:px-8">
          <div>
            <h1 className="text-3xl font-bold text-sky-900">Forecasts</h1>
            <p className="mt-1 text-sm text-gray-600">Browse and manage your weather forecasts</p>
          </div>
          <Link
            href="/forecasts/new"
            className="rounded-lg bg-sky-600 px-4 py-2 text-white hover:bg-sky-700"
          >
            + New Forecast
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {loading && <p role="status">Loading forecasts…</p>}
        {error && (
          <p role="alert" className="text-red-700">
            {error}
          </p>
        )}
        {!loading && !error && forecasts.length === 0 && (
          <div className="rounded-lg border-2 border-dashed border-sky-300 bg-white py-12 text-center">
            <div className="mx-auto max-w-md">
              <h2 className="text-2xl font-bold text-sky-900">No Forecasts Yet</h2>
              <p className="mt-2 text-gray-600">
                Create a forecast to record your outlook and reasoning.
              </p>
              <Link
                href="/forecasts/new"
                className="mt-6 inline-block rounded-lg bg-sky-600 px-6 py-3 font-semibold text-white hover:bg-sky-700"
              >
                Create First Forecast
              </Link>
            </div>
          </div>
        )}
        {!loading && forecasts.length > 0 && (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {forecasts.map(({ forecast, revision }) => (
              <li key={forecast.id}>
                <Link
                  href={`/forecasts/${forecast.id}`}
                  className="block rounded-lg border border-sky-200 bg-white p-5 shadow-sm hover:border-sky-400"
                >
                  <h2 className="text-lg font-semibold text-sky-900">
                    {forecast.locationName || 'Untitled location'}
                  </h2>
                  <p className="mt-1 text-sm text-gray-600">
                    {forecast.validStart || 'Valid time not set'}
                  </p>
                  <p className="mt-3 text-sm text-gray-700">
                    High: {revision.values.high || 'Not set'} · Low:{' '}
                    {revision.values.low || 'Not set'}
                  </p>
                  <p className="mt-2 text-xs text-gray-500">Revision {revision.revisionNumber}</p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
