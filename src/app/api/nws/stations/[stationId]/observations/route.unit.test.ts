import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/nws/client', () => ({
  fetchFromNws: vi.fn(),
}));

import { GET } from './route';
import { fetchFromNws } from '@/lib/nws/client';

beforeEach(() => {
  vi.mocked(fetchFromNws).mockReset();
});

const params = { params: { stationId: 'kden' } };

function observationFeature() {
  return {
    id: 'KDEN:2026-11-01T12:00:00Z',
    properties: {
      timestamp: '2026-11-01T12:00:00+00:00',
      textDescription: 'Clear',
      temperature: { value: 10, unitCode: 'wmoUnit:degC', qualityControl: 'V' },
      windSpeed: { value: 5, unitCode: 'wmoUnit:m_s-1', qualityControl: 'V' },
      precipitationLastHour: { value: 1.2, unitCode: 'wmoUnit:mm', qualityControl: 'V' },
      precipitationLast3Hours: { value: 3, unitCode: 'wmoUnit:mm', qualityControl: 'C' },
    },
  };
}

describe('NWS station observations route', () => {
  it('Use Case: defaults to the latest 20 observations with QC and precipitation', async () => {
    vi.mocked(fetchFromNws).mockResolvedValue({ features: [observationFeature()] } as never);

    const response = await GET(
      new Request('http://localhost/api/nws/stations/KDEN/observations'),
      params,
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(vi.mocked(fetchFromNws).mock.calls[0][0]).toBe('/stations/KDEN/observations?limit=20');
    expect(body.observations[0]).toMatchObject({
      stationId: 'KDEN',
      temperatureC: 10,
      windSpeedMps: 5,
      temperatureQualityControl: 'V',
      windSpeedQualityControl: 'V',
      precipitationLastHourMm: 1.2,
      precipitationLast3HoursMm: 3,
    });
  });

  it('Use Case: fetches a historical window with the range limit', async () => {
    vi.mocked(fetchFromNws).mockResolvedValue({ features: [] } as never);

    const response = await GET(
      new Request(
        'http://localhost/api/nws/stations/KDEN/observations?start=2026-11-01T00:00:00Z&end=2026-11-02T00:00:00Z',
      ),
      params,
    );

    expect(response.status).toBe(200);
    const endpoint = vi.mocked(fetchFromNws).mock.calls[0][0];
    expect(endpoint).toContain('start=2026-11-01T00%3A00%3A00Z');
    expect(endpoint).toContain('end=2026-11-02T00%3A00%3A00Z');
    expect(endpoint).toContain('limit=500');
  });

  it('Use Case: rejects a range where end is not after start', async () => {
    const response = await GET(
      new Request(
        'http://localhost/api/nws/stations/KDEN/observations?start=2026-11-02T00:00:00Z&end=2026-11-01T00:00:00Z',
      ),
      params,
    );

    expect(response.status).toBe(400);
    expect(fetchFromNws).not.toHaveBeenCalled();
  });

  it('Use Case: rejects a range longer than 31 days and a missing paired bound', async () => {
    const tooLong = await GET(
      new Request(
        'http://localhost/api/nws/stations/KDEN/observations?start=2026-01-01T00:00:00Z&end=2026-03-01T00:00:00Z',
      ),
      params,
    );
    const missingEnd = await GET(
      new Request('http://localhost/api/nws/stations/KDEN/observations?start=2026-01-01T00:00:00Z'),
      params,
    );

    expect(tooLong.status).toBe(400);
    expect(missingEnd.status).toBe(400);
    expect(fetchFromNws).not.toHaveBeenCalled();
  });

  it('Use Case: rejects an invalid limit', async () => {
    const response = await GET(
      new Request('http://localhost/api/nws/stations/KDEN/observations?limit=9999'),
      params,
    );

    expect(response.status).toBe(400);
    expect(fetchFromNws).not.toHaveBeenCalled();
  });
});
