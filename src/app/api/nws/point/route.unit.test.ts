import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/nws/client', () => ({
  fetchFromNws: vi.fn(),
}));

import { GET } from './route';
import { fetchFromNws } from '@/lib/nws/client';

beforeEach(() => {
  vi.mocked(fetchFromNws).mockReset();
});

describe('NWS point route station coordinates', () => {
  it('Use Case: returns nearby station coordinates for the map overlay', async () => {
    vi.mocked(fetchFromNws).mockImplementation(async (endpoint) => {
      if (endpoint.startsWith('/points/')) {
        return {
          properties: {
            forecast: 'https://api.weather.gov/gridpoints/RAH/1,1/forecast',
            observationStations: 'https://api.weather.gov/gridpoints/RAH/1,1/stations',
          },
        } as never;
      }
      if (endpoint.endsWith('/forecast')) {
        return { properties: { periods: [] } } as never;
      }
      if (endpoint.endsWith('/stations')) {
        return {
          features: [
            {
              id: 'https://api.weather.gov/stations/KRDU',
              geometry: { type: 'Point', coordinates: [-78.79, 35.89] },
              properties: { name: 'Raleigh-Durham International Airport' },
            },
            {
              id: 'https://api.weather.gov/stations/KJNX',
              geometry: { type: 'Point', coordinates: [-78.39, 35.54] },
              properties: { name: 'Johnston Regional Airport' },
            },
            {
              id: 'https://api.weather.gov/stations/KNONE',
              properties: { name: 'No geometry' },
            },
          ],
        } as never;
      }
      if (endpoint.includes('/observations/latest')) {
        return { properties: {} } as never;
      }
      throw new Error(`Unexpected NWS endpoint: ${endpoint}`);
    });

    const response = await GET(new Request('http://localhost/api/nws/point?lat=35.79&lon=-78.78'));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      stations: [
        {
          id: 'KRDU',
          name: 'Raleigh-Durham International Airport',
          latitude: 35.89,
          longitude: -78.79,
        },
        {
          id: 'KJNX',
          name: 'Johnston Regional Airport',
          latitude: 35.54,
          longitude: -78.39,
        },
      ],
    });
    expect(fetchFromNws).toHaveBeenCalledWith(
      '/stations/KRDU/observations/latest',
      expect.anything(),
    );
  });

  it('Use Case: returns hourly periods, time zone, and issued metadata', async () => {
    vi.mocked(fetchFromNws).mockImplementation(async (endpoint) => {
      if (endpoint.startsWith('/points/')) {
        return {
          properties: {
            forecast: 'https://api.weather.gov/gridpoints/RAH/1,1/forecast',
            forecastHourly: 'https://api.weather.gov/gridpoints/RAH/1,1/forecast/hourly',
            observationStations: 'https://api.weather.gov/gridpoints/RAH/1,1/stations',
            timeZone: 'America/New_York',
          },
        } as never;
      }
      if (endpoint.endsWith('/forecast/hourly')) {
        return {
          properties: {
            updateTime: '2026-11-01T10:00:00+00:00',
            periods: [
              {
                number: 1,
                name: 'This Afternoon',
                startTime: '2026-11-01T12:00:00-04:00',
                temperature: 68,
                temperatureUnit: 'F',
                windSpeed: '10 mph',
                windDirection: 'SW',
                shortForecast: 'Sunny',
                detailedForecast: 'Sunny.',
                probabilityOfPrecipitation: { value: 10 },
                isDaytime: true,
              },
            ],
          },
        } as never;
      }
      if (endpoint.endsWith('/forecast')) {
        return { properties: { updateTime: '2026-11-01T09:00:00+00:00', periods: [] } } as never;
      }
      if (endpoint.endsWith('/stations')) {
        return { features: [{ id: 'https://api.weather.gov/stations/KRDU' }] } as never;
      }
      if (endpoint.includes('/observations/latest')) {
        return { properties: {} } as never;
      }
      throw new Error(`Unexpected NWS endpoint: ${endpoint}`);
    });

    const response = await GET(new Request('http://localhost/api/nws/point?lat=35.79&lon=-78.78'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.timeZone).toBe('America/New_York');
    expect(body.stationId).toBe('KRDU');
    expect(body.forecastIssuedAt).toBe('2026-11-01T09:00:00+00:00');
    expect(body.retrievedAt).toEqual(expect.any(String));
    expect(body.hourly).toHaveLength(1);
    expect(body.hourly[0]).toMatchObject({
      source: 'NWS',
      condition: 'Sunny',
      precipitationProbabilityPercent: 10,
      isDaytime: true,
    });
    expect(body.hourly[0].temperatureC).toBeCloseTo(20, 5);
  });

  it('Use Case: keeps the daily forecast when the hourly request fails', async () => {
    vi.mocked(fetchFromNws).mockImplementation(async (endpoint) => {
      if (endpoint.startsWith('/points/')) {
        return {
          properties: {
            forecast: 'https://api.weather.gov/gridpoints/RAH/1,1/forecast',
            forecastHourly: 'https://api.weather.gov/gridpoints/RAH/1,1/forecast/hourly',
            timeZone: 'America/New_York',
          },
        } as never;
      }
      if (endpoint.endsWith('/forecast/hourly')) {
        throw new Error('hourly upstream failed');
      }
      if (endpoint.endsWith('/forecast')) {
        return {
          properties: {
            updateTime: '2026-11-01T09:00:00+00:00',
            periods: [
              {
                number: 1,
                name: 'Today',
                startTime: '2026-11-01T12:00:00-04:00',
                temperature: 20,
                temperatureUnit: 'C',
                windSpeed: '5 m/s',
                windDirection: 'SW',
                shortForecast: 'Sunny',
                detailedForecast: 'Sunny.',
                isDaytime: true,
              },
            ],
          },
        } as never;
      }
      throw new Error(`Unexpected NWS endpoint: ${endpoint}`);
    });

    const response = await GET(new Request('http://localhost/api/nws/point?lat=35.79&lon=-78.78'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.forecast).toHaveLength(1);
    expect(body.hourly).toEqual([]);
    expect(body.hourlyError).toBe('hourly upstream failed');
  });
});
