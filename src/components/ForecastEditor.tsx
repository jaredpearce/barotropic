"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ForecastField from "@/components/ForecastField";
import {
  emptyForecastValues,
  forecastFieldKeys,
  getForecastRevisionHistory,
  getForecastSnapshot,
  saveForecastRevision,
  type ForecastFieldKey,
  type ForecastRevision,
  type ForecastSnapshot,
  type ForecastValues,
} from "@/lib/forecast-workspace/db";

interface ForecastEditorProps {
  forecastId?: string;
}

function getPayloadSignature(payload: {
  locationName: string;
  validStart: string;
  values: ForecastValues;
  reasoning: string;
}) {
  return JSON.stringify(payload);
}

export default function ForecastEditor({ forecastId }: ForecastEditorProps) {
  const [snapshot, setSnapshot] = useState<ForecastSnapshot>();
  const [history, setHistory] = useState<ForecastRevision[]>([]);
  const [locationName, setLocationName] = useState("");
  const [validStart, setValidStart] = useState("");
  const [values, setValues] = useState<ForecastValues>(emptyForecastValues);
  const [reasoning, setReasoning] = useState("");
  const [status, setStatus] = useState("Loading forecast workspace…");
  const [loadError, setLoadError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [loaded, setLoaded] = useState(!forecastId);
  const savedSignature = useRef<string | null>(null);
  const saveQueue = useRef(Promise.resolve());
  const forecastIdRef = useRef(forecastId);
  const payload = useMemo(
    () => ({
      locationName: locationName.trim(),
      validStart,
      values,
      reasoning,
    }),
    [locationName, validStart, values, reasoning],
  );
  const signature = getPayloadSignature(payload);

  useEffect(() => {
    if (!forecastId) {
      savedSignature.current = signature;
      setStatus("Changes save automatically.");
      setLoaded(true);
      return;
    }

    let active = true;
    getForecastSnapshot(forecastId)
      .then(async (result) => {
        if (!active) return;
        if (!result) {
          setLoadError("This forecast could not be found.");
          return;
        }
        setSnapshot(result);
        setLocationName(result.forecast.locationName);
        setValidStart(result.forecast.validStart);
        setValues(result.revision.values);
        setReasoning(result.revision.reasoning);
        savedSignature.current = getPayloadSignature({
          locationName: result.forecast.locationName,
          validStart: result.forecast.validStart,
          values: result.revision.values,
          reasoning: result.revision.reasoning,
        });
        setHistory(await getForecastRevisionHistory(forecastId));
        setStatus(`Saved · revision ${result.revision.revisionNumber}`);
        setLoaded(true);
      })
      .catch((error: unknown) => {
        if (active) {
          setLoadError(
            error instanceof Error
              ? `Unable to load forecast: ${error.message}`
              : "Unable to load forecast.",
          );
        }
      });

    return () => {
      active = false;
    };
  }, [forecastId]);

  const save = useCallback(async () => {
    setStatus("Saving…");
    setSaveError("");
    try {
      const next = await saveForecastRevision({
        forecastId: forecastIdRef.current,
        ...payload,
      });
      forecastIdRef.current = next.forecast.id;
      setSnapshot(next);
      savedSignature.current = signature;
      setHistory(await getForecastRevisionHistory(next.forecast.id));
      setStatus(`Saved · revision ${next.revision.revisionNumber}`);
    } catch (error) {
      setStatus("Save failed.");
      setSaveError(
        error instanceof Error
          ? `Unable to save forecast: ${error.message}`
          : "Unable to save forecast.",
      );
    }
  }, [payload, signature]);

  useEffect(() => {
    if (!loaded || loadError || signature === savedSignature.current) return;
    const timer = window.setTimeout(() => {
      saveQueue.current = saveQueue.current.then(save, save);
    }, 600);
    return () => window.clearTimeout(timer);
  }, [loaded, loadError, save, signature]);

  function updateField(field: ForecastFieldKey, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  if (loadError) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-10" role="alert">
        <p className="text-red-700">{loadError}</p>
        <Link href="/forecasts" className="mt-4 inline-block text-sky-700 underline">
          Back to forecasts
        </Link>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 to-sky-100">
      <header className="border-b border-sky-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-6 sm:px-6 lg:px-8">
          <div>
            <h1 className="text-3xl font-bold text-sky-900">
              {forecastId ? "Edit Forecast" : "New Forecast"}
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              Compare source guidance and record your forecast.
            </p>
          </div>
          <Link
            href="/forecasts"
            className="rounded-lg border border-sky-300 px-4 py-2 text-sky-700 hover:bg-sky-50"
          >
            Back to forecasts
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        <section className="grid gap-4 rounded-lg border border-sky-200 bg-white p-6 shadow-sm sm:grid-cols-2">
          <label className="text-sm font-semibold text-sky-900">
            Location
            <input
              aria-label="Location"
              type="text"
              value={locationName}
              onChange={(event) => setLocationName(event.target.value)}
              className="mt-2 w-full rounded-lg border border-sky-200 px-3 py-2 font-normal focus:border-sky-600 focus:outline-none"
              placeholder="Enter a location"
            />
          </label>
          <label className="text-sm font-semibold text-sky-900">
            Valid from
            <input
              aria-label="Valid from"
              type="datetime-local"
              value={validStart}
              onChange={(event) => setValidStart(event.target.value)}
              className="mt-2 w-full rounded-lg border border-sky-200 px-3 py-2 font-normal focus:border-sky-600 focus:outline-none"
            />
          </label>
        </section>

        <section
          aria-label="Forecast fields"
          className="rounded-lg border border-sky-200 bg-white p-6 shadow-sm"
        >
          <p className="mb-4 text-sm text-gray-600">
            Official and model guidance will appear when source data is
            available for this location.
          </p>
          <div className="mb-2 hidden grid-cols-[minmax(10rem,1fr)_minmax(10rem,1fr)_minmax(10rem,1fr)] gap-3 text-xs font-bold uppercase tracking-wide text-gray-500 sm:grid">
            <span>Your forecast</span>
            <span>Official</span>
            <span>Model</span>
          </div>
          {forecastFieldKeys.map((field) => (
            <ForecastField
              key={field}
              field={field}
              value={values[field]}
              officialValue={snapshot?.revision.officialValues[field]}
              modelValue={snapshot?.revision.modelValues[field]}
              onChange={(value) => updateField(field, value)}
            />
          ))}
        </section>

        <section className="rounded-lg border border-sky-200 bg-white p-6 shadow-sm">
          <label htmlFor="forecast-reasoning" className="text-sm font-semibold text-sky-900">
            Reasoning
          </label>
          <p className="mt-1 text-sm text-gray-600">
            Record the evidence and thinking behind these values.
          </p>
          <textarea
            id="forecast-reasoning"
            value={reasoning}
            onChange={(event) => setReasoning(event.target.value)}
            rows={5}
            className="mt-3 w-full rounded-lg border border-sky-200 px-3 py-2 focus:border-sky-600 focus:outline-none"
            placeholder="Why are you forecasting these conditions?"
          />
        </section>

        <div aria-live="polite" className="min-h-6 text-sm text-gray-600">
          <p>{status}</p>
          {saveError && (
            <p role="alert" className="text-red-700">
              {saveError}
            </p>
          )}
        </div>
        {snapshot && (
          <p className="text-xs text-gray-500">
            Revision history: {snapshot.revision.revisionNumber}{" "}
            {snapshot.revision.revisionNumber === 1 ? "revision" : "revisions"}
          </p>
        )}
        {history.length > 0 && (
          <section
            aria-label="Saved revision history"
            className="rounded-lg border border-sky-200 bg-white p-6 shadow-sm"
          >
            <h2 className="font-semibold text-sky-900">Saved revisions</h2>
            <ol className="mt-3 space-y-2">
              {history.map((revision) => (
                <li
                  key={revision.id}
                  className="rounded-md bg-sky-50 px-3 py-2 text-sm text-gray-700"
                >
                  Revision {revision.revisionNumber} · High: {revision.values.high || "Not set"}
                  {revision.reasoning && ` · ${revision.reasoning}`}
                </li>
              ))}
            </ol>
          </section>
        )}
      </main>
    </div>
  );
}
