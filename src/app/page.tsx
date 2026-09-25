export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="max-w-2xl text-center">
        <h1 className="text-4xl font-bold text-sky-900 mb-4">
          Barotropic
        </h1>
        <p className="text-lg text-gray-600 mb-8">
          Weather forecasting as a process of examining evidence, recognizing
          atmospheric patterns, forming hypotheses, and communicating
          forecasts—not simply consuming a generated forecast.
        </p>
        <div className="space-y-4 text-left">
          <section>
            <h2 className="text-xl font-semibold text-sky-700 mb-2">
              Getting Started
            </h2>
            <p className="text-gray-600">
              This is the initial scaffold. Start building your weather
              intelligence platform here.
            </p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-sky-700 mb-2">
              Project Structure
            </h2>
            <ul className="text-gray-600 space-y-1 list-disc list-inside">
              <li>
                <code className="bg-gray-100 px-2 py-1 rounded">
                  src/app
                </code>
                : Next.js App Router pages and layouts
              </li>
              <li>
                <code className="bg-gray-100 px-2 py-1 rounded">
                  src/components
                </code>
                : Reusable React components
              </li>
              <li>
                <code className="bg-gray-100 px-2 py-1 rounded">
                  src/lib
                </code>
                : Utility functions and helpers
              </li>
              <li>
                <code className="bg-gray-100 px-2 py-1 rounded">
                  src/types
                </code>
                : TypeScript type definitions
              </li>
            </ul>
          </section>
        </div>
      </div>
    </main>
  );
}
