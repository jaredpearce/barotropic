'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ForecastField from '@/components/ForecastField';
import { useForecastGuidance } from '@/lib/hooks/use-forecast-guidance';
import {
  emptyForecastValues,
  forecastFieldKeys,
  getForecastRevisionHistory,
  getForecastSnapshot,
  saveForecastRevision,
  type ForecastDraft,
  type ForecastFieldKey,
  type ForecastRevision,
  type ForecastSnapshot,
  type ForecastSourceValues,
  type ForecastValues,
} from '@/lib/forecast-workspace/db';
import {
  forecastFields,
  mergeForecastValues,
  validateForecastDraft,
} from '@/lib/forecast-workspace/fields';
import { locationLabel, type LocationResult } from '@/lib/location';

interface ForecastEditorProps {
  forecastId?: string;
}

type LocationSearchState = 'idle' | 'loading' | 'empty' | 'error';

const AUTOSAVE_DELAY_MS = 600;

function signatureOf(draft: ForecastDraft): string {
  return JSON.stringify([
    draft.locationName,
    draft.latitude ?? null,
    draft.longitude ?? null,
    draft.validStart,
    forecastFieldKeys.map((key) => draft.values[key]),
    draft.reasoning,
  ]);
}

function hasValues(values: ForecastSourceValues): boolean {
  return Object.values(values).some(Boolean);
}

function guidanceMessage(
  status: 'idle' | 'loading' | 'success' | 'error',
  error: string | null,
  label: string,
): string {
  if (status === 'loading') return `Loading ${label} guidance…`;
  if (status === 'error') return error ?? `${label} guidance is unavailable.`;
  if (status === 'success') return `${label} guidance loaded.`;
  return `${label} guidance is unavailable.`;
}

export default function ForecastEditor({ forecastId }: ForecastEditorProps) {
  const [snapshot, setSnapshot] = useState<ForecastSnapshot>();
  const [history, setHistory] = useState<ForecastRevision[]>([]);
  const [locationName, setLocationName] = useState('');
  const [coordinates, setCoordinates] = useState<{ latitude: number; longitude: number }>();
  const [validStart, setValidStart] = useState('');
  const [values, setValues] = useState<ForecastValues>(emptyForecastValues);
  const [reasoning, setReasoning] = useState('');
  const [status, setStatus] = useState('Loading forecast workspace…');
  const [loadError, setLoadError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [loaded, setLoaded] = useState(!forecastId);
  const [locationResults, setLocationResults] = useState<LocationResult[]>([]);
  const [locationSearchState, setLocationSearchState] = useState<LocationSearchState>('idle');
  const savedSignature = useRef<string | null>(null);
  const saveQueue = useRef(Promise.resolve());
  const forecastIdRef = useRef(forecastId);
  const mountedRef = useRef(true);
  const draft = useMemo<ForecastDraft>(
    () => ({
      locationName: locationName.trim(),
      latitude: coordinates?.latitude,
      longitude: coordinates?.longitude,
      validStart,
      values,
      reasoning,
    }),
    [locationName, coordinates, validStart, values, reasoning],
  );
  const draftRef = useRef(draft);
  const loadedRef = useRef(loaded);
  draftRef.current = draft;
  loadedRef.current = loaded;
  const signature = signatureOf(draft);
  const guidance = useForecastGuidance({
    latitude: coordinates?.latitude,
    longitude: coordinates?.longitude,
    validStart,
  });
  const guidanceValuesRef = useRef({
    officialValues: guidance.officialValues,
    modelValues: guidance.modelValues,
    guidance: guidance.guidance,
    target: guidance.target,
  });
  guidanceValuesRef.current = {
    officialValues: guidance.officialValues,
    modelValues: guidance.modelValues,
    guidance: guidance.guidance,
    target: guidance.target,
  };

  const officialValues =
    guidance.officialStatus === 'loading' || guidance.officialStatus === 'idle'
      ? (snapshot?.revision.officialValues ?? {})
      : hasValues(guidance.officialValues)
        ? guidance.officialValues
        : (snapshot?.revision.officialValues ?? {});
  const modelValues =
    guidance.modelStatus === 'loading' || guidance.modelStatus === 'idle'
      ? (snapshot?.revision.modelValues ?? {})
      : hasValues(guidance.modelValues)
        ? guidance.modelValues
        : (snapshot?.revision.modelValues ?? {});

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!forecastId) {
      savedSignature.current = signatureOf(draftRef.current);
      setStatus('Enter a location to start saving.');
      setLoaded(true);
      return;
    }

    let active = true;
    getForecastSnapshot(forecastId)
      .then(async (result) => {
        if (!active) return;
        if (!result) {
          setLoadError('This forecast could not be found.');
          return;
        }
        const loadedDraft: ForecastDraft = {
          locationName: result.forecast.locationName,
          latitude: result.location?.latitude,
          longitude: result.location?.longitude,
          validStart: result.forecast.validStart,
          values: mergeForecastValues(result.revision.values, emptyForecastValues()),
          reasoning: result.revision.reasoning,
        };
        setSnapshot(result);
        setLocationName(loadedDraft.locationName);
        setCoordinates(
          loadedDraft.latitude !== undefined && loadedDraft.longitude !== undefined
            ? { latitude: loadedDraft.latitude, longitude: loadedDraft.longitude }
            : undefined,
        );
        setValidStart(loadedDraft.validStart);
        setValues(loadedDraft.values);
        setReasoning(loadedDraft.reasoning);
        savedSignature.current = signatureOf(loadedDraft);
        setHistory(await getForecastRevisionHistory(forecastId));
        setStatus(`Saved · revision ${result.revision.revisionNumber}`);
        setLoaded(true);
      })
      .catch((error: unknown) => {
        if (active) {
          setLoadError(
            error instanceof Error
              ? `Unable to load forecast: ${error.message}`
              : 'Unable to load forecast.',
          );
        }
      });

    return () => {
      active = false;
    };
  }, [forecastId]);

  const saveNow = useCallback(async () => {
    const currentDraft = draftRef.current;
    if (!currentDraft.locationName) {
      if (mountedRef.current) setStatus('Enter a location to start saving.');
      return;
    }

    const validationError = validateForecastDraft(currentDraft);
    if (validationError) {
      if (mountedRef.current) {
        setStatus('Save failed.');
        setSaveError(validationError);
      }
      return;
    }

    if (mountedRef.current) {
      setStatus('Saving…');
      setSaveError('');
    }

    try {
      const next = await saveForecastRevision({
        forecastId: forecastIdRef.current,
        ...currentDraft,
        ...guidanceValuesRef.current,
      });
      forecastIdRef.current = next.forecast.id;
      savedSignature.current = signatureOf(currentDraft);

      if (!mountedRef.current) return;
      setSnapshot(next);
      setHistory(await getForecastRevisionHistory(next.forecast.id));
      setStatus(`Saved · revision ${next.revision.revisionNumber}`);
    } catch (error) {
      if (!mountedRef.current) return;
      setStatus('Save failed.');
      setSaveError(
        error instanceof Error
          ? `Unable to save forecast: ${error.message}`
          : 'Unable to save forecast.',
      );
    }
  }, []);

  useEffect(() => {
    if (!loaded || loadError) return;

    if (!locationName.trim()) {
      if (signature !== savedSignature.current) setStatus('Enter a location to start saving.');
      return;
    }

    if (signature === savedSignature.current) return;

    setSaveError('');
    setStatus('Unsaved changes');
    const timer = window.setTimeout(() => {
      saveQueue.current = saveQueue.current.then(saveNow, saveNow);
    }, AUTOSAVE_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, [loaded, loadError, saveNow, signature, locationName]);

  useEffect(() => {
    const flush = () => {
      if (!loadedRef.current || !draftRef.current.locationName) return;
      if (signatureOf(draftRef.current) === savedSignature.current) return;
      saveQueue.current = saveQueue.current.then(saveNow, saveNow);
    };
    const flushWhenHidden = () => {
      if (document.visibilityState === 'hidden') flush();
    };

    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', flushWhenHidden);
    return () => {
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', flushWhenHidden);
      flush();
    };
  }, [saveNow]);

  function updateField(field: ForecastFieldKey, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  function updateLocationName(value: string) {
    setLocationName(value);
    setCoordinates(undefined);
    setLocationResults([]);
    setLocationSearchState('idle');
  }

  async function searchLocations(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = locationName.trim();
    if (query.length < 2) {
      setLocationResults([]);
      setLocationSearchState('empty');
      return;
    }

    setLocationSearchState('loading');
    try {
      const url = new URL('/api/geocode', window.location.origin);
      url.searchParams.set('q', query);
      const response = await fetch(url);
      if (!response.ok) throw new Error('Location search failed');
      const payload = (await response.json()) as { results?: LocationResult[] };
      const results = payload.results ?? [];
      setLocationResults(results);
      setLocationSearchState(results.length ? 'idle' : 'empty');
    } catch {
      setLocationResults([]);
      setLocationSearchState('error');
    }
  }

  function selectLocation(result: LocationResult) {
    setLocationName(locationLabel(result));
    setCoordinates({ latitude: result.latitude, longitude: result.longitude });
    setLocationResults([]);
    setLocationSearchState('idle');
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
              {forecastId ? 'Edit Forecast' : 'New Forecast'}
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
          <div className="text-sm font-semibold text-sky-900">
            <label htmlFor="forecast-location">Location</label>
            <form className="mt-2 flex gap-2" onSubmit={searchLocations}>
              <input
                id="forecast-location"
                aria-label="Location"
                type="text"
                value={locationName}
                onChange={(event) => updateLocationName(event.target.value)}
                className="w-full rounded-lg border border-sky-200 px-3 py-2 font-normal focus:border-sky-600 focus:outline-none"
                placeholder="Enter a location"
              />
              <button
                type="submit"
                className="shrink-0 rounded-lg border border-sky-300 px-3 py-2 font-normal text-sky-700 hover:bg-sky-50"
                disabled={locationSearchState === 'loading'}
              >
                {locationSearchState === 'loading' ? 'Searching…' : 'Find'}
              </button>
            </form>
            {coordinates ? (
              <p className="mt-2 text-xs font-normal text-gray-600">
                Guidance coordinates: {coordinates.latitude.toFixed(3)},{' '}
                {coordinates.longitude.toFixed(3)}
              </p>
            ) : (
              <p className="mt-2 text-xs font-normal text-gray-600">
                Search for a location to load official and model guidance.
              </p>
            )}
            {locationSearchState === 'empty' && (
              <p className="mt-2 text-xs font-normal text-gray-600">No matching locations found.</p>
            )}
            {locationSearchState === 'error' && (
              <p className="mt-2 text-xs font-normal text-red-700">
                Location search is unavailable. You can still enter a forecast manually.
              </p>
            )}
            {locationResults.length > 0 && (
              <ul className="mt-2 space-y-1 font-normal" aria-label="Location results">
                {locationResults.map((result) => (
                  <li key={`${result.id}-${result.latitude}-${result.longitude}`}>
                    <button
                      type="button"
                      className="w-full rounded-md px-2 py-1 text-left text-sm text-sky-800 hover:bg-sky-50"
                      onClick={() => selectLocation(result)}
                    >
                      {locationLabel(result)}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
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
          <p className="mb-2 text-sm text-gray-600">
            Official and model guidance appear when a location with coordinates is selected.
          </p>
          <p className="mb-4 text-xs text-gray-500" aria-live="polite">
            {guidanceMessage(guidance.officialStatus, guidance.officialError, 'Official')} ·{' '}
            {guidanceMessage(guidance.modelStatus, guidance.modelError, 'Model')}
          </p>
          <div className="mb-2 hidden grid-cols-[minmax(10rem,1fr)_minmax(10rem,1fr)_minmax(10rem,1fr)] gap-3 text-xs font-bold uppercase tracking-wide text-gray-500 sm:grid">
            <span>Your forecast</span>
            <span>Official</span>
            <span>Model</span>
          </div>
          {forecastFields.map((field) => (
            <ForecastField
              key={field.key}
              field={field.key}
              value={values[field.key]}
              officialValue={officialValues[field.key]}
              modelValue={modelValues[field.key]}
              onChange={(value) => updateField(field.key, value)}
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
            <div className="mt-2">
              <p role="alert" className="text-red-700">
                {saveError}
              </p>
              <button
                type="button"
                onClick={() => {
                  saveQueue.current = saveQueue.current.then(saveNow, saveNow);
                }}
                className="mt-2 rounded-lg border border-sky-300 px-3 py-1 text-sky-700 hover:bg-sky-50"
              >
                Retry save
              </button>
            </div>
          )}
        </div>
        {snapshot && (
          <p className="text-xs text-gray-500">
            Revision history: {snapshot.revision.revisionNumber}{' '}
            {snapshot.revision.revisionNumber === 1 ? 'revision' : 'revisions'}
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
                  Revision {revision.revisionNumber} · High: {revision.values.high || 'Not set'}
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
