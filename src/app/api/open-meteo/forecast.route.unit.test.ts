import { afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/open-meteo/client', () => ({
  fetchFromOpenMeteo: vi.fn(),
}));

import { GET } from './forecast/route';
import { fetchFromOpenMeteo } from '@/lib/open-meteo/client';

afterEach(() => {
  vi.mocked(fetchFromOpenMeteo).mockReset();
});

describe('Open-Meteo forecast route', () => {
  it('Use Case: requests forecast data for the supplied coordinates', async () => {
    vi.mocked(fetchFromOpenMeteo).mockResolvedValue({
      hourly: {
        time: ['2026-10-12T12:00'],
        temperature_2m: [22],
        relative_humidity_2m: [55],
        precipitation_probability: [20],
        weather_code: [2],
        wind_speed_10m: [4],
        is_day: [1],
      },
    } as never);

    const response = await GET(
      new NextRequest(
        'http://localhost/api/open-meteo/forecast?lat=47.6062&lon=-122.3321&models=gfs',
      ),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.location).toEqual({
      latitude: 47.6062,
      longitude: -122.3321,
    });
    expect(body.models.gfs.hourly[0].isDaytime).toBe(true);
    const endpoint = vi.mocked(fetchFromOpenMeteo).mock.calls[0][0];
    expect(endpoint).toContain('latitude=47.6062');
    expect(endpoint).toContain('longitude=-122.3321');
    expect(endpoint).toContain('is_day');
  });

  it('Use Case: rejects incomplete or invalid coordinate pairs', async () => {
    const incompleteResponse = await GET(
      new NextRequest('http://localhost/api/open-meteo/forecast?lat=47.6062'),
    );
    const invalidResponse = await GET(
      new NextRequest('http://localhost/api/open-meteo/forecast?lat=91&lon=-122.3321'),
    );
    const blankResponse = await GET(
      new NextRequest('http://localhost/api/open-meteo/forecast?lat=&lon=-122.3321'),
    );

    expect(incompleteResponse.status).toBe(400);
    expect(invalidResponse.status).toBe(400);
    expect(blankResponse.status).toBe(400);
    expect(fetchFromOpenMeteo).not.toHaveBeenCalled();
  });

  it('Use Case: returns Cary forecast records with provider model names and metadata', async () => {
    vi.mocked(fetchFromOpenMeteo).mockResolvedValue({
      hourly: {
        time: ['2026-10-12T12:00'],
        temperature_2m: [22],
        relative_humidity_2m: [55],
        precipitation_probability: [20],
        weather_code: [2],
        wind_speed_10m: [4],
        is_day: [0],
      },
      daily: {
        time: ['2026-10-12'],
        weather_code: [2],
        temperature_2m_max: [25],
        temperature_2m_min: [14],
      },
      utc_offset_seconds: -18000,
      timezone: 'America/New_York',
      timezone_abbreviation: 'EST',
    } as never);

    const response = await GET(
      new Request('http://localhost/api/open-meteo/forecast?models=gfs,hrrr'),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.location).toMatchObject({ city: 'Cary', state: 'NC' });
    expect(body.models.gfs.modelId).toBe('ncep_gfs_seamless');
    expect(body.models.hrrr.modelId).toBe('ncep_hrrr_conus');
    expect(body.models.gfs.utcOffsetSeconds).toBe(-18000);
    expect(body.models.gfs.timezone).toBe('America/New_York');
    expect(body.models.gfs.hourly[0]).toMatchObject({
      source: 'Open-Meteo',
      timestamp: '2026-10-12T12:00',
      temperatureC: 22,
      humidityPercent: 55,
      windSpeedMps: 4,
      isDaytime: false,
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

  it('Use Case: returns ECMWF and requests UTC timestamps for model comparison', async () => {
    vi.mocked(fetchFromOpenMeteo).mockResolvedValue({
      hourly: {
        time: ['2026-10-12T12:00'],
        temperature_2m: [22],
        relative_humidity_2m: [55],
        precipitation_probability: [20],
        weather_code: [2],
        wind_speed_10m: [4],
        is_day: [1],
      },
    } as never);

    const response = await GET(
      new Request(
        'http://localhost/api/open-meteo/forecast?lat=35.79&lon=-78.78&models=gfs,hrrr,ecmwf&timezone=UTC',
      ),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.requestedModels).toEqual(['gfs', 'hrrr', 'ecmwf']);
    expect(body.models.ecmwf.modelId).toBe('ecmwf_ifs025');
    expect(body.models.ecmwf.retrievedAt).toEqual(expect.any(String));
    expect(body.models.ecmwf.runTime).toBeNull();
    const endpoint = vi.mocked(fetchFromOpenMeteo).mock.calls[0][0];
    expect(endpoint).toContain('timezone=UTC');
  });
});
