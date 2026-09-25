import Link from "next/link";

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 to-sky-100">
      {/* Header */}
      <header className="border-b border-sky-200 bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-sky-900">Barotropic</h1>
              <p className="mt-1 text-sm text-gray-600">
                Evidence-Based Weather Intelligence Platform
              </p>
            </div>
            <nav className="flex gap-4">
              <Link
                href="/dashboard"
                className="rounded-lg bg-sky-600 px-4 py-2 text-white hover:bg-sky-700"
              >
                Dashboard
              </Link>
              <Link
                href="/forecasts"
                className="rounded-lg border border-sky-300 px-4 py-2 text-sky-700 hover:bg-sky-50"
              >
                Forecasts
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Quick Stats */}
          <div className="rounded-lg border border-sky-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-sky-900">Active Forecasts</h3>
            <p className="mt-2 text-4xl font-bold text-sky-600">0</p>
            <p className="mt-1 text-sm text-gray-600">
              No forecasts in progress
            </p>
          </div>

          <div className="rounded-lg border border-sky-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-sky-900">
              Recent Analyses
            </h3>
            <p className="mt-2 text-4xl font-bold text-sky-600">0</p>
            <p className="mt-1 text-sm text-gray-600">No recent analyses</p>
          </div>

          <div className="rounded-lg border border-sky-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-sky-900">
              Accuracy Score
            </h3>
            <p className="mt-2 text-4xl font-bold text-sky-600">--</p>
            <p className="mt-1 text-sm text-gray-600">Based on forecasts</p>
          </div>
        </div>

        {/* Get Started Section */}
        <div className="mt-8 rounded-lg border-2 border-dashed border-sky-300 bg-sky-50 p-8">
          <h2 className="text-2xl font-bold text-sky-900">Get Started</h2>
          <p className="mt-2 text-gray-700">
            Begin your first weather forecast analysis by examining atmospheric
            evidence, recognizing patterns, and forming a hypothesis.
          </p>
          <div className="mt-6 flex gap-4">
            <Link
              href="/forecasts/new"
              className="rounded-lg bg-sky-600 px-6 py-3 font-semibold text-white hover:bg-sky-700"
            >
              Create New Forecast
            </Link>
            <Link
              href="#"
              className="rounded-lg border border-sky-300 px-6 py-3 font-semibold text-sky-700 hover:bg-sky-50"
            >
              Learn More
            </Link>
          </div>
        </div>

        {/* Features Overview */}
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <div className="rounded-lg border border-sky-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-sky-900">
              📊 Pattern Analysis
            </h3>
            <p className="mt-2 text-gray-600">
              Recognize and analyze atmospheric patterns to inform your
              forecast.
            </p>
          </div>

          <div className="rounded-lg border border-sky-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-sky-900">
              🔍 Evidence Tracking
            </h3>
            <p className="mt-2 text-gray-600">
              Document and track evidence supporting your forecast hypothesis.
            </p>
          </div>

          <div className="rounded-lg border border-sky-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-sky-900">
              💭 Hypothesis Formation
            </h3>
            <p className="mt-2 text-gray-600">
              Develop well-reasoned hypotheses based on atmospheric analysis.
            </p>
          </div>

          <div className="rounded-lg border border-sky-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-sky-900">
              📢 Forecast Communication
            </h3>
            <p className="mt-2 text-gray-600">
              Articulate clear, evidence-based weather forecasts.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
