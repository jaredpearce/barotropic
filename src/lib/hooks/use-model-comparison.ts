'use client';

import { useCallback, useEffect, useState } from 'react';
import { chartColors } from '@/lib/charts/theme';
import type { GuidanceSourceId } from '@/lib/forecast-workspace/db';
import { OPEN_METEO_MODELS, type OpenMeteoModelName } from '@/lib/open-meteo/utils';
import type { NormalizedWeatherRecord } from '@/lib/schemas/normalized';

export type ComparisonSourceId = GuidanceSourceId;

/** One provider's hourly series plus its run/retrieval metadata. */
export interface ComparisonSource {
  id: ComparisonSourceId;
  label: string;
  color: string;
  status: 'success' | 'error';
  records: NormalizedWeatherRecord[];
  /** Provider initialization/issue time; null when the provider omits it. */
  runTime: string | null;
  /** When this app fetched the series. */
  retrievedAt: string | null;
  error: string | null;
  /** Shown in the legend, e.g. a periods fallback note. */
  note?: string;
}

export type ModelComparisonStatus = 'idle' | 'loading' | 'success';

export interface UseModelComparisonOptions {
  latitude?: number;
  longitude?: number;
}

export interface UseModelComparisonResult {
  status: ModelComparisonStatus;
  /** Always four entries (NWS, GFS, HRRR, ECMWF); failed sources carry `error`. */
  sources: ComparisonSource[];
  timeZone?: string;
  stationId?: string;
  lastRetrievedAt: string | null;
  /** Re-fetch both endpoints. */
  refresh: () => void;
}

interface ComparisonState {
  status: ModelComparisonStatus;
  sources: ComparisonSource[];
  timeZone?: string;
  stationId?: string;
  lastRetrievedAt: string | null;
}

const MODEL_ORDER: OpenMeteoModelName[] = ['gfs', 'hrrr', 'ecmwf'];
const NWS_ERROR = 'NWS guidance is unavailable for this location.';
const MODEL_ERROR = 'Model guidance is unavailable for this location.';

interface NwsPointResponse {
  forecast?: NormalizedWeatherRecord[];
  hourly?: NormalizedWeatherRecord[];
  timeZone?: string | null;
  stationId?: string | null;
  forecastIssuedAt?: string | null;
  retrievedAt?: string;
}

interface OpenMeteoModelResponse {
  hourly?: NormalizedWeatherRecord[];
  retrievedAt?: string;
  runTime?: string | null;
}

interface OpenMeteoResponse {
  models?: Record<string, OpenMeteoModelResponse>;
  modelErrors?: Record<string, string>;
}

const IDLE_STATE: ComparisonState = {
  status: 'idle',
  sources: [],
  lastRetrievedAt: null,
};

function hasCoordinates(latitude?: number, longitude?: number): boolean {
  return (
    typeof latitude === 'number' &&
    Number.isFinite(latitude) &&
    typeof longitude === 'number' &&
    Number.isFinite(longitude)
  );
}

function errorSource(id: ComparisonSourceId, message: string): ComparisonSource {
  return {
    id,
    label: id,
    color: chartColors[id],
    status: 'error',
    records: [],
    runTime: null,
    retrievedAt: null,
    error: message,
  };
}

function errorModelSources(message: string): ComparisonSource[] {
  return MODEL_ORDER.map((name) =>
    errorSource(OPEN_METEO_MODELS[name].name as ComparisonSourceId, message),
  );
}

/** Most recent successful retrieval, as an ISO string. */
function latestRetrievedAt(sources: ComparisonSource[]): string | null {
  const times = sources
    .map((source) => source.retrievedAt)
    .filter((value): value is string => Boolean(value))
    .map((value) => Date.parse(value))
    .filter((value) => Number.isFinite(value));

  if (times.length === 0) return null;
  return new Date(Math.max(...times)).toISOString();
}

/**
 * Fetch NWS and the three Open-Meteo models in parallel for the Compare screen.
 *
 * Each source is resolved independently: a failed request or model yields an
 * error source instead of discarding the others. Nothing is persisted.
 */
export function useModelComparison({
  latitude,
  longitude,
}: UseModelComparisonOptions): UseModelComparisonResult {
  const [state, setState] = useState<ComparisonState>(IDLE_STATE);
  const [requestId, setRequestId] = useState(0);

  const refresh = useCallback(() => setRequestId((current) => current + 1), []);

  useEffect(() => {
    if (!hasCoordinates(latitude, longitude)) {
      setState(IDLE_STATE);
      return;
    }

    const controller = new AbortController();
    let active = true;

    setState({ ...IDLE_STATE, status: 'loading' });

    async function loadNws(): Promise<{
      source: ComparisonSource;
      timeZone?: string;
      stationId?: string;
    }> {
      const url = new URL('/api/nws/point', window.location.origin);
      url.searchParams.set('lat', String(latitude));
      url.searchParams.set('lon', String(longitude));
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) throw new Error(NWS_ERROR);
      const payload = (await response.json()) as NwsPointResponse;

      const hourly = payload.hourly ?? [];
      const periods = payload.forecast ?? [];
      const records = hourly.length > 0 ? hourly : periods;

      return {
        source: {
          id: 'NWS',
          label: 'NWS',
          color: chartColors.NWS,
          status: 'success',
          records,
          runTime: payload.forecastIssuedAt ?? null,
          retrievedAt: payload.retrievedAt ?? null,
          error: null,
          note:
            hourly.length === 0 && periods.length > 0
              ? 'Hourly data unavailable; showing forecast periods.'
              : undefined,
        },
        timeZone: payload.timeZone ?? undefined,
        stationId: payload.stationId ?? undefined,
      };
    }

    async function loadModels(): Promise<ComparisonSource[]> {
      const url = new URL('/api/open-meteo/forecast', window.location.origin);
      url.searchParams.set('lat', String(latitude));
      url.searchParams.set('lon', String(longitude));
      url.searchParams.set('models', 'gfs,hrrr,ecmwf');
      url.searchParams.set('timezone', 'UTC');
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) return errorModelSources(MODEL_ERROR);

      const payload = (await response.json()) as OpenMeteoResponse;
      return MODEL_ORDER.map((name) => {
        const config = OPEN_METEO_MODELS[name];
        const id = config.name as ComparisonSourceId;
        const model = payload.models?.[name];
        if (!model) return errorSource(id, payload.modelErrors?.[name] ?? MODEL_ERROR);
        return {
          id,
          label: config.name,
          color: chartColors[id],
          status: 'success',
          records: model.hourly ?? [],
          runTime: model.runTime ?? null,
          retrievedAt: model.retrievedAt ?? null,
          error: null,
        };
      });
    }

    async function load() {
      const [nwsResult, modelsResult] = await Promise.allSettled([loadNws(), loadModels()]);
      if (!active) return;

      const sources: ComparisonSource[] = [];
      let timeZone: string | undefined;
      let stationId: string | undefined;

      if (nwsResult.status === 'fulfilled') {
        sources.push(nwsResult.value.source);
        timeZone = nwsResult.value.timeZone;
        stationId = nwsResult.value.stationId;
      } else {
        sources.push(errorSource('NWS', NWS_ERROR));
      }

      if (modelsResult.status === 'fulfilled') {
        sources.push(...modelsResult.value);
      } else {
        sources.push(...errorModelSources(MODEL_ERROR));
      }

      setState({
        status: 'success',
        sources,
        timeZone,
        stationId,
        lastRetrievedAt: latestRetrievedAt(sources),
      });
    }

    void load();

    return () => {
      active = false;
      controller.abort();
    };
  }, [latitude, longitude, requestId]);

  return { ...state, refresh };
}
