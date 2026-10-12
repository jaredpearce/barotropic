import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UpstreamApiError } from '@/lib/api-errors';

vi.mock('@/lib/nws/client', () => ({
  fetchFromNws: vi.fn(),
}));

import { GET as getPoint } from './point/route';
import { GET as getZoneAlerts } from './alerts/zone/route';
import { GET as getStationObservations } from './stations/[stationId]/observations/route';
import { fetchFromNws } from '@/lib/nws/client';

beforeEach(() => {
  vi.mocked(fetchFromNws).mockReset();
});

describe('NWS route upstream errors', () => {
  it('Use Case: returns a typed error when the point route station lookup fails', async () => {
    vi.mocked(fetchFromNws).mockImplementation(async (endpoint) => {
      if (endpoint.startsWith('/points/')) {
        return {
          properties: {
            forecast: 'https://api.weather.gov/gridpoints/RAH/1,1/forecast',
            observationStations: 'https://api.weather.gov/gridpoints/RAH/1,1/stations',
          },
        } as never;
      }
      if (endpoint.includes('/forecast')) {
        return { properties: { periods: [] } } as never;
      }
      throw new UpstreamApiError(
        'UPSTREAM_TIMEOUT',
        'National Weather Service request timed out',
        'NWS',
        504,
        true
      );
    });

    const response = await getPoint(
      new Request('http://localhost/api/nws/point?lat=35.79&lon=-78.78')
    );

    expect(response.status).toBe(504);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: 'UPSTREAM_TIMEOUT', upstream: 'NWS', retryable: true },
    });
  });

  it('Use Case: returns a typed error from the alert route', async () => {
    vi.mocked(fetchFromNws).mockRejectedValue(
      new UpstreamApiError('UPSTREAM_UNAVAILABLE', 'NWS unavailable', 'NWS', 502, true)
    );

    const response = await getZoneAlerts(
      new Request('http://localhost/api/nws/alerts/zone?zone=NCZ001')
    );

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: 'UPSTREAM_UNAVAILABLE', upstream: 'NWS' },
    });
  });

  it('Use Case: returns a typed error from the station observations route', async () => {
    vi.mocked(fetchFromNws).mockRejectedValue(
      new UpstreamApiError('UPSTREAM_HTTP_ERROR', 'NWS failed', 'NWS', 502, true, 503)
    );

    const response = await getStationObservations(
      new Request('http://localhost/api/nws/stations/KRDU/observations'),
      { params: { stationId: 'KRDU' } }
    );

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: 'UPSTREAM_HTTP_ERROR', upstream: 'NWS', upstreamStatus: 503 },
    });
  });
});