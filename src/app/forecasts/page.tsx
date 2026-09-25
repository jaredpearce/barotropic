import Link from "next/link";

export default function ForecastsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 to-sky-100">
      {/* Header */}
      <header className="border-b border-sky-200 bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-sky-900">Forecasts</h1>
              <p className="mt-1 text-sm text-gray-600">
                Browse and manage all weather forecasts
              </p>
            </div>
            <Link
              href="/forecasts/new"
              className="rounded-lg bg-sky-600 px-4 py-2 text-white hover:bg-sky-700"
            >
              + New Forecast
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Empty State */}
        <div className="rounded-lg border-2 border-dashed border-sky-300 bg-white py-12 text-center">
          <div className="mx-auto max-w-md">
            <h2 className="text-2xl font-bold text-sky-900">No Forecasts Yet</h2>
            <p className="mt-2 text-gray-600">
              Start by creating your first forecast to begin the process of
              examining evidence, recognizing patterns, and forming hypotheses.
            </p>
            <Link
              href="/forecasts/new"
              className="mt-6 inline-block rounded-lg bg-sky-600 px-6 py-3 font-semibold text-white hover:bg-sky-700"
            >
              Create First Forecast
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
