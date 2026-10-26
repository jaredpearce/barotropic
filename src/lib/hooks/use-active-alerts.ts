'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  buildAlertCards,
  getHighestAlertSeverity,
  type ActiveAlertsResponse,
  type AlertCardData,
  type AlertSeverity,
} from '@/lib/alerts';

export type ActiveAlertsStatus = 'idle' | 'loading' | 'success' | 'error';

export interface UseActiveAlertsOptions {
  latitude: number;
  longitude: number;
}

export interface UseActiveAlertsResult {
  alerts: AlertCardData[];
  highestSeverity: AlertSeverity;
  status: ActiveAlertsStatus;
  error: string | null;
  refresh: () => void;
}

/**
 * Fetch and map the active alerts for a coordinate.
 *
 * Requests are aborted when the location changes, and stale responses are
 * ignored so a slow previous request cannot replace newer alerts.
 */
export function useActiveAlerts({
  latitude,
  longitude,
}: UseActiveAlertsOptions): UseActiveAlertsResult {
  const [alerts, setAlerts] = useState<AlertCardData[]>([]);
  const [status, setStatus] = useState<ActiveAlertsStatus>('idle');
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
    setAlerts([]);

    async function loadAlerts() {
      try {
        const url = new URL('/api/nws/alerts/point', window.location.origin);
        url.searchParams.set('lat', String(latitude));
        url.searchParams.set('lon', String(longitude));

        const response = await fetch(url, {
          cache: 'no-store',
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error('Unable to load alerts for this location.');
        }

        const payload = (await response.json()) as ActiveAlertsResponse;
        if (cancelled) return;

        const nextAlerts = buildAlertCards(
          Array.isArray(payload.alerts) ? payload.alerts : [],
          {
            point: { latitude, longitude },
            now: new Date(),
          }
        );

        setAlerts(nextAlerts);
        setStatus('success');
      } catch (caught) {
        if (
          cancelled ||
          (caught instanceof Error && caught.name === 'AbortError')
        ) {
          return;
        }

        setError(
          caught instanceof Error
            ? caught.message
            : 'Unable to load alerts for this location.'
        );
        setStatus('error');
      }
    }

    void loadAlerts();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [latitude, longitude, requestId]);

  return {
    alerts,
    highestSeverity: getHighestAlertSeverity(alerts),
    status,
    error,
    refresh,
  };
}
