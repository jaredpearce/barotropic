'use client';

import { useEffect, useState } from 'react';
import type { ForecastSourceValues } from '@/lib/forecast-workspace/db';
import { sourceValuesFromModel, sourceValuesFromNws } from '@/lib/forecast-workspace/guidance';
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
  officialStatus: ForecastGuidanceStatus;
  modelStatus: ForecastGuidanceStatus;
  officialError: string | null;
  modelError: string | null;
}

const EMPTY_STATE: UseForecastGuidanceResult = {
  officialValues: {},
  modelValues: {},
  officialStatus: 'idle',
  modelStatus: 'idle',
  officialError: null,
  modelError: null,
};

const NWS_ERROR = 'Official guidance is unavailable for this location.';
const MODEL_ERROR = 'Model guidance is unavailable for this location.';

interface NwsResponse {
  forecast?: NormalizedWeatherRecord[];
}

interface OpenMeteoResponse {
  models?: {
    gfs?: {
      daily?: NormalizedWeatherRecord[];
      hourly?: NormalizedWeatherRecord[];
    };
  };
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

    async function loadOfficial(): Promise<ForecastSourceValues> {
      const url = new URL('/api/nws/point', window.location.origin);
      url.searchParams.set('lat', String(latitude));
      url.searchParams.set('lon', String(longitude));
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) throw new Error(NWS_ERROR);
      const payload = (await response.json()) as NwsResponse;
      return sourceValuesFromNws(payload.forecast ?? [], validStart);
    }

    async function loadModel(): Promise<ForecastSourceValues> {
      const url = new URL('/api/open-meteo/forecast', window.location.origin);
      url.searchParams.set('lat', String(latitude));
      url.searchParams.set('lon', String(longitude));
      url.searchParams.set('models', 'gfs');
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) throw new Error(MODEL_ERROR);
      const payload = (await response.json()) as OpenMeteoResponse;
      return sourceValuesFromModel(
        payload.models?.gfs?.daily ?? [],
        payload.models?.gfs?.hourly ?? [],
        validStart,
      );
    }

    async function loadGuidance() {
      const [official, model] = await Promise.allSettled([loadOfficial(), loadModel()]);
      if (!active) return;

      setState({
        officialValues: official.status === 'fulfilled' ? official.value : {},
        modelValues: model.status === 'fulfilled' ? model.value : {},
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
