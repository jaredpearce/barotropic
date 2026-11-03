'use client';

import { useCallback, useEffect, useState } from 'react';
import type { NormalizedWeatherRecord } from '@/lib/schemas/normalized';

export type HourlyForecastStatus = 'idle' | 'loading' | 'success' | 'error';

export interface UseHourlyForecastOptions {
  latitude: number;
  longitude: number;
}

export interface UseHourlyForecastResult {
  hours: NormalizedWeatherRecord[];
  status: HourlyForecastStatus;
  error: string | null;
  refresh: () => void;
}

interface HourlyForecastResponse {
  models?: {
    gfs?: {
      hourly?: NormalizedWeatherRecord[];
    };
  };
}

const LOAD_ERROR = 'Unable to load the hourly forecast for this location.';

export function useHourlyForecast({
  latitude,
  longitude,
}: UseHourlyForecastOptions): UseHourlyForecastResult {
  const [hours, setHours] = useState<NormalizedWeatherRecord[]>([]);
  const [status, setStatus] = useState<HourlyForecastStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [requestId, setRequestId] = useState(0);

  const refresh = useCallback(() => {
    setRequestId((current) => current + 1);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;

    setStatus('loading');
    setError(null);
    setHours([]);

    async function loadForecast() {
      try {
        const url = new URL('/api/open-meteo/forecast', window.location.origin);
        url.searchParams.set('lat', String(latitude));
        url.searchParams.set('lon', String(longitude));
        url.searchParams.set('models', 'gfs');

        const response = await fetch(url, {
          cache: 'no-store',
          signal: controller.signal,
        });

        if (!response.ok) throw new Error(LOAD_ERROR);

        const payload = (await response.json()) as HourlyForecastResponse;
        if (cancelled) return;

        setHours(
          Array.isArray(payload.models?.gfs?.hourly)
            ? payload.models.gfs.hourly
            : []
        );
        setStatus('success');
      } catch (caught) {
        if (
          cancelled ||
          (caught instanceof Error && caught.name === 'AbortError')
        ) {
          return;
        }

        setError(caught instanceof Error ? caught.message : LOAD_ERROR);
        setStatus('error');
      }
    }

    void loadForecast();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [latitude, longitude, requestId]);

  return { hours, status, error, refresh };
}
