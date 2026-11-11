'use client';

import { useEffect, useState } from 'react';
import type {
  ForecastSourceValues,
  ForecastTarget,
  GuidanceSnapshot,
  GuidanceSourceId,
} from '@/lib/forecast-workspace/db';
import {
  formatGuidanceValues,
  guidanceValuesOf,
  selectModelGuidance,
  selectNwsGuidance,
} from '@/lib/forecast-workspace/guidance';
import { OPEN_METEO_MODELS, type OpenMeteoModelName } from '@/lib/open-meteo/utils';
import type { NormalizedWeatherRecord } from '@/lib/schemas/normalized';

export type ForecastGuidanceStatus = 'idle' | 'loading' | 'success' | 'error';

export interface UseForecastGuidanceOptions {
  latitude?: number;
  longitude?: number;
  validStart: string;
}

export interface UseForecastGuidanceResult {
  officialValues: ForecastSourceValues;
  modelValues: ForecastSourceValues;
  guidance: GuidanceSnapshot[];
  target?: ForecastTarget;
  officialStatus: ForecastGuidanceStatus;
  modelStatus: ForecastGuidanceStatus;
  officialError: string | null;
  modelError: string | null;
}

const EMPTY_STATE: UseForecastGuidanceResult = {
  officialValues: {},
  modelValues: {},
  guidance: [],
  target: undefined,
  officialStatus: 'idle',
  modelStatus: 'idle',
  officialError: null,
  modelError: null,
};

const NWS_ERROR = 'Official guidance is unavailable for this location.';
const MODEL_ERROR = 'Model guidance is unavailable for this location.';

interface NwsResponse {
  forecast?: NormalizedWeatherRecord[];
  hourly?: NormalizedWeatherRecord[];
  timeZone?: string | null;
  stationId?: string | null;
  forecastIssuedAt?: string | null;
  retrievedAt?: string;
}

interface OpenMeteoModelResponse {
  daily?: NormalizedWeatherRecord[];
  hourly?: NormalizedWeatherRecord[];
  retrievedAt?: string;
  runTime?: string | null;
  utcOffsetSeconds?: number;
  modelId?: string;
}

interface OpenMeteoResponse {
  models?: Record<string, OpenMeteoModelResponse>;
}

interface OfficialResult {
  values: ForecastSourceValues;
  snapshot: GuidanceSnapshot;
  target: ForecastTarget;
}

interface ModelResult {
  values: ForecastSourceValues;
  snapshots: GuidanceSnapshot[];
}

function hasCoordinates(latitude?: number, longitude?: number): boolean {
  return (
    typeof latitude === 'number' &&
    Number.isFinite(latitude) &&
    typeof longitude === 'number' &&
    Number.isFinite(longitude)
  );
}

export function useForecastGuidance({
  latitude,
  longitude,
  validStart,
}: UseForecastGuidanceOptions): UseForecastGuidanceResult {
  const [state, setState] = useState<UseForecastGuidanceResult>(EMPTY_STATE);

  useEffect(() => {
    if (!hasCoordinates(latitude, longitude)) {
      setState(EMPTY_STATE);
      return;
    }

    const controller = new AbortController();
    let active = true;

    setState({
      ...EMPTY_STATE,
      officialStatus: 'loading',
      modelStatus: 'loading',
    });

    async function loadOfficial(): Promise<OfficialResult> {
      const url = new URL('/api/nws/point', window.location.origin);
      url.searchParams.set('lat', String(latitude));
      url.searchParams.set('lon', String(longitude));
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) throw new Error(NWS_ERROR);
      const payload = (await response.json()) as NwsResponse;
      const selected = selectNwsGuidance(payload.forecast ?? [], validStart);
      const snapshot: GuidanceSnapshot = {
        source: 'NWS',
        runTime: payload.forecastIssuedAt ?? selected.runTime,
        retrievedAt: payload.retrievedAt ?? selected.retrievedAt,
        values: guidanceValuesOf(selected),
      };
      return {
        values: formatGuidanceValues(snapshot.values),
        snapshot,
        target: {
          latitude,
          longitude,
          stationId: payload.stationId ?? undefined,
          timeZone: payload.timeZone ?? undefined,
        },
      };
    }

    async function loadModels(): Promise<ModelResult> {
      const url = new URL('/api/open-meteo/forecast', window.location.origin);
      url.searchParams.set('lat', String(latitude));
      url.searchParams.set('lon', String(longitude));
      url.searchParams.set('models', 'gfs,hrrr,ecmwf');
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) throw new Error(MODEL_ERROR);
      const payload = (await response.json()) as OpenMeteoResponse;

      const snapshots: GuidanceSnapshot[] = [];
      let gfsValues: ForecastSourceValues = {};

      for (const [modelName, model] of Object.entries(payload.models ?? {})) {
        const config = OPEN_METEO_MODELS[modelName as OpenMeteoModelName];
        if (!config) continue;
        const selected = selectModelGuidance(model.daily ?? [], model.hourly ?? [], validStart);
        const snapshot: GuidanceSnapshot = {
          source: config.name as GuidanceSourceId,
          modelId: model.modelId ?? config.id,
          runTime: model.runTime ?? null,
          retrievedAt: model.retrievedAt ?? selected.retrievedAt,
          utcOffsetSeconds: model.utcOffsetSeconds,
          values: guidanceValuesOf(selected),
        };
        snapshots.push(snapshot);
        if (config.name === 'GFS') gfsValues = formatGuidanceValues(snapshot.values);
      }

      return { values: gfsValues, snapshots };
    }

    async function loadGuidance() {
      const [official, model] = await Promise.allSettled([loadOfficial(), loadModels()]);
      if (!active) return;

      const guidance: GuidanceSnapshot[] = [];
      if (official.status === 'fulfilled') guidance.push(official.value.snapshot);
      if (model.status === 'fulfilled') guidance.push(...model.value.snapshots);

      setState({
        officialValues: official.status === 'fulfilled' ? official.value.values : {},
        modelValues: model.status === 'fulfilled' ? model.value.values : {},
        guidance,
        target: official.status === 'fulfilled' ? official.value.target : undefined,
        officialStatus: official.status === 'fulfilled' ? 'success' : 'error',
        modelStatus: model.status === 'fulfilled' ? 'success' : 'error',
        officialError: official.status === 'rejected' ? NWS_ERROR : null,
        modelError: model.status === 'rejected' ? MODEL_ERROR : null,
      });
    }

    void loadGuidance();

    return () => {
      active = false;
      controller.abort();
    };
  }, [latitude, longitude, validStart]);

  return state;
}
