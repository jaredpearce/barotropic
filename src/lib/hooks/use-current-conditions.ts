'use client';

import { useCallback, useEffect, useState } from 'react';
import { toCurrentConditions } from '@/lib/nws/observation-to-conditions';
import type { NormalizedObservation } from '@/lib/schemas/normalized';
import type { CurrentConditions } from '@/types/domain';

export type CurrentConditionsStatus = 'idle' | 'loading' | 'success' | 'error';

export interface UseCurrentConditionsOptions {
  latitude: number;
  longitude: number;
}

export interface UseCurrentConditionsResult {
  conditions: CurrentConditions | null;
  status: CurrentConditionsStatus;
  error: string | null;
  refresh: () => void;
}

interface PointConditionsResponse {
  currentConditions?: NormalizedObservation | null;
}

const LOAD_ERROR = 'Unable to load current conditions for this location.';

/**
 * Fetch the current conditions for a coordinate from the NWS point endpoint.
 *
 * Requests are aborted when the location changes, and stale responses are
 * ignored so a slow previous request cannot replace newer conditions.
 */
export function useCurrentConditions({
  latitude,
  longitude,
}: UseCurrentConditionsOptions): UseCurrentConditionsResult {
  const [conditions, setConditions] = useState<CurrentConditions | null>(null);
  const [status, setStatus] = useState<CurrentConditionsStatus>('idle');
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
    setConditions(null);

    async function loadConditions() {
      try {
        const url = new URL('/api/nws/point', window.location.origin);
        url.searchParams.set('lat', String(latitude));
        url.searchParams.set('lon', String(longitude));

        const response = await fetch(url, {
          cache: 'no-store',
          signal: controller.signal,
        });

        if (!response.ok) throw new Error(LOAD_ERROR);

        const payload = (await response.json()) as PointConditionsResponse;
        if (cancelled) return;

        setConditions(toCurrentConditions(payload.currentConditions));
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

    void loadConditions();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [latitude, longitude, requestId]);

  return { conditions, status, error, refresh };
}
