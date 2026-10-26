import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UpstreamApiError } from '@/lib/api-errors';

vi.mock('@/lib/nws/client', () => ({
  fetchFromNws: vi.fn(),
}));

import { GET } from './route';
import { fetchFromNws } from '@/lib/nws/client';

const POLYGON = {
  type: 'Polygon',
  coordinates: [
    [
      [-79, 35],
      [-78, 35],
      [-78, 36],
      [-79, 36],
      [-79, 35],
    ],
  ],
};

beforeEach(() => {
  vi.mocked(fetchFromNws).mockReset();
});

describe('NWS point alerts route', () => {
  it('Use Case: rejects requests missing coordinates before calling NWS', async () => {
    const response = await GET(
      new Request('http://localhost/api/nws/alerts/point?lat=35.79')
    );

    expect(response.status).toBe(400);
    expect(fetchFromNws).not.toHaveBeenCalled();
  });

  it('Use Case: rejects out-of-range coordinates before calling NWS', async () => {
    const response = await GET(
      new Request('http://localhost/api/nws/alerts/point?lat=95&lon=-78.78')
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: 'Invalid coordinates',
    });
    expect(fetchFromNws).not.toHaveBeenCalled();
  });

  it('Use Case: returns normalized polygon and area-based alerts', async () => {
    vi.mocked(fetchFromNws).mockResolvedValue({
      features: [
        {
          id: 'polygon-alert',
          properties: {
            event: 'Heat Advisory',
            headline: 'Heat advisory in effect',
            severity: 'Moderate',
            certainty: 'Likely',
            urgency: 'Expected',
            status: 'Actual',
            messageType: 'Alert',
            category: 'Met',
            areaDesc: 'Wake / Chatham / Durham counties',
            sent: '2026-10-26T11:00:00-04:00',
            effective: '2026-10-26T12:00:00-04:00',
            expires: '2026-10-26T23:00:00-04:00',
            description: 'Hot and humid conditions.',
            instruction: 'Drink water.',
            senderName: 'NWS Raleigh',
          },
          geometry: POLYGON,
        },
        {
          id: 'area-alert',
          properties: {
            event: 'Flood Watch',
            severity: 'Minor',
            urgency: 'Expected',
            status: 'Actual',
            areaDesc: 'Central North Carolina',
            sent: '2026-10-26T11:30:00-04:00',
            onset: null,
            ends: null,
            instruction: null,
            description: 'Rain may cause flooding.',
          },
          geometry: null,
        },
      ],
    } as never);

    const response = await GET(
      new Request(
        'http://localhost/api/nws/alerts/point?lat=35.7915&lon=-78.7811'
      )
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    await expect(response.json()).resolves.toMatchObject({
      point: { latitude: 35.7915, longitude: -78.7811 },
      alerts: [
        {
          source: 'NWS',
          id: 'polygon-alert',
          event: 'Heat Advisory',
          severity: 'Moderate',
          certainty: 'Likely',
          senderName: 'NWS Raleigh',
          geometry: { type: 'Polygon' },
        },
        {
          id: 'area-alert',
          event: 'Flood Watch',
          severity: 'Minor',
          geometry: null,
        },
      ],
    });
    expect(fetchFromNws).toHaveBeenCalledWith(
      '/alerts/active?point=35.7915,-78.7811',
      expect.anything(),
      { revalidate: 30 }
    );
  });

  it('Use Case: preserves upstream alert errors', async () => {
    vi.mocked(fetchFromNws).mockRejectedValue(
      new UpstreamApiError(
        'UPSTREAM_TIMEOUT',
        'National Weather Service request timed out',
        'NWS',
        504,
        true
      )
    );

    const response = await GET(
      new Request(
        'http://localhost/api/nws/alerts/point?lat=35.7915&lon=-78.7811'
      )
    );

    expect(response.status).toBe(504);
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: 'UPSTREAM_TIMEOUT',
        upstream: 'NWS',
        retryable: true,
      },
    });
  });
});
