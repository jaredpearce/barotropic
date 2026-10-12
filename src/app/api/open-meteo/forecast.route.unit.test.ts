import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/open-meteo/client', () => ({
  fetchFromOpenMeteo: vi.fn(),
}));

import { GET } from './forecast/route';
import { fetchFromOpenMeteo } from '@/lib/open-meteo/client';

afterEach(() => {
  vi.mocked(fetchFromOpenMeteo).mockReset();
});

describe('Open-Meteo forecast route', () => {
  it('Use Case: returns Cary forecast records with provider model names and metadata', async () => {
    vi.mocked(fetchFromOpenMeteo).mockResolvedValue({
      hourly: {
        time: ['2026-10-12T12:00'],
        temperature_2m: [22],
        relative_humidity_2m: [55],
        precipitation_probability: [20],
        weather_code: [2],
        wind_speed_10m: [4],
      },
      daily: {
        time: ['2026-10-12'],
        weather_code: [2],
        temperature_2m_max: [25],
        temperature_2m_min: [14],
      },
    } as never);

    const response = await GET(
      new Request('http://localhost/api/open-meteo/forecast?models=gfs,hrrr')
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.location).toMatchObject({ city: 'Cary', state: 'NC' });
    expect(body.models.gfs.modelId).toBe('ncep_gfs_seamless');
    expect(body.models.hrrr.modelId).toBe('ncep_hrrr_conus');
    expect(body.models.gfs.hourly[0]).toMatchObject({
      source: 'Open-Meteo',
      timestamp: '2026-10-12T12:00',
      temperatureC: 22,
      humidityPercent: 55,
      windSpeedMps: 4,
      runTime: null,
    });
    expect(body.models.gfs.daily[0]).toMatchObject({
      timestamp: '2026-10-12',
      minimumTemperatureC: 14,
      maximumTemperatureC: 25,
      retrievedAt: expect.any(String),
      runTime: null,
    });
    expect(body.radar.tileUrlTemplate).toContain('layers=conus_bref_qcd');
    expect(body.radar.attribution).toContain('NOAA/NCEP');
  });
});